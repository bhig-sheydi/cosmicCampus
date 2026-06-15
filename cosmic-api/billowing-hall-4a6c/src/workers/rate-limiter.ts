export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

export class SlidingWindowRateLimiter {
  constructor(
    private kv: KVNamespace | undefined,
    private window: number,
    private max: number
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / this.window) * this.window;
    const windowKey = `${key}:${windowStart}`;

    if (!this.kv) {
      return { allowed: true, remaining: this.max, resetTime: windowStart + this.window, retryAfter: 0 };
    }

    const current = parseInt((await this.kv.get(windowKey)) || '0');
    const newCount = current + 1;

    if (newCount > this.max) {
      const resetTime = windowStart + this.window;
      return { allowed: false, remaining: 0, resetTime, retryAfter: resetTime - now };
    }

    await this.kv.put(windowKey, String(newCount), { expirationTtl: this.window });

    return { allowed: true, remaining: this.max - newCount, resetTime: windowStart + this.window, retryAfter: 0 };
  }
}