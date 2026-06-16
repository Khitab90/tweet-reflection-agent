import { NextRequest } from "next/server";
import { buildGraph, AgentEvent } from "@/lib/agent";
import { HumanMessage } from "@langchain/core/messages";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${retryAfterSeconds}s.` }),
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: GROQ_API_KEY is not set." }),
      { status: 500 }
    );
  }

  let body: { topic?: string; tone?: string; maxIter?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  }
  const { topic, tone, maxIter } = body;

  if (!topic?.trim()) {
    return new Response(JSON.stringify({ error: "topic required" }), { status: 400 });
  }
  if (topic.length > 500) {
    return new Response(JSON.stringify({ error: "Topic must be under 500 characters." }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: AgentEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const graph = buildGraph();
        await graph.invoke({
          messages: [new HumanMessage(topic)],
          topic: topic.trim(),
          tone: tone ?? "Punchy",
          maxIter: Math.max(1, Math.min(5, Number(maxIter) || 3)),
          curIter: 0,
          lastPost: "",
          routerDecision: "",
          emit: send,
        });

        // find final post from last AI message via state
        // final event is emitted by the graph via generate-done on last iteration
        send({ type: "final", post: "" }); // sentinel — client already has it from generate-done
      } catch (err) {
        send({ type: "error", message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
