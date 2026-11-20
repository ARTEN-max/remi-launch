import { joinWaitlist } from "@/lib/join";
import {
  EMAIL_LIMIT,
  EMAIL_WINDOW_SEC,
  IP_LIMIT,
  IP_WINDOW_SEC,
  RATE_LIMIT_MESSAGE,
  digest,
} from "@/lib/limits";
import { clientIp, json, sameOrigin } from "@/lib/http";
import { getStore } from "@/lib/store";
import type { JoinInput } from "@/lib/types";
import { isHoneypotFilled, parseJoinInput } from "@/lib/validate";

function readInput(body: unknown): JoinInput {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  return {
    email: record.email,
    xHandle: record.xHandle,
    remember: record.remember,
    honeypot: record.company_website,
    utmSource: record.utmSource,
    utmCampaign: record.utmCampaign,
    ref: record.ref,
  };
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return json({ ok: false, error: "That request came from somewhere else." }, 403);
  }

  const store = getStore();
  const ipLimit = await store.rateLimit(
    `ip:${digest(clientIp(request))}`,
    IP_LIMIT,
    IP_WINDOW_SEC,
  );
  if (!ipLimit.allowed) {
    return json({ ok: false, error: RATE_LIMIT_MESSAGE }, 429, {
      "retry-after": String(ipLimit.retryAfterSec),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Send that as JSON." }, 400);
  }

  const input = readInput(body);
  if (!isHoneypotFilled(input.honeypot)) {
    const parsed = parseJoinInput(input);
    if (!parsed.ok) return json(parsed, parsed.status);
    const emailLimit = await store.rateLimit(
      `email:${digest(parsed.value.email)}`,
      EMAIL_LIMIT,
      EMAIL_WINDOW_SEC,
    );
    if (!emailLimit.allowed) {
      return json({ ok: false, error: RATE_LIMIT_MESSAGE }, 429, {
        "retry-after": String(emailLimit.retryAfterSec),
      });
    }
  }

  try {
    const result = await joinWaitlist(input, store);
    if (!result.ok) return json(result, result.status);
    return json(result);
  } catch (error) {
    console.error("signup failed", error instanceof Error ? error.name : "unknown");
    return json(
      { ok: false, error: "Something went wrong on our side. Try again in a moment." },
      500,
    );
  }
}
