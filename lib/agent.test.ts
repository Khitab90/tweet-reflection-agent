import { describe, it, expect } from "vitest";
import { afterGenerateEdge, routerEdge, State } from "./agent";

// Minimal partial state builder — only the fields these pure routing
// functions read are required.
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
