"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { referralPath, shareMessage, sharePayload, smsShareUrl, whatsAppShareUrl, xShareUrl } from "@/lib/share";
import type { FieldName, JoinSuccess } from "@/lib/types";
import { parseJoinInput } from "@/lib/validate";
import { cn } from "cn";

const STORAGE_KEY = "remi-spot";

type Status = "idle" | "loading" | "quiet" | "error";

type CachedSpot = JoinSuccess & { email: string };

function readTracking() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? "",
    utmCampaign: params.get("utm_campaign") ?? "",
    ref: params.get("ref") ?? "",
  };
}

const spotListeners = new Set<() => void>();
let spotRaw: string | null = null;
let spotSnapshot: CachedSpot | null = null;

function emitSpot() {
  for (const listener of spotListeners) listener();
}

function subscribeSpot(listener: () => void) {
  spotListeners.add(listener);
  return () => {
    spotListeners.delete(listener);
  };
}

function readCache(): CachedSpot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === spotRaw) return spotSnapshot;
    spotRaw = raw;
    if (!raw) {
      spotSnapshot = null;
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CachedSpot>;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.code !== "string" ||
      typeof parsed.position !== "number" ||
      typeof parsed.total !== "number" ||
      typeof parsed.referralCount !== "number"
    ) {
      spotSnapshot = null;
      return null;
    }
    spotSnapshot = {
      ok: true,
      alreadyJoined: Boolean(parsed.alreadyJoined),
      email: parsed.email,
      code: parsed.code,
      position: parsed.position,
      total: parsed.total,
      referralCount: parsed.referralCount,
    };
    return spotSnapshot;
  } catch {
    spotRaw = null;
    spotSnapshot = null;
    return null;
  }
}

function writeCache(spot: CachedSpot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spot));
  emitSpot();
}

function clearCache() {
  localStorage.removeItem(STORAGE_KEY);
  emitSpot();
}

function subscribeSearch() {
  return () => {};
}

function readFriendRef() {
  const ref = new URLSearchParams(window.location.search).get("ref")?.trim() ?? "";
  return /^[a-z0-9]{6,16}$/i.test(ref) ? ref : null;
}

async function postSignup(body: Record<string, string>) {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as
    | (JoinSuccess & { error?: string; field?: FieldName; quiet?: boolean })
    | { ok: false; error?: string; field?: FieldName }
    | null;
  return { response, data };
}

export function SignupForm() {
  const emailId = useId();
  const handleId = useId();
  const rememberId = useId();
  const errorId = useId();
  const notePanelId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<FieldName | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [memorySpot, setMemorySpot] = useState<CachedSpot | null>(null);
  const storedSpot = useSyncExternalStore(subscribeSpot, readCache, () => null);
  const spot = storedSpot ?? memorySpot;
  const friendRef = useSyncExternalStore(subscribeSearch, readFriendRef, () => null);
  const skipRefresh = useRef(false);
  const noteVisible = noteOpen || field === "xHandle" || field === "remember";

  useEffect(() => {
    const email = spot?.email;
    if (!email || skipRefresh.current) return;
    let cancelled = false;
    void postSignup({ email, company_website: "" }).then(({ response, data }) => {
      if (cancelled || !response.ok || !data || !("code" in data) || !data.ok || data.quiet) return;
      const next = { ...data, email };
      try {
        writeCache(next);
      } catch {
        setMemorySpot(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [spot?.email]);

  function saveSpot(next: CachedSpot) {
    skipRefresh.current = true;
    try {
      writeCache(next);
      setMemorySpot(null);
    } catch {
      setMemorySpot(next);
    }
  }

  function resetForm() {
    setMemorySpot(null);
    try {
      clearCache();
    } catch {
      // Nothing stored to clear.
    }
    setStatus("idle");
    setError(null);
    setField(null);
    setNoteOpen(false);
  }

  function toggleNote() {
    const visible = noteOpen || field === "xHandle" || field === "remember";
    setNoteOpen(!visible);
    if (field === "xHandle" || field === "remember") {
      setField(null);
      setError(null);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const xHandle = String(form.get("xHandle") ?? "");
    const remember = String(form.get("remember") ?? "");
    const honeypot = String(form.get("company_website") ?? "");
    const tracking = readTracking();

    if (!honeypot.trim()) {
      const parsed = parseJoinInput({
        email,
        xHandle,
        remember,
        utmSource: tracking.utmSource,
        utmCampaign: tracking.utmCampaign,
        ref: tracking.ref,
      });
      if (!parsed.ok) {
        setStatus("error");
        setError(parsed.error);
        setField(parsed.field ?? null);
        return;
      }
    }

    setStatus("loading");
    setError(null);
    setField(null);

    try {
      const { response, data } = await postSignup({
        email,
        xHandle,
        remember,
        company_website: honeypot,
        utmSource: tracking.utmSource,
        utmCampaign: tracking.utmCampaign,
        ref: tracking.ref,
      });
      if (!response.ok || !data || data.ok === false) {
        setStatus("error");
        setError(data && "error" in data && data.error ? data.error : "Something went wrong. Try again in a moment.");
        setField(data && "field" in data ? data.field ?? null : null);
        return;
      }
      if (data.quiet) {
        setStatus("quiet");
        return;
      }
      saveSpot({ ...data, email: email.trim().toLowerCase() });
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div
      id="signup"
      className="scroll-mt-24 rounded-3xl border border-border border-t-4 border-t-primary bg-card p-4 shadow-[0_24px_50px_-28px_rgba(80,40,10,0.55)] sm:p-6"
    >
      {spot ? (
        <SuccessCard spot={spot} onReset={resetForm} />
      ) : status === "quiet" ? (
        <div>
          <h2 className="font-heading text-2xl tracking-tight">You&apos;re on the list.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We&apos;ll write when there&apos;s a spot to talk about. That&apos;s the whole note.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <h2 className="font-heading text-2xl tracking-tight">Get a spot in line</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Early people get in first. You&apos;ll get a link to move up.
          </p>
          {friendRef ? (
            <p className="mt-3 rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground">
              You&apos;re using a friend&apos;s link. They move up when you join.
            </p>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                required
                placeholder="you@example.com"
                aria-invalid={field === "email"}
                aria-describedby={field === "email" ? errorId : undefined}
                className="h-12 px-3 text-base md:text-base"
              />
            </div>
            <button
              type="button"
              className="justify-self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              aria-expanded={noteVisible}
              aria-controls={notePanelId}
              onClick={toggleNote}
            >
              {noteVisible ? "Hide note" : "Add a note…"}
            </button>
            <div id={notePanelId} className={noteVisible ? "grid gap-3" : "hidden"}>
              <div className="grid gap-1.5">
                <Label htmlFor={handleId}>
                  X handle <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id={handleId}
                  name="xHandle"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="@you"
                  maxLength={16}
                  aria-invalid={field === "xHandle"}
                  aria-describedby={field === "xHandle" ? errorId : undefined}
                  className="h-12 px-3 text-base md:text-base"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={rememberId}>
                  What would you want Remi to remember?{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id={rememberId}
                  name="remember"
                  rows={2}
                  maxLength={500}
                  placeholder="My sister's recital is June 14. I have an interview Thursday."
                  aria-invalid={field === "remember"}
                  aria-describedby={field === "remember" ? errorId : undefined}
                  className="min-h-20 px-3 py-3 text-base md:text-base"
                />
              </div>
            </div>
          </div>

          <div className="hp-field" aria-hidden="true">
            <label>
              Website
              <input name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          {error ? (
            <p id={errorId} role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={status === "loading"}
            className="mt-4 h-12 w-full text-base"
          >
            {status === "loading" ? "Saving your spot…" : "Hold my spot"}
          </Button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            No spam. Just a note when Remi is ready. Each friend who joins with your link moves you up.
          </p>
        </form>
      )}
    </div>
  );
}

function SuccessCard({ spot, onReset }: { spot: CachedSpot; onReset: () => void }) {
  const link = `${window.location.origin}${referralPath(spot.code)}`;
  const message = shareMessage(link);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const friends =
    spot.referralCount === 0
      ? "no one has joined with your link yet"
      : spot.referralCount === 1
        ? "1 friend has joined with your link"
        : `${spot.referralCount} friends have joined with your link`;

  async function copyMessage(fromShare = false) {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setShareCopied(fromShare);
      return true;
    } catch {
      setCopied(false);
      setShareCopied(false);
      return false;
    }
  }

  async function share() {
    const payload = sharePayload(link);
    if (canWebShare(payload)) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyMessage(true);
  }

  return (
    <div>
      <p className="text-sm font-medium text-clay">{spot.alreadyJoined ? "Welcome back" : "You're in"}</p>
      <h2 id="your-spot" tabIndex={-1} className="mt-2 font-heading text-6xl tracking-tight">
        #{spot.position}
      </h2>
      <p className="mt-4 text-sm font-medium leading-relaxed">Share your link to move up the list.</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        You&apos;re #{spot.position} of {spot.total}, and {friends}. Each person who joins with it
        moves you ahead of everyone still at zero.
      </p>

      <label className="mt-4 grid gap-1.5 text-sm font-medium" htmlFor="referral-link">
        Your link
        <Input
          id="referral-link"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="h-12 px-3 text-base md:text-base"
        />
      </label>

      <div className="mt-3 grid gap-2">
        <Button type="button" className="h-12 text-base" onClick={() => void share()}>
          {shareCopied ? (
            <>
              <Check /> Copied
            </>
          ) : (
            "Share your link"
          )}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={smsShareUrl(link)}
            aria-label="Text or iMessage"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
          >
            Text
          </a>
          <Button type="button" variant="outline" className="h-11" onClick={() => void copyMessage()}>
            {copied ? (
              <>
                <Check /> Copied
              </>
            ) : (
              "Copy message"
            )}
          </Button>
          <a
            href={xShareUrl(link)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
          >
            Post on X
          </a>
          <a
            href={whatsAppShareUrl(link)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
          >
            WhatsApp
          </a>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Message and referral link copied." : ""}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Use a different email
      </button>
    </div>
  );
}

function canWebShare(data: ShareData): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return true;
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}
