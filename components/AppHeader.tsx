"use client";

const STATUS_DOT: Record<string, string> = {
  idle: "#5a6473",
  generate: "#2dd4a7",
  reflect: "#f0b429",
  router: "#a78bfa",
  end: "#4d9fec",
};

const STATUS_TEXT: Record<string, string> = {
  idle: "idle",
  generate: "generating",
  reflect: "reflecting",
  router: "deciding",
  end: "done",
};

interface Props {
  activeNode: string;
  running: boolean;
  curIter: number;
  maxIter: number;
}

export default function AppHeader({ activeNode, running, curIter, maxIter }: Props) {
  const node = running ? activeNode : (activeNode === "end" ? "end" : "idle");
  const dot = STATUS_DOT[node] ?? STATUS_DOT.idle;
  const text = STATUS_TEXT[node] ?? "idle";
  const showIter = running || activeNode === "end";

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "13px 22px",
      background: "rgba(10,12,16,0.8)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid #161c24",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          border: "1px solid #233830", background: "#0e1714",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="#2dd4a7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontWeight: 600, letterSpacing: "0.4px", fontSize: 15 }}>
            reflect<span style={{ color: "#2dd4a7" }}>.</span>agent
          </div>
          <div style={{
            color: "#525c6b", fontSize: 11.5, letterSpacing: "0.3px",
            borderLeft: "1px solid #1d242e", paddingLeft: 10,
          }}>
            tweet generator
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "5px 11px", border: "1px solid #1d242e",
          borderRadius: 20, background: "#0e1217",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: dot,
            boxShadow: `0 0 8px ${dot}`,
            display: "inline-block",
          }} />
          <span style={{ fontSize: 11.5, letterSpacing: "0.4px", color: "#9aa4b2" }}>{text}</span>
        </div>
        {showIter && (
          <div style={{ fontSize: 11.5, letterSpacing: "0.4px", color: "#6b7685", padding: "5px 0" }}>
            iter <span style={{ color: "#d4dae3" }}>{curIter}</span> / {maxIter}
          </div>
        )}
      </div>
    </header>
  );
}
