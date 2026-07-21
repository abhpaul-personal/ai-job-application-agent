// A deliberate stopgap per docs/PRE-DEPLOYMENT-CHECKLIST.md item A1, not a
// production rate-limiting system. Vercel serverless functions are stateless
// across cold starts and don't share memory between concurrent instances, so
// this in-memory state doesn't give a hard guarantee — it catches a
// meaningful share of abuse from a single warm instance, not all of it.
// Replace with a durable store (e.g. Vercel KV) if/when that stops being
// good enough. Until then this protects personal API billing pre-auth,
// which is all it's meant to do.

export interface RateLimitBucket {
  count: number;
  windowStart: number;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export function consume(
  bucket: RateLimitBucket | undefined,
  config: RateLimitConfig,
  now: number,
): { bucket: RateLimitBucket; allowed: boolean } {
  const current =
    bucket && now - bucket.windowStart < config.windowMs
      ? bucket
      : { count: 0, windowStart: now };
  if (current.count >= config.limit) {
    return { bucket: current, allowed: false };
  }
  return { bucket: { count: current.count + 1, windowStart: current.windowStart }, allowed: true };
}

export interface RateLimiter {
  check(ip: string, now?: number): boolean;
}

export function createRateLimiter(
  ipConfig: RateLimitConfig,
  globalConfig: RateLimitConfig,
): RateLimiter {
  const ipBuckets = new Map<string, RateLimitBucket>();
  let globalBucket: RateLimitBucket | undefined;

  return {
    check(ip: string, now: number = Date.now()): boolean {
      const ipResult = consume(ipBuckets.get(ip), ipConfig, now);
      ipBuckets.set(ip, ipResult.bucket);
      if (!ipResult.allowed) return false;

      const globalResult = consume(globalBucket, globalConfig, now);
      globalBucket = globalResult.bucket;
      return globalResult.allowed;
    },
  };
}
