import { ChatGroq } from '@langchain/groq';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { StateGraph, END, Annotation } from '@langchain/langgraph';

export type AgentEvent =
  | { type: 'generate-start'; iter: number }
  | { type: 'generate-token'; iter: number; token: string }
  | { type: 'generate-done'; iter: number; post: string }
  | { type: 'reflect-start'; iter: number }
  | { type: 'reflect-bullet'; iter: number; bullet: string }
  | { type: 'reflect-done'; iter: number }
  | { type: 'router-start'; iter: number }
  | { type: 'router-done'; iter: number; decision: 'DONE' | 'REFINE' }
  | { type: 'final'; post: string }
  | { type: 'error'; message: string };

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  topic: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  tone: Annotation<string>({ reducer: (_, b) => b, default: () => 'Punchy' }),
  maxIter: Annotation<number>({ reducer: (_, b) => b, default: () => 3 }),
  curIter: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  lastPost: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  routerDecision: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
  emit: Annotation<((e: AgentEvent) => void) | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
});

export type State = typeof StateAnnotation.State;

function buildLLM() {
  return new ChatGroq({
    model: 'llama-3.3-70b-versatile',
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.7,
  });
}

export async function generateNode(state: State): Promise<Partial<State>> {
  const { topic, tone, messages, curIter, emit } = state;
  const iter = curIter + 1;
  emit?.({ type: 'generate-start', iter });

  const critique =
    messages.length > 0
      ? (messages
          .filter((m) => m instanceof HumanMessage && m.content !== topic)
          .map((m) => m.content as string)
          .at(-1) ?? null)
      : null;

  let prompt = `You are an expert at writing viral, high-signal posts for X (Twitter).
Write ONE post about: "${topic}".
Tone: ${tone}. Hard limit: 280 characters. No surrounding quotes. At most one hashtag, only if natural.`;
  if (critique) {
    prompt += `\n\nYour previous draft was critiqued:\n${critique}\n\nRewrite it incorporating this feedback. Return ONLY the improved post text.`;
  } else {
    prompt += `\nReturn ONLY the post text.`;
  }

  const llm = buildLLM();
  let post = '';
  const stream = await llm.stream([new HumanMessage(prompt)]);
  for await (const chunk of stream) {
    const token = (chunk.content as string) ?? '';
    post += token;
    emit?.({ type: 'generate-token', iter, token });
  }

  post = post.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 280);
  emit?.({ type: 'generate-done', iter, post });

  return {
    messages: [new AIMessage(post)],
    lastPost: post,
    curIter: iter,
  };
}

export async function reflectNode(state: State): Promise<Partial<State>> {
  const { lastPost, curIter, emit } = state;
  emit?.({ type: 'reflect-start', iter: curIter });

  const prompt = `You are a ruthless social media editor. Critique this X post in exactly 3 short bullet points, each under 11 words, focused on hook, clarity, and engagement. Be specific and actionable.

Post:
"${lastPost}"

Return ONLY 3 bullets, each starting with "- ".`;

  const llm = buildLLM();
  const response = await llm.invoke([new HumanMessage(prompt)]);
  const text = response.content as string;

  let bullets = text
    .split('\n')
    .map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (bullets.length === 0) {
    bullets = ['No actionable critique returned.'];
  }

  for (const bullet of bullets) {
    emit?.({ type: 'reflect-bullet', iter: curIter, bullet });
    await new Promise((r) => setTimeout(r, 120));
  }
  emit?.({ type: 'reflect-done', iter: curIter });

  const critiqueText = bullets.map((b) => `- ${b}`).join('\n');
  return {
    messages: [new HumanMessage(critiqueText)],
  };
}

async function routerNode(state: State): Promise<Partial<State>> {
  const { curIter, maxIter, emit } = state;
  emit?.({ type: 'router-start', iter: curIter });

  const decision = curIter >= maxIter ? 'DONE' : 'REFINE';
  emit?.({ type: 'router-done', iter: curIter, decision });
  return { routerDecision: decision };
}

// Skip reflect on the last iteration unless maxIter=1 (single iteration always shows critique)
export function afterGenerateEdge(state: State): string {
  if (state.curIter >= state.maxIter && state.maxIter > 1) {
    return 'router';
  }
  return 'reflect';
}

export function routerEdge(state: State): string {
  if (state.routerDecision === 'DONE' || state.curIter >= state.maxIter) {
    return END;
  }
  return 'generate';
}

export function buildGraph() {
  const graph = new StateGraph(StateAnnotation)
    .addNode('generate', generateNode)
    .addNode('reflect', reflectNode)
    .addNode('router', routerNode)
    .addEdge('__start__', 'generate')
    .addConditionalEdges('generate', afterGenerateEdge, { reflect: 'reflect', router: 'router' })
    .addEdge('reflect', 'router')
    .addConditionalEdges('router', routerEdge, {
      [END]: END,
      generate: 'generate',
    });

  return graph.compile();
}
