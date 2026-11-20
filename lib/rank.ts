/** Each referral adds this much to a sorted-set score, which always beats time. */
export const REF_STRIDE = 10_000_000_000;

/** Seconds ceiling (~year 2096). Earlier signups get a larger time component. */
const TIME_BASE = 4_000_000_000;

export function rankScore(referralCount: number, createdAtMs: number): number {
  const seconds = Math.floor(createdAtMs / 1000);
  const timePart = TIME_BASE - seconds;
  if (!Number.isFinite(timePart) || timePart <= 0 || timePart >= REF_STRIDE) {
    throw new Error("Signup timestamp is outside the supported range.");
  }
  const score = referralCount * REF_STRIDE + timePart;
  if (!Number.isSafeInteger(score)) {
    throw new Error("Rank score is outside the safe integer range.");
  }
  return score;
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function sourceFor(utmSource: string | null, ref: string | null): string {
  if (utmSource) return utmSource;
  if (ref) return "referral";
  return "direct";
}
