import { NextRequest } from "next/server";
import { buildGraph, AgentEvent } from "@/lib/agent";
import { HumanMessage } from "@langchain/core/messages";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { topic, tone, maxIter } = await req.json();

  if (!topic?.trim()) {
    return new Response(JSON.stringify({ error: "topic required" }), { status: 400 });
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
