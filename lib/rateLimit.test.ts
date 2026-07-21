import { describe, expect, it } from "vitest";
import { consume, createRateLimiter, type RateLimitConfig } from "./rateLimit";

const config: RateLimitConfig = { limit: 3, windowMs: 1000 };

describe("consume", () => {
  it("allows requests under the limit within the window", () => {
    let bucket = undefined;
    for (let i = 0; i < 3; i++) {
      const result = consume(bucket, config, 0);
      expect(result.allowed).toBe(true);
      bucket = result.bucket;
    }
  });

  it("blocks once the limit is hit within the window", () => {
    let bucket = undefined;
    for (let i = 0; i < 3; i++) {
      bucket = consume(bucket, config, 0).bucket;
    }
    const result = consume(bucket, config, 500);
    expect(result.allowed).toBe(false);
  });

  it("resets once the window has elapsed", () => {
    let bucket = undefined;
    for (let i = 0; i < 3; i++) {
      bucket = consume(bucket, config, 0).bucket;
    }
    const result = consume(bucket, config, 1000);
    expect(result.allowed).toBe(true);
  });
});

describe("createRateLimiter", () => {
  it("enforces the per-IP limit independently per IP", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 }, { limit: 100, windowMs: 1000 });
    expect(limiter.check("1.1.1.1", 0)).toBe(true);
    expect(limiter.check("1.1.1.1", 0)).toBe(true);
    expect(limiter.check("1.1.1.1", 0)).toBe(false); // 1.1.1.1 hit its cap

    expect(limiter.check("2.2.2.2", 0)).toBe(true); // different IP, unaffected
  });

  it("enforces the global limit across all IPs even when individually under the per-IP cap", () => {
    const limiter = createRateLimiter({ limit: 100, windowMs: 1000 }, { limit: 2, windowMs: 1000 });
    expect(limiter.check("1.1.1.1", 0)).toBe(true);
    expect(limiter.check("2.2.2.2", 0)).toBe(true);
    expect(limiter.check("3.3.3.3", 0)).toBe(false); // global cap hit, different IP still blocked
  });

  it("resets both limits after their windows elapse", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 }, { limit: 1, windowMs: 1000 });
    expect(limiter.check("1.1.1.1", 0)).toBe(true);
    expect(limiter.check("1.1.1.1", 0)).toBe(false);
    expect(limiter.check("1.1.1.1", 1000)).toBe(true);
  });
});
