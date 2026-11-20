import { beforeEach, describe, expect, it } from "vitest";
import { GET as exportWaitlist } from "@/app/api/admin/export/route";
import { GET as adminStats } from "@/app/api/admin/stats/route";
import { POST as signup } from "@/app/api/signup/route";
import { IP_LIMIT } from "@/lib/limits";
import { getStore, resetStoreForTests } from "@/lib/store";

function post(body: unknown, init?: { ip?: string; origin?: string; host?: string }) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init?.ip) headers["x-forwarded-for"] = init.ip;
  if (init?.origin) headers.origin = init.origin;
  if (init?.host) headers.host = init.host;
  return signup(
    new Request("http://localhost:3847/api/signup", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function admin(path: string, token?: string) {
  return new Request(`http://localhost:3847${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  process.env.ADMIN_TOKEN = "test-admin-token";
  resetStoreForTests();
});

describe("POST /api/signup", () => {
  it("saves a signup, dedupes it, and counts a referral", async () => {
    const created = await post(
      { email: "Ada@Example.com", xHandle: "@ada", remember: "the interview", utmSource: "x" },
      { ip: "203.0.113.10" },
    );
    expect(created.status).toBe(200);
    const first = await created.json();
    expect(first.ok).toBe(true);
    expect(first.position).toBe(1);
    expect(first.alreadyJoined).toBe(false);

    const again = await post({ email: "ada@example.com" }, { ip: "203.0.113.10" });
    const second = await again.json();
    expect(second.alreadyJoined).toBe(true);
    expect(second.code).toBe(first.code);
    expect(await getStore().total()).toBe(1);

    const friend = await post({ email: "bee@example.com", ref: first.code }, { ip: "203.0.113.11" });
    expect(friend.status).toBe(200);
    const refreshed = await post({ email: "ada@example.com" }, { ip: "203.0.113.10" });
    const spot = await refreshed.json();
    expect(spot.referralCount).toBe(1);
    expect(spot.position).toBe(1);
    expect(await getStore().getPosition("bee@example.com")).toBe(2);
  });

  it("does not store a honeypot submission or a bad email", async () => {
    const bot = await post({ email: "bot@example.com", company_website: "http://spam.test" }, { ip: "203.0.113.20" });
    expect(bot.status).toBe(200);
    expect(await bot.json()).toEqual({ ok: true, quiet: true });
    expect(await getStore().total()).toBe(0);

    const bad = await post({ email: "nope" }, { ip: "203.0.113.21" });
    expect(bad.status).toBe(400);
    const body = await bad.json();
    expect(body.ok).toBe(false);
    expect(body.field).toBe("email");
  });

  it("rejects a cross-site post and rate limits one address", async () => {
    const cross = await post(
      { email: "ada@example.com" },
      { ip: "203.0.113.30", origin: "https://evil.example", host: "localhost:3847" },
    );
    expect(cross.status).toBe(403);

    for (let i = 0; i < 10; i += 1) {
      const response = await post({ email: "ada@example.com" }, { ip: "203.0.113.31" });
      expect(response.status).toBe(200);
    }
    const limited = await post({ email: "ada@example.com" }, { ip: "203.0.113.31" });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("rate limits a single IP across many emails", async () => {
    for (let i = 0; i < IP_LIMIT; i += 1) {
      const response = await post({ email: `person${i}@example.com` }, { ip: "203.0.113.40" });
      expect(response.status).toBe(200);
    }
    const blocked = await post({ email: "overflow@example.com" }, { ip: "203.0.113.40" });
    expect(blocked.status).toBe(429);
    const otherIp = await post({ email: "overflow@example.com" }, { ip: "203.0.113.41" });
    expect(otherIp.status).toBe(200);
  });
});

describe("admin endpoints", () => {
  it("requires the bearer token and returns stats plus a csv export", async () => {
    await post(
      { email: "ada@example.com", remember: 'She said "hi"', utmSource: "reddit" },
      { ip: "203.0.113.50" },
    );

    const missing = await adminStats(admin("/api/admin/stats"));
    expect(missing.status).toBe(401);
    const wrong = await adminStats(admin("/api/admin/stats", "nope"));
    expect(wrong.status).toBe(401);

    const statsResponse = await adminStats(admin("/api/admin/stats", "test-admin-token"));
    expect(statsResponse.status).toBe(200);
    const stats = await statsResponse.json();
    expect(stats.total).toBe(1);
    expect(stats.storage).toBe("memory");
    expect(stats.signupsBySource).toEqual([{ source: "reddit", count: 1 }]);
    expect(stats.signupsPerDay).toHaveLength(1);

    const csvResponse = await exportWaitlist(admin("/api/admin/export", "test-admin-token"));
    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers.get("content-type")).toContain("text/csv");
    expect(csvResponse.headers.get("content-disposition")).toContain("remi-waitlist.csv");
    const csv = await csvResponse.text();
    expect(csv).toContain("ada@example.com");
    expect(csv).toContain('"She said ""hi"""');

    const previous = process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_TOKEN;
    const unconfigured = await adminStats(admin("/api/admin/stats", "test-admin-token"));
    expect(unconfigured.status).toBe(503);
    process.env.ADMIN_TOKEN = previous;
  });
});
