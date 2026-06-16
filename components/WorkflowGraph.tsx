"use client";

interface Props {
  activeNode: string;
  running: boolean;
  curIter: number;
  maxIter: number;
}

export default function WorkflowGraph({ activeNode, running, curIter, maxIter }: Props) {
  const a = running ? activeNode : (activeNode === "end" ? "end" : "idle");

  const genGlow = a === "generate" ? 1 : 0;
  const reflectGlow = a === "reflect" ? 1 : 0;
  const routerGlow = a === "router" ? 1 : 0;
  const endGlow = a === "end" ? 1 : 0;

  const statusMap: Record<string, string> = {
    idle: "ready",
    generate: "drafting",
    reflect: "critiquing",
    router: "deciding",
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

      {/* SVG graph — expanded to include router node */}
      <svg viewBox="0 0 330 230" style={{ width: "100%", height: "auto", display: "block" }}
        fontFamily="'IBM Plex Mono',monospace">
        <defs>
          <marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0 0 L7 3 L0 6 z" fill="#3a4452" />
          </marker>
        </defs>

        {/* Edges */}
        {/* start → generate */}
        <path d="M53 150 L96 150" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />
        {/* generate → reflect (up) */}
        <path d="M162 128 L162 76 L188 76" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />
        {/* reflect → router */}
        <path d="M220 52 L269 52 L269 135" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />
        {/* router → end */}
        <path d="M289 150 L305 162" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />
        {/* router → generate (refine loop, left side) */}
        <path d="M249 165 L80 165 L80 150" stroke="#3a4452" strokeWidth="1.4" markerEnd="url(#arw)" fill="none" />

        {/* Edge labels */}
        <text x="170" y="103" textAnchor="start" fontSize="8.5" fill="#6b7685">critique</text>
        <text x="247" y="48" textAnchor="end" fontSize="8.5" fill="#6b7685">evaluate</text>
        <text x="298" y="156" textAnchor="start" fontSize="8.5" fill="#6b7685">done</text>
        <text x="163" y="178" textAnchor="middle" fontSize="8.5" fill="#6b7685">refine</text>

        {/* Glow rings */}
        <rect x="96" y="124" width="128" height="52" rx="13" fill="none" stroke="#2dd4a7"
          strokeWidth="1.6" opacity={genGlow} style={{ animation: glowAnim }} />
        <rect x="100" y="32" width="120" height="40" rx="11" fill="none" stroke="#f0b429"
          strokeWidth="1.6" opacity={reflectGlow} style={{ animation: glowAnim }} />
        <rect x="248" y="134" width="42" height="32" rx="9" fill="none" stroke="#a78bfa"
          strokeWidth="1.6" opacity={routerGlow} style={{ animation: glowAnim }} />
        <rect x="304" y="158" width="26" height="26" rx="7" fill="none" stroke="#4d9fec"
          strokeWidth="1.6" opacity={endGlow} style={{ animation: glowAnim }} />

        {/* START */}
        <rect x="27" y="137" width="26" height="26" rx="6" fill="#11161c" stroke="#2a3340" strokeWidth="1.3" />
        <circle cx="40" cy="150" r="3" fill="#6b7685" />
        <text x="40" y="180" textAnchor="middle" fontSize="8.5" fill="#525c6b">start</text>

        {/* GENERATE */}
        <rect x="100" y="128" width="124" height="44" rx="11" fill="#0d1a16" stroke="#2dd4a7" strokeWidth="1.4" />
        <text x="162" y="154" textAnchor="middle" fontSize="12" fontWeight="600" fill="#2dd4a7">generate</text>

        {/* REFLECT */}
        <rect x="100" y="32" width="120" height="40" rx="11" fill="#1a160b" stroke="#f0b429" strokeWidth="1.4" />
        <text x="160" y="56" textAnchor="middle" fontSize="12" fontWeight="600" fill="#f0b429">reflect</text>

        {/* ROUTER (new) */}
        <rect x="249" y="135" width="40" height="30" rx="8" fill="#130f1e" stroke="#a78bfa" strokeWidth="1.4" />
        <text x="269" y="154" textAnchor="middle" fontSize="10" fontWeight="600" fill="#a78bfa">router</text>

        {/* END */}
        <rect x="305" y="159" width="24" height="24" rx="6" fill="#11161c" stroke="#2a3340" strokeWidth="1.3" />
        <rect x="313" y="167" width="8" height="8" rx="1.5" fill="#6b7685" />
        <text x="317" y="200" textAnchor="middle" fontSize="8.5" fill="#525c6b">end</text>
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
