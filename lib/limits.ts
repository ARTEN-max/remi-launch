import { createHash } from "node:crypto";

export const IP_LIMIT = 30;
export const IP_WINDOW_SEC = 10 * 60;
export const EMAIL_LIMIT = 10;
export const EMAIL_WINDOW_SEC = 60 * 60;
export const EXPORT_LIMIT = 20_000;

export const RATE_LIMIT_MESSAGE = "Too many tries. Give it a minute and come back.";

export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
