import type { JoinFailure, JoinInput, ParsedJoin } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9._:-]+$/;
const REF_PATTERN = /^[a-z0-9]{6,16}$/;
const REMEMBER_MAX = 500;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stripControls(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function cleanToken(value: unknown, max = 64): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length > max) return null;
  if (!TOKEN_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function cleanRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  if (!REF_PATTERN.test(code)) return null;
  return code;
}

function failure(error: string, field?: JoinFailure["field"]): JoinFailure {
  return { ok: false, status: 400, error, field };
}

export function parseJoinInput(input: JoinInput): { ok: true; value: ParsedJoin } | JoinFailure {
  const email = normalizeEmail(asString(input.email));
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return failure("That email doesn't look right.", "email");
  }
  const local = email.split("@")[0] ?? "";
  if (local.length > 64) {
    return failure("That email doesn't look right.", "email");
  }

  const handleRaw = asString(input.xHandle).trim();
  let xHandle: string | null = null;
  if (handleRaw) {
    const handle = handleRaw.replace(/^@+/, "");
    if (!HANDLE_PATTERN.test(handle)) {
      return failure(
        "X handles are letters, numbers, and underscores, up to 15 characters.",
        "xHandle",
      );
    }
    xHandle = handle;
  }

  const rememberRaw = stripControls(asString(input.remember).replace(/\r\n/g, "\n")).trim();
  if (rememberRaw.length > REMEMBER_MAX) {
    return failure("That note is a bit long. Keep it under 500 characters.", "remember");
  }
  const links = rememberRaw.match(/https?:\/\//gi) ?? [];
  if (links.length > 2) {
    return failure("Leave links out of that note. Just the thing you want remembered.", "remember");
  }

  return {
    ok: true,
    value: {
      email,
      xHandle,
      remember: rememberRaw || null,
      utmSource: cleanToken(input.utmSource),
      utmCampaign: cleanToken(input.utmCampaign),
      ref: cleanRef(input.ref),
    },
  };
}

export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}
