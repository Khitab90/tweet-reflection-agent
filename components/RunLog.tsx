"use client";

export interface Step {
  id: string;
  kind: "generate" | "reflect";
  iter: number;
  content: string;
  bullets: string[];
  streaming: boolean;
}

interface Props {
  steps: Step[];
  running: boolean;
  onClear: () => void;
}

export default function RunLog({ steps, running, onClear }: Props) {
  const empty = steps.length === 0;
  const showClear = steps.length > 0 && !running;

  return (
    <main style={{ flex: "3 1 420px", minWidth: 330, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
        <span style={{ fontSize: 11, letterSpacing: "1.4px", color: "#6b7685" }}>RUN LOG</span>
        {showClear && (
          <button
            onClick={onClear}
            style={{
              border: "none", background: "none", color: "#5a6473",
              fontSize: 11.5, cursor: "pointer", letterSpacing: "0.3px",
            }}
          >
            clear ✕
          </button>
        )}
      </div>

      {empty && (
        <div style={{
          border: "1px dashed #1d242e", borderRadius: 14,
          padding: "46px 28px", textAlign: "center",
          color: "#525c6b", lineHeight: 1.7, fontSize: 13,
        }}>
          <div style={{ fontSize: 22, marginBottom: 10, opacity: 0.7 }}>↻</div>
          enter a topic, then run the agent.<br />
          it drafts a post, critiques it,<br />
          and refines — looping until it&apos;s sharp.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {steps.map((s) => {
          const isGen = s.kind === "generate";
          const accent = isGen ? "#2dd4a7" : "#f0b429";
          const len = s.content.length;

          return (
            <div key={s.id} style={{ display: "flex", gap: 14, animation: "fadeUp .28s ease both" }}>
              {/* Timeline dot + line */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                width: 14, paddingTop: 5,
              }}>
                <span style={{
                  width: 11, height: 11, borderRadius: "50%",
                  background: accent, boxShadow: `0 0 11px ${accent}`, flex: "none",
                  display: "inline-block",
                }} />
                <span style={{ flex: 1, width: 1.5, background: "#171d25", margin: "5px 0", display: "block" }} />
              </div>

              {/* Step content */}
              <div style={{ flex: 1, paddingBottom: 18, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, letterSpacing: "1.2px", fontWeight: 600, color: accent }}>
                    {isGen ? "GENERATE" : "REFLECT"}
                  </span>
                  <span style={{ fontSize: 10.5, color: "#525c6b", letterSpacing: "0.4px" }}>
                    iter {s.iter}
                  </span>
                  <span style={{ flex: 1 }} />
                  {isGen && len > 0 && (
                    <span style={{
                      fontSize: 10.5, letterSpacing: "0.4px",
                      color: len > 280 ? "#f0746a" : "#525c6b",
                    }}>
                      {len} / 280
                    </span>
                  )}
                </div>

                <div style={{
                  border: `1px solid ${isGen ? "#1b2a26" : "#2a2412"}`,
                  background: isGen ? "#0d1418" : "#13110b",
                  borderRadius: 11, padding: "13px 15px",
                }}>
                  {isGen ? (
                    <div style={{
                      whiteSpace: "pre-wrap", lineHeight: 1.6,
                      fontSize: 14, color: "#e9eef4", wordBreak: "break-word",
                    }}>
                      {s.content}
                      {s.streaming && (
                        <span style={{ color: "#2dd4a7", animation: "blink 1s step-end infinite" }}>▌</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {s.bullets.map((b, i) => (
                        <div key={i} style={{
                          display: "flex", gap: 9, alignItems: "flex-start",
                          fontSize: 13, color: "#b3bcc7", lineHeight: 1.5,
                          padding: "3px 0", animation: "fadeUp .25s ease both",
                        }}>
                          <span style={{ color: "#f0b429", flex: "none" }}>▹</span>
                          <span style={{ flex: 1, minWidth: 0 }}>{b}</span>
                        </div>
                      ))}
                      {s.streaming && s.bullets.length === 0 && (
                        <div style={{ fontSize: 12.5, color: "#6b7685", padding: "3px 0" }}>
                          analyzing<span style={{ animation: "blink 1s step-end infinite" }}>…</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
