"use client";

const TONES = ["Punchy", "Professional", "Witty", "Bold"] as const;
export type Tone = typeof TONES[number];

interface Props {
  topic: string;
  tone: Tone;
  maxIter: number;
  running: boolean;
  onTopicChange: (v: string) => void;
  onToneChange: (t: Tone) => void;
  onIterChange: (delta: number) => void;
  onRun: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  errorMessage: string | null;
}

export default function LeftPanel({
  topic, tone, maxIter, running,
  onTopicChange, onToneChange, onIterChange, onRun, onKeyDown, errorMessage,
}: Props) {
  const canRun = !running && topic.trim().length > 0;

  return (
    <aside style={{
      position: "sticky", top: 78,
      flex: "1 1 318px", minWidth: 300, maxWidth: 360,
      display: "flex", flexDirection: "column", gap: 18,
    }}>
      {/* PROMPT */}
      <section style={{
        border: "1px solid #1a212b", background: "#0e1217",
        borderRadius: 14, padding: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
          <span style={{ fontSize: 11, letterSpacing: "1.4px", color: "#6b7685" }}>PROMPT</span>
          <span style={{ fontSize: 10.5, color: "#414b59" }}>⌘↵ to run</span>
        </div>
        <textarea
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={"what should the tweet be about?\n\ne.g. landing a software dev job at IBM"}
          rows={4}
          maxLength={500}
          style={{
            width: "100%", resize: "vertical", minHeight: 96,
            background: "#0a0d11", border: "1px solid #1d242e",
            borderRadius: 10, color: "#e7ecf2", fontSize: 14,
            lineHeight: 1.55, padding: "12px 13px",
          }}
        />
      </section>

      {/* CONFIG */}
      <section style={{
        border: "1px solid #1a212b", background: "#0e1217",
        borderRadius: 14, padding: 16,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <span style={{ fontSize: 11, letterSpacing: "1.4px", color: "#6b7685" }}>CONFIG</span>

        {/* Iterations */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, color: "#9aa4b2" }}>iterations</span>
          <div style={{
            display: "flex", alignItems: "center", gap: 2,
            border: "1px solid #1d242e", borderRadius: 9, overflow: "hidden",
          }}>
            <button
              onClick={() => onIterChange(-1)}
              disabled={running}
              style={{
                width: 30, height: 30, border: "none", background: "#11161c",
                color: "#9aa4b2", fontSize: 16, cursor: running ? "not-allowed" : "pointer",
              }}
            >−</button>
            <span style={{ minWidth: 30, textAlign: "center", fontSize: 14, color: "#e7ecf2" }}>
              {maxIter}
            </span>
            <button
              onClick={() => onIterChange(1)}
              disabled={running}
              style={{
                width: 30, height: 30, border: "none", background: "#11161c",
                color: "#9aa4b2", fontSize: 16, cursor: running ? "not-allowed" : "pointer",
              }}
            >+</button>
          </div>
        </div>

        {/* Tone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ fontSize: 12.5, color: "#9aa4b2" }}>tone</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {TONES.map((t) => {
              const on = tone === t;
              return (
                <button
                  key={t}
                  onClick={() => !running && onToneChange(t)}
                  style={{
                    padding: "8px 6px", borderRadius: 8, fontSize: 12,
                    cursor: running ? "not-allowed" : "pointer",
                    border: `1px solid ${on ? "rgba(45,212,167,0.5)" : "#1d242e"}`,
                    background: on ? "rgba(45,212,167,0.12)" : "#0a0d11",
                    color: on ? "#7ff0d2" : "#8a94a3",
                    transition: "all .14s",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={!canRun}
        style={{
          width: "100%", padding: 13, border: "none", borderRadius: 11,
          background: "#2dd4a7", color: "#06211a",
          fontSize: 13.5, fontWeight: 600, letterSpacing: "0.4px",
          cursor: canRun ? "pointer" : "not-allowed",
          opacity: canRun ? 1 : 0.42,
          boxShadow: "0 6px 22px rgba(45,212,167,0.16)",
          transition: "opacity .15s",
        }}
      >
        {running ? "running…" : "▶  run agent"}
      </button>

      {errorMessage && (
        <div style={{
          border: "1px solid #3a2222", background: "#1a1010",
          borderRadius: 10, padding: "10px 13px",
          color: "#f0746a", fontSize: 12.5, lineHeight: 1.5,
        }}>
          {errorMessage}
        </div>
      )}
    </aside>
  );
}
