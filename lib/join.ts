import { makeCode } from "@/lib/code";
import { DuplicateCodeError, DuplicateEmailError } from "@/lib/errors";
import { sourceFor } from "@/lib/rank";
import type { JoinInput, JoinResult, SignupRecord, Store } from "@/lib/types";
import { isHoneypotFilled, parseJoinInput } from "@/lib/validate";

const SERVER_ERROR =
  "Something went wrong on our side. Try again in a moment.";

async function present(
  record: SignupRecord,
  store: Store,
  alreadyJoined: boolean,
): Promise<JoinResult> {
  const [position, total] = await Promise.all([
    store.getPosition(record.email),
    store.total(),
  ]);
  if (position === null) {
    return { ok: false, status: 500, error: SERVER_ERROR };
  }
  return {
    ok: true,
    alreadyJoined,
    position,
    total,
    code: record.code,
    referralCount: record.referralCount,
  };
}

export async function joinWaitlist(
  input: JoinInput,
  store: Store,
  options?: { now?: number },
): Promise<JoinResult> {
  if (isHoneypotFilled(input.honeypot)) return { ok: true, quiet: true };

  const parsed = parseJoinInput(input);
  if (!parsed.ok) return parsed;

  const existing = await store.getByEmail(parsed.value.email);
  if (existing) return present(existing, store, true);

  let referrer: SignupRecord | null = null;
  if (parsed.value.ref) {
    const found = await store.getByCode(parsed.value.ref);
    if (found && found.email !== parsed.value.email) referrer = found;
  }

  const createdAt = new Date(options?.now ?? Date.now()).toISOString();
  const draft: Omit<SignupRecord, "code"> = {
    email: parsed.value.email,
    xHandle: parsed.value.xHandle,
    remember: parsed.value.remember,
    referredBy: referrer?.code ?? null,
    referralCount: 0,
    utmSource: parsed.value.utmSource,
    utmCampaign: parsed.value.utmCampaign,
    ref: parsed.value.ref,
    source: sourceFor(parsed.value.utmSource, parsed.value.ref),
    createdAt,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const record: SignupRecord = { ...draft, code: makeCode() };
    try {
      await store.create(record);
      if (referrer) await store.addReferral(referrer.email);
      const saved = await store.getByEmail(record.email);
      if (!saved) return { ok: false, status: 500, error: SERVER_ERROR };
      return present(saved, store, false);
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        const again = await store.getByEmail(record.email);
        if (again) return present(again, store, true);
        return { ok: false, status: 500, error: SERVER_ERROR };
      }
      if (error instanceof DuplicateCodeError) continue;
      throw error;
    }
  }

  return { ok: false, status: 500, error: SERVER_ERROR };
}
