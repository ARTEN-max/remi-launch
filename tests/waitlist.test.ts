import { beforeEach, describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { joinWaitlist } from "@/lib/join";
import { createMemoryStore } from "@/lib/memory-store";
import { rankScore } from "@/lib/rank";
import { createRedisStore } from "@/lib/redis-store";
import type { JoinResult, Store } from "@/lib/types";
import { FakeRedis } from "./fake-redis";

const BASE = Date.parse("2026-11-20T15:00:00.000Z");

function at(seconds: number) {
  return BASE + seconds * 1000;
}

function stores(): [string, () => Store][] {
  return [
    ["memory", () => createMemoryStore()],
    ["redis", () => createRedisStore(new FakeRedis())],
  ];
}

function assertJoined(result: JoinResult): asserts result is Extract<JoinResult, { ok: true; quiet?: false }> {
  expect(result.ok).toBe(true);
  if (!result.ok || result.quiet) throw new Error("expected a real signup");
}

describe.each(stores())("%s store", (_name, makeStore) => {
  let store: Store;

  beforeEach(() => {
    store = makeStore();
  });

  async function join(
    input: Parameters<typeof joinWaitlist>[0],
    now: number,
  ) {
    return joinWaitlist(input, store, { now });
  }

  it("puts the first person at #1 and the next person behind them", async () => {
    const first = await join({ email: "Ada@Example.com" }, at(0));
    const second = await join({ email: "bee@example.com" }, at(1));
    assertJoined(first);
    assertJoined(second);
    expect(first.position).toBe(1);
    expect(first.total).toBe(1);
    expect(first.referralCount).toBe(0);
    expect(first.code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/);
    expect(second.position).toBe(2);
    expect(second.total).toBe(2);
    expect(second.code).not.toBe(first.code);

    const saved = await store.getByEmail("ada@example.com");
    expect(saved?.email).toBe("ada@example.com");
  });

  it("returns the same spot when the same email joins again", async () => {
    const first = await join(
      { email: "ada@example.com", xHandle: "@ada", remember: "the interview" },
      at(0),
    );
    assertJoined(first);
    const again = await join(
      { email: " ADA@example.com ", xHandle: "someoneelse", remember: "overwrite me", ref: first.code },
      at(30),
    );
    assertJoined(again);
    expect(again.alreadyJoined).toBe(true);
    expect(again.code).toBe(first.code);
    expect(again.position).toBe(1);
    expect(again.referralCount).toBe(0);
    expect(await store.total()).toBe(1);
    const saved = await store.getByEmail("ada@example.com");
    expect(saved?.xHandle).toBe("ada");
    expect(saved?.remember).toBe("the interview");
  });

  it("moves someone up for each successful referral and ignores bad or repeat ones", async () => {
    const ada = await join({ email: "ada@example.com", xHandle: "@Ada_Bee" }, at(0));
    const bee = await join({ email: "bee@example.com", utmSource: "Reddit", utmCampaign: "Launch" }, at(1));
    const cy = await join({ email: "cy@example.com" }, at(2));
    assertJoined(ada);
    assertJoined(bee);
    assertJoined(cy);

    const dee = await join({ email: "dee@example.com", ref: cy.code }, at(3));
    assertJoined(dee);
    expect(dee.position).toBe(4);
    expect((await store.getByEmail("cy@example.com"))?.referralCount).toBe(1);
    expect(await store.getPosition("cy@example.com")).toBe(1);
    expect(await store.getPosition("ada@example.com")).toBe(2);
    expect(await store.getPosition("bee@example.com")).toBe(3);

    const eve = await join({ email: "eve@example.com", ref: ada.code.toUpperCase() }, at(4));
    assertJoined(eve);
    expect(await store.getPosition("ada@example.com")).toBe(1);
    expect(await store.getPosition("cy@example.com")).toBe(2);
    expect((await store.getByEmail("ada@example.com"))?.referralCount).toBe(1);

    const fox = await join({ email: "fox@example.com", ref: cy.code }, at(5));
    assertJoined(fox);
    expect((await store.getByEmail("cy@example.com"))?.referralCount).toBe(2);
    expect(await store.getPosition("cy@example.com")).toBe(1);
    expect(await store.getPosition("ada@example.com")).toBe(2);

    const repeat = await join({ email: "dee@example.com", ref: cy.code }, at(6));
    assertJoined(repeat);
    expect(repeat.alreadyJoined).toBe(true);
    expect(repeat.code).toBe(dee.code);
    expect((await store.getByEmail("cy@example.com"))?.referralCount).toBe(2);

    const ghost = await join({ email: "ghost@example.com", ref: "notacode" }, at(7));
    assertJoined(ghost);
    expect((await store.getByEmail("ghost@example.com"))?.referredBy).toBeNull();
    expect((await store.getByEmail("ghost@example.com"))?.source).toBe("referral");
    expect((await store.getByEmail("cy@example.com"))?.referralCount).toBe(2);

    const hal = await join(
      { email: "hal@example.com", ref: cy.code, utmSource: "x", utmCampaign: "thread" },
      at(8),
    );
    assertJoined(hal);
    const halRecord = await store.getByEmail("hal@example.com");
    expect(halRecord?.source).toBe("x");
    expect(halRecord?.utmSource).toBe("x");
    expect(halRecord?.utmCampaign).toBe("thread");
    expect(halRecord?.ref).toBe(cy.code);
    expect(halRecord?.referredBy).toBe(cy.code);
    expect((await store.getByEmail("cy@example.com"))?.referralCount).toBe(3);
    expect((await store.getByEmail("bee@example.com"))?.utmSource).toBe("reddit");
    expect((await store.getByEmail("bee@example.com"))?.source).toBe("reddit");

    const later = await join({ email: "ivy@example.com" }, Date.parse("2026-11-21T01:00:00.000Z"));
    assertJoined(later);

    expect(await store.getPosition("cy@example.com")).toBe(1);
    expect(await store.getPosition("ada@example.com")).toBe(2);
    expect(await store.getPosition("ivy@example.com")).toBe(9);
    expect(await store.total()).toBe(9);

    const stats = await store.stats();
    expect(stats.total).toBe(9);
    expect(stats.signupsPerDay).toEqual([
      { date: "2026-11-20", count: 8 },
      { date: "2026-11-21", count: 1 },
    ]);
    expect(stats.signupsBySource).toEqual([
      { source: "referral", count: 4 },
      { source: "direct", count: 3 },
      { source: "reddit", count: 1 },
      { source: "x", count: 1 },
    ]);
    expect(stats.topReferrers.map((person) => [person.email, person.referralCount, person.position])).toEqual([
      ["cy@example.com", 3, 1],
      ["ada@example.com", 1, 2],
    ]);
    expect(stats.topReferrers[1]?.xHandle).toBe("Ada_Bee");

    const exported = await store.exportSignups(20);
    expect(exported.map((record) => record.email)).toEqual([
      "cy@example.com",
      "ada@example.com",
      "bee@example.com",
      "dee@example.com",
      "eve@example.com",
      "fox@example.com",
      "ghost@example.com",
      "hal@example.com",
      "ivy@example.com",
    ]);
    expect(toCsv(exported).split("\n")[1]?.startsWith("cy@example.com")).toBe(true);
  });

  it("rejects bad input and a filled honeypot without saving anything", async () => {
    expect((await join({ email: "not-an-email" }, at(0))).ok).toBe(false);
    expect((await join({ email: "ada@example.com", xHandle: "has spaces" }, at(1))).ok).toBe(false);
    expect((await join({ email: "ada@example.com", remember: "x".repeat(501) }, at(2))).ok).toBe(false);
    const quiet = await join({ email: "bot@example.com", honeypot: "https://spam.example" }, at(3));
    expect(quiet).toEqual({ ok: true, quiet: true });
    expect(await store.total()).toBe(0);

    const messy = await join(
      { email: "ada@example.com", utmSource: "not a source", ref: "nope" },
      at(4),
    );
    assertJoined(messy);
    const saved = await store.getByEmail("ada@example.com");
    expect(saved?.utmSource).toBeNull();
    expect(saved?.ref).toBeNull();
    expect(saved?.source).toBe("direct");
  });

  it("keeps fifty signups in distinct spots with distinct codes", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const result = await join({ email: `person${i}@example.com` }, at(i));
      assertJoined(result);
      codes.add(result.code);
      expect(result.position).toBe(i + 1);
    }
    expect(codes.size).toBe(50);
    expect(await store.total()).toBe(50);
  });
});

describe("rank score", () => {
  const early = Date.parse("2026-01-01T00:00:00.000Z");
  const late = Date.parse("2030-01-01T00:00:00.000Z");

  it("lets one referral beat any earlier signup, and earlier beat later at the same count", () => {
    expect(rankScore(1, late)).toBeGreaterThan(rankScore(0, early));
    expect(rankScore(0, early)).toBeGreaterThan(rankScore(0, late));
    expect(Number.isSafeInteger(rankScore(5000, early))).toBe(true);
  });
});

describe("csv", () => {
  it("quotes commas and neutralizes formula cells", () => {
    const csv = toCsv([
      {
        email: "ada@example.com",
        xHandle: null,
        remember: 'She said "hi", then left',
        code: "abcd2345",
        referredBy: null,
        referralCount: 0,
        utmSource: null,
        utmCampaign: null,
        ref: null,
        source: "direct",
        createdAt: "2026-11-20T15:00:00.000Z",
      },
      {
        email: "bee@example.com",
        xHandle: null,
        remember: '=HYPERLINK("http://evil")',
        code: "efgh6789",
        referredBy: "abcd2345",
        referralCount: 0,
        utmSource: null,
        utmCampaign: null,
        ref: null,
        source: "direct",
        createdAt: "2026-11-20T15:00:01.000Z",
      },
    ]);
    expect(csv.startsWith("email,x_handle,remember,referral_code,")).toBe(true);
    expect(csv).toContain('"She said ""hi"", then left"');
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(",1,");
    expect(csv).toContain(",2,");
  });
});

describe("redis rate limit", () => {
  it("blocks once the count passes the limit", async () => {
    const store = createRedisStore(new FakeRedis());
    expect((await store.rateLimit("k", 2, 60)).allowed).toBe(true);
    expect((await store.rateLimit("k", 2, 60)).allowed).toBe(true);
    const blocked = await store.rateLimit("k", 2, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("memory rate limit", () => {
  it("blocks inside the window and allows again after it", async () => {
    const store = createMemoryStore();
    const first = await store.rateLimit("ada", 1, 10, 1_000);
    const blocked = await store.rateLimit("ada", 1, 10, 1_500);
    const other = await store.rateLimit("bee", 1, 10, 1_500);
    const later = await store.rateLimit("ada", 1, 10, 12_000);
    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(other.allowed).toBe(true);
    expect(later.allowed).toBe(true);
  });
});
