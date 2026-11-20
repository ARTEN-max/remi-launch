import type { RedisLike, RedisPipeline } from "@/lib/redis-store";

type Hash = Map<string, string>;
type ZMember = { member: string; score: number };

export class FakeRedis implements RedisLike {
  private hashes = new Map<string, Hash>();
  private strings = new Map<string, string>();
  private zsets = new Map<string, Map<string, number>>();
  private expiries = new Map<string, number>();

  private hash(key: string): Hash {
    let hash = this.hashes.get(key);
    if (!hash) {
      hash = new Map();
      this.hashes.set(key, hash);
    }
    return hash;
  }

  private sorted(key: string): ZMember[] {
    const set = this.zsets.get(key);
    if (!set) return [];
    return [...set.entries()]
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => b.score - a.score || (a.member < b.member ? -1 : a.member > b.member ? 1 : 0));
  }

  async hset(key: string, kv: Record<string, string>) {
    const hash = this.hash(key);
    let added = 0;
    for (const [field, value] of Object.entries(kv)) {
      if (!hash.has(field)) added += 1;
      hash.set(field, value);
    }
    return added;
  }

  async hsetnx(key: string, field: string, value: string) {
    const hash = this.hash(key);
    if (hash.has(field)) return 0;
    hash.set(field, value);
    return 1;
  }

  async hgetall(key: string) {
    const hash = this.hashes.get(key);
    if (!hash || hash.size === 0) return null;
    return Object.fromEntries(hash.entries());
  }

  async hincrby(key: string, field: string, increment: number) {
    const hash = this.hash(key);
    const next = Number(hash.get(field) ?? 0) + increment;
    hash.set(field, String(next));
    return next;
  }

  async set(key: string, value: string, opts?: { nx: true }) {
    if (opts?.nx && this.strings.has(key)) return null;
    this.strings.set(key, value);
    return "OK" as const;
  }

  async get(key: string) {
    return this.strings.get(key) ?? null;
  }

  async del(key: string) {
    return this.strings.delete(key) ? 1 : 0;
  }

  async zadd(key: string, item: { score: number; member: string }) {
    let set = this.zsets.get(key);
    if (!set) {
      set = new Map();
      this.zsets.set(key, set);
    }
    const existed = set.has(item.member);
    set.set(item.member, item.score);
    return existed ? 0 : 1;
  }

  async zincrby(key: string, increment: number, member: string) {
    let set = this.zsets.get(key);
    if (!set) {
      set = new Map();
      this.zsets.set(key, set);
    }
    const next = (set.get(member) ?? 0) + increment;
    set.set(member, next);
    return next;
  }

  async zrevrank(key: string, member: string) {
    const index = this.sorted(key).findIndex((item) => item.member === member);
    return index === -1 ? null : index;
  }

  async zcard(key: string) {
    return this.zsets.get(key)?.size ?? 0;
  }

  async zrange(key: string, start: number, stop: number) {
    const members = this.sorted(key);
    const size = members.length;
    if (size === 0) return [];
    const from = start < 0 ? Math.max(0, size + start) : start;
    const to = stop < 0 ? size + stop : stop;
    if (from >= size || from > to) return [];
    return members.slice(from, to + 1).map((item) => item.member);
  }

  async incr(key: string) {
    const next = Number(this.strings.get(key) ?? 0) + 1;
    this.strings.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number) {
    const exists = this.strings.has(key) || this.hashes.has(key) || this.zsets.has(key);
    if (!exists) return 0;
    this.expiries.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key: string) {
    const exists = this.strings.has(key) || this.hashes.has(key) || this.zsets.has(key);
    if (!exists) return -2;
    const expiry = this.expiries.get(key);
    if (!expiry) return -1;
    return Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
  }

  pipeline(): RedisPipeline {
    const jobs: Array<() => Promise<unknown>> = [];
    const api: RedisPipeline = {
      hset: (key, kv) => {
        jobs.push(() => this.hset(key, kv));
        return api;
      },
      hincrby: (key, field, increment) => {
        jobs.push(() => this.hincrby(key, field, increment));
        return api;
      },
      hgetall: (key) => {
        jobs.push(() => this.hgetall(key));
        return api;
      },
      zadd: (key, item) => {
        jobs.push(() => this.zadd(key, item));
        return api;
      },
      zincrby: (key, increment, member) => {
        jobs.push(() => this.zincrby(key, increment, member));
        return api;
      },
      exec: async () => {
        const results: unknown[] = [];
        for (const job of jobs) results.push(await job());
        return results;
      },
    };
    return api;
  }
}
