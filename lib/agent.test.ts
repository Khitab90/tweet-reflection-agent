import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStream, mockInvoke } = vi.hoisted(() => ({
  mockStream: vi.fn(),
  mockInvoke: vi.fn(),
}));

vi.mock("@langchain/groq", () => ({
  ChatGroq: vi.fn().mockImplementation(function ChatGroq() {
    return { stream: mockStream, invoke: mockInvoke };
  }),
}));

import { afterGenerateEdge, routerEdge, generateNode, reflectNode, State } from "./agent";

// Minimal partial state builder — only the fields these functions read are required.
function makeState(overrides: Partial<State>): State {
  return {
    messages: [],
    topic: "test topic",
    tone: "Punchy",
    maxIter: 3,
    curIter: 0,
    lastPost: "",
    routerDecision: "",
    emit: null,
    ...overrides,
  } as State;
}

beforeEach(() => {
  mockStream.mockReset();
  mockInvoke.mockReset();
});

describe("afterGenerateEdge", () => {
  it("goes to reflect when not yet at maxIter", () => {
    const state = makeState({ curIter: 1, maxIter: 3 });
    expect(afterGenerateEdge(state)).toBe("reflect");
  });

  it("goes to router on the last iteration when maxIter > 1", () => {
    const state = makeState({ curIter: 3, maxIter: 3 });
    expect(afterGenerateEdge(state)).toBe("router");
  });

  it("goes to reflect even on the only iteration when maxIter = 1 (special case)", () => {
    const state = makeState({ curIter: 1, maxIter: 1 });
    expect(afterGenerateEdge(state)).toBe("reflect");
  });
});

describe("routerEdge", () => {
  it("ends when routerDecision is DONE", () => {
    const state = makeState({ curIter: 1, maxIter: 3, routerDecision: "DONE" });
    expect(routerEdge(state)).toBe("__end__");
  });

  it("ends when curIter reaches maxIter regardless of routerDecision", () => {
    const state = makeState({ curIter: 3, maxIter: 3, routerDecision: "REFINE" });
    expect(routerEdge(state)).toBe("__end__");
  });

  it("continues to generate when REFINE and below maxIter", () => {
    const state = makeState({ curIter: 1, maxIter: 3, routerDecision: "REFINE" });
    expect(routerEdge(state)).toBe("generate");
  });
});

describe("generateNode error handling", () => {
  it("propagates an error when the LLM stream call fails", async () => {
    mockStream.mockRejectedValueOnce(new Error("Groq API error"));
    const state = makeState({ curIter: 0 });
    await expect(generateNode(state)).rejects.toThrow("Groq API error");
  });

  it("emits an error event to the SSE callback path via rejection (no silent failure)", async () => {
    mockStream.mockRejectedValueOnce(new Error("network timeout"));
    const emit = vi.fn();
    const state = makeState({ curIter: 0, emit });
    await expect(generateNode(state)).rejects.toThrow("network timeout");
    // generate-start should have fired before the failure, proving it's not silently swallowed
    expect(emit).toHaveBeenCalledWith({ type: "generate-start", iter: 1 });
  });
});

describe("reflectNode error handling and fallback", () => {
  it("propagates an error when the LLM invoke call fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Groq API error"));
    const state = makeState({ lastPost: "a tweet", curIter: 1 });
    await expect(reflectNode(state)).rejects.toThrow("Groq API error");
  });

  it("falls back to a default bullet when the LLM returns no parseable bullets", async () => {
    mockInvoke.mockResolvedValueOnce({ content: "   \n\n   " });
    const emit = vi.fn();
    const state = makeState({ lastPost: "a tweet", curIter: 1, emit });

    const result = await reflectNode(state);

    expect(emit).toHaveBeenCalledWith({
      type: "reflect-bullet",
      iter: 1,
      bullet: "No actionable critique returned.",
    });
    expect(result.messages?.[0].content).toBe("- No actionable critique returned.");
  });

  it("parses well-formed bullets normally", async () => {
    mockInvoke.mockResolvedValueOnce({
      content: "- First point\n- Second point\n- Third point",
    });
    const state = makeState({ lastPost: "a tweet", curIter: 1 });

    const result = await reflectNode(state);

    expect(result.messages?.[0].content).toBe(
      "- First point\n- Second point\n- Third point"
    );
  });
});
