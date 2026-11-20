import { timingSafeEqual } from "node:crypto";

export function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function authorizeAdmin(request: Request): Response | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return json({ ok: false, error: "Admin token is not configured." }, 503);
  }
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/.exec(header);
  const presented = match?.[1] ?? "";
  if (!safeEqual(presented, token)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  return null;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
