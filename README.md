# reflect.agent - Tweet Reflection Agent

A full-stack AI agent that iteratively drafts, critiques, and refines tweets using a LangGraph reflection loop. Enter a topic, pick a tone and iteration count, and the agent runs autonomously - each iteration generating a tweet and critiquing it - until the final polished post lands in the output panel.

---

## What the Agent Does

The agent takes a topic and tone as input and runs N user-configured iterations. Each iteration:

1. **Generates** a tweet (under 280 characters, in the chosen tone)
2. **Reflects** on it - producing 3 short, actionable critique bullets focused on hook, clarity, and engagement
3. Uses the critique as feedback for the next generation

The last iteration produces the final tweet (no critique after it - the output *is* the result). The best version lands in the **Final Post** panel, ready to copy.

---

## Workflow

```
start → generate → reflect → router → generate → reflect → router → ... → end
                                 ↑                                      ↓
                              (refine)                               (done)
```

### Nodes

| Node | Color | Role |
|------|-------|------|
| `generate` | Teal | Calls the LLM to write a tweet. On first iteration, uses the raw topic. On subsequent iterations, incorporates the previous critique. Streams tokens to the UI in real time. |
| `reflect` | Amber | Calls the LLM to critique the tweet in exactly 3 bullet points. Returns critique as feedback for the next generate. Skipped on the final iteration. |
| `router` | Purple | Decides whether to loop back to `generate` or terminate. Currently uses a hard iteration counter (`curIter >= maxIter → DONE`). Designed as the extension point for LLM-based quality gating. |

### Iteration rules

- **1 iteration**: gen → reflect → end (critique shown, single pass)
- **N > 1 iterations**: gen → reflect → gen → reflect → ... → gen → end (last generate has no critique)
- Max iterations is user-configurable from 1 to 5

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, IBM Plex Mono |
| Styling | Inline styles, CSS animations (`globals.css`), no component library |
| Agent framework | LangGraph (`@langchain/langgraph`) - TypeScript |
| LLM | Groq - `llama-3.3-70b-versatile` (free tier) |
| LLM client | `@langchain/groq`, `@langchain/core` |
| Streaming | Server-Sent Events (SSE) via Next.js Route Handler |
| Testing | Vitest, `@vitest/coverage-v8` |
| Linting | ESLint (`eslint-config-next`, `eslint-plugin-security`) |
| CI/CD | GitHub Actions (lint + test + build), CodeQL, Dependabot |
| Deployment | Vercel (Node.js runtime, `maxDuration: 60s`) |

---

## Project Structure

```
tweet-reflection-agent/
├── .github/
│   ├── dependabot.yml           # Weekly dependency updates (react/react-dom and
│   │                            # @langchain/* grouped to update in lockstep)
│   └── workflows/
│       ├── ci.yml               # Lint + test (with coverage) + build on every push/PR
│       └── codeql.yml           # JS/TS SAST scanning
├── app/
│   ├── layout.tsx               # IBM Plex Mono font, metadata
│   ├── page.tsx                 # Entry point → renders <TweetAgent />
│   ├── globals.css              # Animations: blink, fadeUp, glowPulse, spinSlow
│   └── api/agent/
│       ├── route.ts             # POST endpoint - validation, rate limiting, streams SSE
│       └── route.test.ts        # Validation + error-path tests
├── components/
│   ├── TweetAgent.tsx           # Root state container, SSE consumer
│   ├── AppHeader.tsx            # Sticky header: branding, status pill, iter counter
│   ├── LeftPanel.tsx            # Prompt textarea, iterations stepper, tone selector, run button, error banner
│   ├── RunLog.tsx               # Timeline of generate/reflect steps with streaming
│   ├── WorkflowGraph.tsx        # SVG diagram with live glow rings on active node
│   └── FinalPost.tsx            # Final tweet card with char count and copy button
├── lib/
│   ├── agent.ts                 # LangGraph graph: nodes, edges, state, SSE emit
│   ├── agent.test.ts            # Routing logic + LLM-failure/fallback tests
│   ├── rateLimit.ts             # In-memory per-IP rate limiter
│   └── rateLimit.test.ts
├── eslint.config.mjs
├── vitest.config.ts
├── CLAUDE.md                    # Coding behavioral guidelines
└── .env.local.example           # Environment variable template
```

---

## Implementation Details

### Streaming

The API route (`app/api/agent/route.ts`) returns a `ReadableStream` with `Content-Type: text/event-stream`. The LangGraph graph receives an `emit` callback via state that fires typed SSE events as the graph runs:

```ts
type AgentEvent =
  | { type: "generate-start"; iter: number }
  | { type: "generate-token"; iter: number; token: string }   // streamed char by char
  | { type: "generate-done"; iter: number; post: string }
  | { type: "reflect-start"; iter: number }
  | { type: "reflect-bullet"; iter: number; bullet: string }  // one bullet at a time
  | { type: "reflect-done"; iter: number }
  | { type: "router-start"; iter: number }
  | { type: "router-done"; iter: number; decision: "DONE" | "REFINE" }
  | { type: "final"; post: string }
  | { type: "error"; message: string }
```

The frontend reads the stream line by line and dispatches each event to React state, producing the live-updating UI.

### LangGraph State

The graph uses `Annotation.Root` to define typed state with reducers:

```ts
{
  messages: BaseMessage[]   // full conversation history (generate + reflect outputs)
  topic: string             // user's input topic
  tone: string              // Punchy | Professional | Witty | Bold
  maxIter: number           // user-configured max iterations (1–5)
  curIter: number           // current iteration count
  lastPost: string          // most recent generated tweet
  routerDecision: string    // DONE | REFINE
  emit: (e: AgentEvent) => void  // SSE callback injected at invocation
}
```

### Prompts

**Generate:**
> You are an expert at writing viral, high-signal posts for X (Twitter). Write ONE post about: "{topic}". Tone: {tone}. Hard limit: 280 characters. No surrounding quotes. At most one hashtag, only if natural. [If critique exists: incorporate it.]

**Reflect:**
> You are a ruthless social media editor. Critique this X post in exactly 3 short bullet points, each under 11 words, focused on hook, clarity, and engagement. Return ONLY 3 bullets starting with "- ".

### Tone

Tone is passed as a plain word in the generate prompt (`Tone: Punchy.`). The LLM interprets each tone using its training knowledge. The four options are: **Punchy**, **Professional**, **Witty**, **Bold**.

### Character limit

Enforced at two levels:
1. Prompt instruction: "Hard limit: 280 characters"
2. Hard truncation in agent code: `post.slice(0, 280)`

The UI shows a live `X / 280` counter that turns red if exceeded.

---

## Security & Reliability

- **Rate limiting** - `lib/rateLimit.ts` caps each IP to 5 requests/minute on `/api/agent` (in-memory fixed window; sufficient for a single-instance deployment). Exceeding it returns `429` with a `Retry-After` header.
- **Input validation** - topic is required, capped at 500 characters (server-enforced + client `maxLength`), and malformed JSON bodies return `400` instead of crashing the route.
- **Fail-fast misconfiguration check** - missing `GROQ_API_KEY` returns a clear `500` instead of a cryptic error surfacing from deep inside the LLM SDK.
- **User-facing error surfacing** - API errors, SSE `error` events, and clipboard-copy failures all show a message in the UI rather than only logging to the console.
- **GitHub security tooling** - secret scanning + push protection, Dependabot vulnerability alerts and version-update PRs (grouped for `react`/`react-dom` and `@langchain/*` so peer-dependency bumps land together), CodeQL SAST scanning on every push/PR.
- **Branch protection** - `main` blocks force-pushes and branch deletion.

---

## Testing

Vitest, no `jsdom`/React Testing Library yet - current scope is pure logic (routing decisions, rate limiter) and API route validation/error paths, not component rendering.

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

24 tests across 3 files:
- `lib/rateLimit.test.ts` - window limits, reset, independent keys
- `lib/agent.test.ts` - `afterGenerateEdge`/`routerEdge` branch logic; `generateNode`/`reflectNode` LLM-failure propagation and the empty-critique fallback (LLM mocked, no real network calls)
- `app/api/agent/route.test.ts` - every validation/error path (missing topic, length cap, malformed JSON, missing API key, rate limit, mid-stream SSE error) plus the success-path response shape

CI runs lint + `test:coverage` + build on every push/PR to `main` and uploads coverage to Codecov.

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Khitab90/tweet-reflection-agent.git
cd tweet-reflection-agent
npm install
```

### 2. Set up environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_TWITTER_HANDLE=you
```

Get a free Groq API key at [console.groq.com](https://console.groq.com) - no credit card required.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add `GROQ_API_KEY` and `NEXT_PUBLIC_TWITTER_HANDLE` in **Settings → Environment Variables**
4. Deploy

The API route uses Node.js runtime with `maxDuration: 60` - the max allowed on Vercel's free Hobby plan - which comfortably covers multi-iteration runs given Groq's response speed.

---

## Origin

Based on the IBM Skills Network course **"Building a Reflection Agent with LangGraph"** (Module 2), ported from Python + WatsonX to TypeScript + Groq, adapted from LinkedIn posts to tweets, and built into a full interactive web UI.
