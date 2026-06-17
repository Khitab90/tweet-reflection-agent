"use client";

interface Props {
  activeNode: string;
  running: boolean;
  curIter: number;
  maxIter: number;
}

export default function WorkflowGraph({ activeNode, running, curIter, maxIter }: Props) {
  const a = running ? activeNode : (activeNode === "end" ? "end" : "idle");

  const genGlow = (a === "generate" || a === "router") ? 1 : 0;
  const reflectGlow = a === "reflect" ? 1 : 0;
  const endGlow = a === "end" ? 1 : 0;

  const statusMap: Record<string, string> = {
    idle: "ready",
    generate: "drafting",
    reflect: "critiquing",
    router: "routing",
    end: "complete",
  };
  const graphStatus = statusMap[a] ?? "ready";

  const iterPips = Array.from({ length: maxIter }, (_, i) => ({
    color: i < curIter ? "#2dd4a7" : "#1d242e",
  }));

  const glowAnim = "glowPulse 1.4s ease-in-out infinite";

  return (
    <section style={{
      border: "1px solid #1a212b", background: "#0e1217",
      borderRadius: 14, padding: "16px 16px 13px",
    }}>
      <div style={{ fontSize: 11, letterSpacing: "1.4px", color: "#6b7685", marginBottom: 6 }}>WORKFLOW</div>

      {/* SVG graph — matches design: start → generate ↕ reflect → end, no router node shown */}
      <svg viewBox="0 0 320 200" style={{ width: "100%", height: "auto", display: "block" }}
        fontFamily="'IBM Plex Mono',monospace">
        <defs>
          <marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0 0 L7 3 L0 6 z" fill="#3a4452" />
          </marker>
        </defs>

        {/* Edges */}
        {/* start → generate */}
        <path d="M44 138 L75 138" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />
        {/* generate → reflect (left column, going up, labeled "critique") */}
        <path d="M122 116 L122 68" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />
        {/* reflect → generate (right column, going down, labeled "refine") */}
        <path d="M168 68 L168 116" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />
        {/* generate → end (right, labeled "done") */}
        <path d="M225 138 L262 138" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />

        {/* Edge labels */}
        <text x="108" y="96" textAnchor="end" fontSize="8.5" fill="#6b7685">critique</text>
        <text x="182" y="96" textAnchor="start" fontSize="8.5" fill="#6b7685">refine</text>
        <text x="243" y="133" textAnchor="middle" fontSize="8.5" fill="#6b7685">done</text>

        {/* Glow rings */}
        <rect x="73" y="114" width="154" height="48" rx="13" fill="none" stroke="#2dd4a7"
          strokeWidth="1.6" opacity={genGlow} style={{ animation: glowAnim }} />
        <rect x="83" y="22" width="124" height="48" rx="13" fill="none" stroke="#f0b429"
          strokeWidth="1.6" opacity={reflectGlow} style={{ animation: glowAnim }} />
        <rect x="260" y="126" width="30" height="24" rx="7" fill="none" stroke="#4d9fec"
          strokeWidth="1.6" opacity={endGlow} style={{ animation: glowAnim }} />

        {/* START */}
        <rect x="18" y="125" width="26" height="26" rx="6" fill="#11161c" stroke="#2a3340" strokeWidth="1.3" />
        <circle cx="31" cy="138" r="3" fill="#6b7685" />
        <text x="31" y="167" textAnchor="middle" fontSize="8.5" fill="#525c6b">start</text>

        {/* GENERATE */}
        <rect x="75" y="116" width="150" height="44" rx="11" fill="#0d1a16" stroke="#2dd4a7" strokeWidth="1.4" />
        <text x="150" y="142" textAnchor="middle" fontSize="12" fontWeight="600" fill="#2dd4a7">generate</text>

        {/* REFLECT */}
        <rect x="85" y="24" width="120" height="44" rx="11" fill="#1a160b" stroke="#f0b429" strokeWidth="1.4" />
        <text x="145" y="50" textAnchor="middle" fontSize="12" fontWeight="600" fill="#f0b429">reflect</text>

        {/* END */}
        <rect x="262" y="126" width="26" height="24" rx="6" fill="#11161c" stroke="#2a3340" strokeWidth="1.3" />
        <rect x="270" y="133" width="10" height="10" rx="1.5" fill="#6b7685" />
        <text x="275" y="167" textAnchor="middle" fontSize="8.5" fill="#525c6b">end</text>
      </svg>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid #161c24", marginTop: 6, paddingTop: 11,
      }}>
        <div style={{ display: "flex", gap: 5 }}>
          {iterPips.map((p, i) => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: p.color, display: "inline-block",
            }} />
          ))}
        </div>
        <span style={{ fontSize: 10.5, letterSpacing: "0.4px", color: "#6b7685" }}>{graphStatus}</span>
      </div>
    </section>
  );
}
