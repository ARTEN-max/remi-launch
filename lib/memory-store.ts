import { DuplicateCodeError, DuplicateEmailError } from "@/lib/errors";
import { dayKey, rankScore } from "@/lib/rank";
import type {
  RateLimitResult,
  SignupRecord,
  Store,
  WaitlistStats,
} from "@/lib/types";

type Bucket = { count: number; resetAt: number };

export function createMemoryStore(): Store {
  const byEmail = new Map<string, SignupRecord>();
  const byCode = new Map<string, string>();
  const buckets = new Map<string, Bucket>();

  function ranked(): SignupRecord[] {
    return [...byEmail.values()].sort((a, b) => {
      const diff =
        rankScore(b.referralCount, Date.parse(b.createdAt)) -
        rankScore(a.referralCount, Date.parse(a.createdAt));
      if (diff !== 0) return diff;
      if (a.email < b.email) return -1;
      if (a.email > b.email) return 1;
      return 0;
    });
  }

  function statsFrom(records: SignupRecord[]): WaitlistStats {
    const days = new Map<string, number>();
    const sources = new Map<string, number>();
    for (const record of records) {
      const day = dayKey(record.createdAt);
      days.set(day, (days.get(day) ?? 0) + 1);
      sources.set(record.source, (sources.get(record.source) ?? 0) + 1);
    }
    return {
      total: records.length,
      signupsPerDay: [...days.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
      signupsBySource: [...sources.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count || (a.source < b.source ? -1 : a.source > b.source ? 1 : 0)),
      topReferrers: records
        .map((record, index) => ({ record, position: index + 1 }))
        .filter(({ record }) => record.referralCount > 0)
        .slice(0, 10)
        .map(({ record, position }) => ({
          email: record.email,
          code: record.code,
          xHandle: record.xHandle,
          referralCount: record.referralCount,
          position,
        })),
    };
  }

  return {
    async getByEmail(email) {
      const record = byEmail.get(email);
      return record ? { ...record } : null;
    },
    async getByCode(code) {
      const email = byCode.get(code);
      if (!email) return null;
      const record = byEmail.get(email);
      return record ? { ...record } : null;
    },
    async create(record) {
      if (byEmail.has(record.email)) throw new DuplicateEmailError();
      if (byCode.has(record.code)) throw new DuplicateCodeError();
      const stored = { ...record, referralCount: 0 };
      byEmail.set(stored.email, stored);
      byCode.set(stored.code, stored.email);
    },
    async addReferral(email) {
      const record = byEmail.get(email);
      if (!record) throw new Error("Referrer was not found.");
      record.referralCount += 1;
    },
    async getPosition(email) {
      const index = ranked().findIndex((record) => record.email === email);
      return index === -1 ? null : index + 1;
    },
    async total() {
      return byEmail.size;
    },
    async stats() {
      return statsFrom(ranked());
    },
    async exportSignups(limit) {
      return ranked()
        .slice(0, limit)
        .map((record) => ({ ...record }));
    },
    async rateLimit(key, limit, windowSec, now = Date.now()): Promise<RateLimitResult> {
      const existing = buckets.get(key);
      if (!existing || now >= existing.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
        return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSec: windowSec };
      }
      existing.count += 1;
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      if (existing.count > limit) {
        return { allowed: false, remaining: 0, retryAfterSec };
      }
      return {
        allowed: true,
        remaining: Math.max(0, limit - existing.count),
        retryAfterSec,
      };
    },
  };
}
