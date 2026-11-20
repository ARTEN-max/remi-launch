export type SignupRecord = {
  email: string;
  xHandle: string | null;
  remember: string | null;
  code: string;
  referredBy: string | null;
  referralCount: number;
  utmSource: string | null;
  utmCampaign: string | null;
  ref: string | null;
  source: string;
  createdAt: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export type TopReferrer = {
  email: string;
  code: string;
  xHandle: string | null;
  referralCount: number;
  position: number;
};

export type WaitlistStats = {
  total: number;
  signupsPerDay: { date: string; count: number }[];
  signupsBySource: { source: string; count: number }[];
  topReferrers: TopReferrer[];
};

export type FieldName = "email" | "xHandle" | "remember";

export type JoinInput = {
  email?: unknown;
  xHandle?: unknown;
  remember?: unknown;
  honeypot?: unknown;
  utmSource?: unknown;
  utmCampaign?: unknown;
  ref?: unknown;
};

export type ParsedJoin = {
  email: string;
  xHandle: string | null;
  remember: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  ref: string | null;
};

export type JoinFailure = {
  ok: false;
  status: number;
  error: string;
  field?: FieldName;
};

export type JoinSuccess = {
  ok: true;
  quiet?: false;
  alreadyJoined: boolean;
  position: number;
  total: number;
  code: string;
  referralCount: number;
};

export type QuietSuccess = {
  ok: true;
  quiet: true;
};

export type JoinResult = JoinSuccess | QuietSuccess | JoinFailure;

export interface Store {
  getByEmail(email: string): Promise<SignupRecord | null>;
  getByCode(code: string): Promise<SignupRecord | null>;
  create(record: SignupRecord): Promise<void>;
  addReferral(email: string): Promise<void>;
  getPosition(email: string): Promise<number | null>;
  total(): Promise<number>;
  stats(): Promise<WaitlistStats>;
  exportSignups(limit: number): Promise<SignupRecord[]>;
  rateLimit(
    key: string,
    limit: number,
    windowSec: number,
    now?: number,
  ): Promise<RateLimitResult>;
}
