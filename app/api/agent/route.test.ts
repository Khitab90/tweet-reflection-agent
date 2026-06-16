import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/agent", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agent")>("@/lib/agent");
  return {
    ...actual,
    buildGraph: () => ({ invoke: mockInvoke }),
  };
});

const { POST } = await import("./route");

// Reads all SSE "data: {...}" lines out of a streamed Response body.
async function readSseEvents(res: Response): Promise<unknown[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
}

// Each test uses a unique IP (via x-forwarded-for) to avoid cross-test
// interference with the shared rate-limit Map, except the dedicated
// rate-limit test below.
let ipCounter = 0;
function uniqueIp() {
  return `10.0.0.${ipCounter++}`;
}

function makeRequest(body: unknown, ip = uniqueIp()): NextRequest {
  return new NextRequest("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const originalApiKey = process.env.GROQ_API_KEY;

beforeEach(() => {
  process.env.GROQ_API_KEY = "test-key";
  mockInvoke.mockReset().mockResolvedValue({});
});

afterEach(() => {
  process.env.GROQ_API_KEY = originalApiKey;
});

describe("POST /api/agent validation", () => {
  it("returns 500 when GROQ_API_KEY is not set", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await POST(makeRequest({ topic: "hello" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/GROQ_API_KEY/);
  });

  it("returns 400 for malformed JSON body", async () => {
    const res = await POST(makeRequest("{not valid json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid request body/);
  });

  it("returns 400 when topic is missing", async () => {
    const res = await POST(makeRequest({ tone: "Punchy" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/topic required/);
  });

  it("returns 400 when topic is empty/whitespace", async () => {
    const res = await POST(makeRequest({ topic: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when topic exceeds 500 characters", async () => {
    const res = await POST(makeRequest({ topic: "a".repeat(501) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/500 characters/);
  });

  it("returns 429 after exceeding the rate limit for one IP", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ topic: "test topic" }, ip));
    }
    const res = await POST(makeRequest({ topic: "test topic" }, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
  });

  it("starts streaming (200, text/event-stream) for a valid request", async () => {
    const res = await POST(makeRequest({ topic: "valid topic", tone: "Punchy", maxIter: 1 }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("emits an SSE error event (not a thrown exception) when the agent graph fails mid-run", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Groq API unavailable"));

    const res = await POST(makeRequest({ topic: "valid topic", tone: "Punchy", maxIter: 1 }));
    expect(res.status).toBe(200); // headers already sent before the graph runs

    const events = await readSseEvents(res);
    expect(events).toContainEqual({ type: "error", message: "Groq API unavailable" });
  });
});
