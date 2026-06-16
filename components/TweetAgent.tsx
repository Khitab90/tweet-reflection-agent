"use client";

import { useState, useCallback, useRef } from "react";
import AppHeader from "./AppHeader";
import LeftPanel, { Tone } from "./LeftPanel";
import RunLog, { Step } from "./RunLog";
import WorkflowGraph from "./WorkflowGraph";
import FinalPost from "./FinalPost";

type ActiveNode = "idle" | "generate" | "reflect" | "router" | "end";

interface AgentState {
  topic: string;
  tone: Tone;
  maxIter: number;
  running: boolean;
  activeNode: ActiveNode;
  curIter: number;
  steps: Step[];
  finalPost: string;
  copied: boolean;
}

export default function TweetAgent() {
  const [state, setState] = useState<AgentState>({
    topic: "",
    tone: "Punchy",
    maxIter: 3,
    running: false,
    activeNode: "idle",
    curIter: 0,
    steps: [],
    finalPost: "",
    copied: false,
  });

  // ref so SSE callbacks always see latest state without stale closure
  const stepsRef = useRef<Step[]>([]);

  function patch(partial: Partial<AgentState>) {
    setState((s) => ({ ...s, ...partial }));
  }

  function patchStep(id: string, update: Partial<Step>) {
    setState((s) => ({
      ...s,
      steps: s.steps.map((st) => (st.id === id ? { ...st, ...update } : st)),
    }));
    stepsRef.current = stepsRef.current.map((st) =>
      st.id === id ? { ...st, ...update } : st
    );
  }

  function addStep(step: Step) {
    setState((s) => ({ ...s, steps: [...s.steps, step] }));
    stepsRef.current = [...stepsRef.current, step];
  }

  const runAgent = useCallback(async () => {
    if (state.running || !state.topic.trim()) return;

    const { topic, tone, maxIter } = state;
    stepsRef.current = [];
    patch({ running: true, steps: [], finalPost: "", copied: false, activeNode: "generate", curIter: 0 });

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, maxIter }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let lastPost = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          switch (event.type) {
            case "generate-start":
              patch({ activeNode: "generate", curIter: event.iter });
              addStep({ id: `g${event.iter}`, kind: "generate", iter: event.iter, content: "", bullets: [], streaming: true });
              break;

            case "generate-token":
              patchStep(`g${event.iter}`, {
                content: (stepsRef.current.find((s) => s.id === `g${event.iter}`)?.content ?? "") + event.token,
              });
              break;

            case "generate-done":
              lastPost = event.post;
              patchStep(`g${event.iter}`, { content: event.post, streaming: false });
              break;

            case "reflect-start":
              patch({ activeNode: "reflect" });
              addStep({ id: `r${event.iter}`, kind: "reflect", iter: event.iter, content: "", bullets: [], streaming: true });
              break;

            case "reflect-bullet": {
              const cur = stepsRef.current.find((s) => s.id === `r${event.iter}`);
              patchStep(`r${event.iter}`, { bullets: [...(cur?.bullets ?? []), event.bullet] });
              break;
            }

            case "reflect-done":
              patchStep(`r${event.iter}`, { streaming: false });
              break;

            case "router-start":
              patch({ activeNode: "router" });
              break;

            case "router-done":
              // decision shown via graphStatus — no extra UI element needed
              break;

            case "final":
              patch({ activeNode: "end", running: false, finalPost: lastPost });
              break;

            case "error":
              console.error("Agent error:", event.message);
              patch({ running: false, activeNode: "idle" });
              break;
          }
        }
      }

      // fallback in case "final" event was missed
      setState((s) => {
        if (s.running) return { ...s, running: false, activeNode: "end", finalPost: lastPost };
        return s;
      });
    } catch (err) {
      console.error(err);
      patch({ running: false, activeNode: "idle" });
    }
  }, [state]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runAgent();
    }
  }

  function copyFinal() {
    try { navigator.clipboard.writeText(state.finalPost); } catch {}
    patch({ copied: true });
    setTimeout(() => patch({ copied: false }), 1600);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0c10",
      color: "#d4dae3",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 14,
      backgroundImage: "radial-gradient(circle at 18% -10%, rgba(45,212,167,0.06), transparent 42%), radial-gradient(circle at 92% 4%, rgba(240,180,41,0.045), transparent 40%)",
    }}>
      <AppHeader
        activeNode={state.activeNode}
        running={state.running}
        curIter={state.curIter}
        maxIter={state.maxIter}
      />

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 20,
        alignItems: "flex-start",
        padding: 22, maxWidth: 1480, margin: "0 auto",
      }}>
        <LeftPanel
          topic={state.topic}
          tone={state.tone}
          maxIter={state.maxIter}
          running={state.running}
          onTopicChange={(v) => patch({ topic: v })}
          onToneChange={(t) => patch({ tone: t })}
          onIterChange={(d) => {
            if (state.running) return;
            const v = Math.max(1, Math.min(5, state.maxIter + d));
            patch({ maxIter: v });
          }}
          onRun={runAgent}
          onKeyDown={handleKeyDown}
        />

        <RunLog
          steps={state.steps}
          running={state.running}
          onClear={() => {
            if (state.running) return;
            stepsRef.current = [];
            patch({ steps: [], finalPost: "", activeNode: "idle", curIter: 0, copied: false });
          }}
        />

        <aside style={{
          position: "sticky", top: 78,
          flex: "1 1 300px", minWidth: 288, maxWidth: 344,
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          <WorkflowGraph
            activeNode={state.activeNode}
            running={state.running}
            curIter={state.curIter}
            maxIter={state.maxIter}
          />
          <FinalPost
            finalPost={state.finalPost}
            copied={state.copied}
            handle={process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? "you"}
            onCopy={copyFinal}
          />
        </aside>
      </div>
    </div>
  );
}
