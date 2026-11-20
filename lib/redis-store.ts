import { Redis } from "@upstash/redis";
import { DuplicateCodeError, DuplicateEmailError } from "@/lib/errors";
import { REF_STRIDE, dayKey, rankScore } from "@/lib/rank";
import type {
  RateLimitResult,
  SignupRecord,
  Store,
  WaitlistStats,
} from "@/lib/types";

const RANK_KEY = "remi:rank";
const DAYS_KEY = "remi:stats:days";
const SOURCES_KEY = "remi:stats:sources";

export interface RedisPipeline {
  hset(key: string, kv: Record<string, string>): RedisPipeline;
  hincrby(key: string, field: string, increment: number): RedisPipeline;
  hgetall(key: string): RedisPipeline;
  zadd(key: string, item: { score: number; member: string }): RedisPipeline;
  zincrby(key: string, increment: number, member: string): RedisPipeline;
  exec(): Promise<unknown[]>;
}

export interface RedisLike {
  hset(key: string, kv: Record<string, string>): Promise<number>;
  hsetnx(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  set(key: string, value: string, opts?: { nx: true }): Promise<"OK" | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  zadd(key: string, item: { score: number; member: string }): Promise<number | null>;
  zincrby(key: string, increment: number, member: string): Promise<number>;
  zrevrank(key: string, member: string): Promise<number | null>;
  zcard(key: string): Promise<number>;
  zrange(key: string, start: number, stop: number, opts?: { rev: boolean }): Promise<string[]>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  pipeline(): RedisPipeline;
}

function signupKey(email: string): string {
  return `remi:signup:${email}`;
}

function codeKey(code: string): string {
  return `remi:code:${code}`;
}

function emptyToNull(value: string | undefined): string | null {
  return value ? value : null;
}

function hashFromRecord(record: SignupRecord): Record<string, string> {
  return {
    email: record.email,
    xHandle: record.xHandle ?? "",
    remember: record.remember ?? "",
    code: record.code,
    referredBy: record.referredBy ?? "",
    referralCount: String(record.referralCount),
    utmSource: record.utmSource ?? "",
    utmCampaign: record.utmCampaign ?? "",
    ref: record.ref ?? "",
    source: record.source,
    createdAt: record.createdAt,
  };
}

function recordFromHash(hash: Record<string, string>): SignupRecord | null {
  if (!hash.email || !hash.code || !hash.createdAt) return null;
  const referralCount = Number(hash.referralCount ?? 0);
  return {
    email: hash.email,
    xHandle: emptyToNull(hash.xHandle),
    remember: emptyToNull(hash.remember),
    code: hash.code,
    referredBy: emptyToNull(hash.referredBy),
    referralCount: Number.isFinite(referralCount) ? referralCount : 0,
    utmSource: emptyToNull(hash.utmSource),
    utmCampaign: emptyToNull(hash.utmCampaign),
    ref: emptyToNull(hash.ref),
    source: hash.source || "direct",
    createdAt: hash.createdAt,
  };
}

function normalizeHash(raw: unknown): Record<string, string> | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const record: Record<string, string> = {};
    for (let i = 0; i < raw.length; i += 2) {
      record[String(raw[i])] = raw[i + 1] == null ? "" : String(raw[i + 1]);
    }
    return record;
  }
  if (typeof raw === "object") {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      record[key] = value == null ? "" : String(value);
    }
    return Object.keys(record).length > 0 ? record : null;
  }
  return null;
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function counterRows(hash: Record<string, string> | null): { key: string; count: number }[] {
  if (!hash) return [];
  return Object.entries(hash)
    .map(([key, value]) => ({ key, count: asNumber(value) }))
    .filter((row) => row.count > 0);
}

export function adaptUpstash(client: Redis): RedisLike {
  return {
    hset: (key, kv) => client.hset(key, kv),
    hsetnx: (key, field, value) => client.hsetnx(key, field, value),
    async hgetall(key) {
      const raw = await client.hgetall<Record<string, unknown>>(key);
      return normalizeHash(raw);
    },
    hincrby: async (key, field, increment) => asNumber(await client.hincrby(key, field, increment)),
    async set(key, value, opts) {
      const result = await client.set(key, value, opts?.nx ? { nx: true } : undefined);
      return result === "OK" ? "OK" : null;
    },
    async get(key) {
      const value = await client.get<unknown>(key);
      if (value === null || value === undefined) return null;
      return String(value);
    },
    del: (key) => client.del(key),
    zadd: (key, item) => client.zadd(key, item),
    zincrby: (key, increment, member) => client.zincrby(key, increment, member),
    async zrevrank(key, member) {
      const rank = await client.zrevrank(key, member);
      return rank === null || rank === undefined ? null : asNumber(rank);
    },
    zcard: async (key) => asNumber(await client.zcard(key)),
    async zrange(key, start, stop, opts) {
      const raw = await client.zrange<string[]>(key, start, stop, opts?.rev ? { rev: true } : undefined);
      return Array.isArray(raw) ? raw.map((item) => String(item)) : [];
    },
    incr: async (key) => asNumber(await client.incr(key)),
    expire: async (key, seconds) => asNumber(await client.expire(key, seconds)),
    ttl: async (key) => asNumber(await client.ttl(key)),
    pipeline() {
      const pipe = client.pipeline();
      const api: RedisPipeline = {
        hset(key, kv) {
          pipe.hset(key, kv);
          return api;
        },
        hincrby(key, field, increment) {
          pipe.hincrby(key, field, increment);
          return api;
        },
        hgetall(key) {
          pipe.hgetall(key);
          return api;
        },
        zadd(key, item) {
          pipe.zadd(key, item);
          return api;
        },
        zincrby(key, increment, member) {
          pipe.zincrby(key, increment, member);
          return api;
        },
        async exec() {
          const result = await pipe.exec();
          return Array.isArray(result) ? result : [];
        },
      };
      return api;
    },
  };
}

export function createRedisStore(redis: RedisLike): Store {
  async function readEmail(email: string): Promise<SignupRecord | null> {
    const hash = await redis.hgetall(signupKey(email));
    if (!hash) return null;
    return recordFromHash(hash);
  }

  return {
    getByEmail: readEmail,
    async getByCode(code) {
      const email = await redis.get(codeKey(code));
      if (!email) return null;
      return readEmail(email);
    },
    async create(record) {
      const reserved = await redis.set(codeKey(record.code), record.email, { nx: true });
      if (reserved !== "OK") throw new DuplicateCodeError();

      const emailSet = await redis.hsetnx(signupKey(record.email), "email", record.email);
      if (emailSet === 0) {
        await redis.del(codeKey(record.code));
        throw new DuplicateEmailError();
      }

      const createdAtMs = Date.parse(record.createdAt);
      await redis.pipeline()
        .hset(signupKey(record.email), hashFromRecord({ ...record, referralCount: 0 }))
        .zadd(RANK_KEY, { score: rankScore(0, createdAtMs), member: record.email })
        .hincrby(DAYS_KEY, dayKey(record.createdAt), 1)
        .hincrby(SOURCES_KEY, record.source, 1)
        .exec();
    },
    async addReferral(email) {
      await redis
        .pipeline()
        .hincrby(signupKey(email), "referralCount", 1)
        .zincrby(RANK_KEY, REF_STRIDE, email)
        .exec();
    },
    async getPosition(email) {
      const rank = await redis.zrevrank(RANK_KEY, email);
      return rank === null ? null : rank + 1;
    },
    async total() {
      return redis.zcard(RANK_KEY);
    },
    async stats() {
      const [total, days, sources, emails] = await Promise.all([
        redis.zcard(RANK_KEY),
        redis.hgetall(DAYS_KEY),
        redis.hgetall(SOURCES_KEY),
        redis.zrange(RANK_KEY, 0, 49, { rev: true }),
      ]);
      const topRecords = await Promise.all(emails.map((email) => readEmail(email)));
      const topReferrers = topRecords
        .map((record, index) => ({ record, position: index + 1 }))
        .filter(
          (entry): entry is { record: SignupRecord; position: number } =>
            entry.record !== null && entry.record.referralCount > 0,
        )
        .slice(0, 10)
        .map(({ record, position }) => ({
          email: record.email,
          code: record.code,
          xHandle: record.xHandle,
          referralCount: record.referralCount,
          position,
        }));

      return {
        total,
        signupsPerDay: counterRows(days)
          .map(({ key, count }) => ({ date: key, count }))
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
        signupsBySource: counterRows(sources)
          .map(({ key, count }) => ({ source: key, count }))
          .sort((a, b) => b.count - a.count || (a.source < b.source ? -1 : a.source > b.source ? 1 : 0)),
        topReferrers,
      } satisfies WaitlistStats;
    },
    async exportSignups(limit) {
      const emails = await redis.zrange(RANK_KEY, 0, Math.max(0, limit) - 1, { rev: true });
      if (emails.length === 0) return [];
      const pipe = redis.pipeline();
      for (const email of emails) pipe.hgetall(signupKey(email));
      const raw = await pipe.exec();
      return raw
        .map((item) => {
          const hash = normalizeHash(item);
          return hash ? recordFromHash(hash) : null;
        })
        .filter((record): record is SignupRecord => record !== null);
    },
    async rateLimit(key, limit, windowSec): Promise<RateLimitResult> {
      const redisKey = `remi:rl:${key}`;
      const count = await redis.incr(redisKey);
      let ttl = await redis.ttl(redisKey);
      if (count === 1 || ttl < 0) {
        await redis.expire(redisKey, windowSec);
        ttl = windowSec;
      }
      const retryAfterSec = Math.max(1, ttl);
      if (count > limit) return { allowed: false, remaining: 0, retryAfterSec };
      return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSec };
    },
  };
}

export function createUpstashStore(url: string, token: string): Store {
  const client = new Redis({
    url,
    token,
    automaticDeserialization: false,
  });
  return createRedisStore(adaptUpstash(client));
}
