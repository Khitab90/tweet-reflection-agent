"use client";

interface Props {
  finalPost: string;
  copied: boolean;
  handle: string;
  onCopy: () => void;
}

export default function FinalPost({ finalPost, copied, handle, onCopy }: Props) {
  const fLen = finalPost.length;

  return (
    <section>
      <div style={{ fontSize: 11, letterSpacing: "1.4px", color: "#6b7685", marginBottom: 10, padding: "0 2px" }}>
        FINAL POST
      </div>

      {finalPost ? (
        <div style={{
          border: "1px solid #243445", background: "#0d141d",
          borderRadius: 15, padding: 15,
          boxShadow: "0 10px 34px rgba(0,0,0,0.34)",
        }}>
          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "#0e1714", border: "1px solid #233830",
              display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#2dd4a7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: "#e9eef4", fontWeight: 600 }}>reflect.agent</span>
              <span style={{ fontSize: 11.5, color: "#5a6473" }}>@{handle}</span>
            </div>
            <span style={{ flex: 1 }} />
          </div>

          {/* Post text */}
          <div style={{
            whiteSpace: "pre-wrap", lineHeight: 1.6,
            fontSize: 14.5, color: "#eef2f7", wordBreak: "break-word",
          }}>
            {finalPost}
          </div>

          {/* Char count */}
          <div style={{
            display: "flex", justifyContent: "flex-end",
            marginTop: 13, paddingTop: 12,
            borderTop: "1px solid #18222d",
          }}>
            <span style={{ fontSize: 11, color: fLen > 280 ? "#f0746a" : "#5a8c79" }}>
              {fLen} / 280
            </span>
          </div>

          {/* Copy button */}
          <button
            onClick={onCopy}
            style={{
              width: "100%", marginTop: 13, padding: 10,
              border: "1px solid #233445", borderRadius: 9,
              background: "#101924", color: "#cfe8ff",
              fontSize: 12.5, letterSpacing: "0.4px",
              cursor: "pointer", transition: "all .14s",
            }}
          >
            {copied
              ? <span style={{ color: "#2dd4a7" }}>copied ✓</span>
              : <span>⧉  copy post</span>
            }
          </button>
        </div>
      ) : (
        <div style={{
          border: "1px dashed #1d242e", borderRadius: 15,
          padding: "30px 20px", textAlign: "center",
          color: "#454f5d", fontSize: 12.5, lineHeight: 1.6,
        }}>
          the polished post<br />lands here after the loop
        </div>
      )}
    </section>
  );
}
