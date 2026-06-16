import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit } from "./rateLimit";

// Each test uses a unique key to avoid cross-test pollution of the module-level Map.
let keyCounter = 0;
function uniqueKey() {
  return `test-key-${keyCounter++}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows the first request for a new key", () => {
    const result = checkRateLimit(uniqueKey());
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows up to 5 requests within the window", () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
  });

  it("blocks the 6th request within the window", () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the count after the window expires", () => {
    vi.useFakeTimers();
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit(key).allowed).toBe(true);
  });

  it("tracks independent keys separately", () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    for (let i = 0; i < 5; i++) checkRateLimit(keyA);

    expect(checkRateLimit(keyA).allowed).toBe(false);
    expect(checkRateLimit(keyB).allowed).toBe(true);
  });
});
