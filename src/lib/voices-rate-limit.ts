import "server-only";

type LimiterBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, LimiterBucket>();

export type LimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Sliding-window rate limit. Each `key` is allowed `max` events per
 * `windowMs`. Internal map auto-prunes when oversized.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): LimitDecision {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });

    if (buckets.size > 2048) {
      for (const [k, b] of buckets.entries()) {
        if (b.resetAt < now) buckets.delete(k);
      }
    }

    return { allowed: true, remaining: max - 1 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.round((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count };
}
