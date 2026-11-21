import { describe, expect, it } from "vitest";
import {
  SHARE_TEXT,
  SHARE_TITLE,
  referralPath,
  shareMessage,
  sharePayload,
  smsShareUrl,
  whatsAppShareUrl,
  xShareUrl,
} from "@/lib/share";

const link = "https://remi.example/?ref=abc123";

describe("share links", () => {
  it("keeps the referral code in the path", () => {
    expect(referralPath("abc123")).toBe("/?ref=abc123");
    expect(referralPath("a b")).toBe("/?ref=a%20b");
  });

  it("builds a message that includes the line and the link", () => {
    const message = shareMessage(link);
    expect(message.startsWith(SHARE_TEXT)).toBe(true);
    expect(message.endsWith(link)).toBe(true);
    expect(message).not.toBe(link);
  });

  it("puts the link in the web share url field, not the text", () => {
    expect(sharePayload(link)).toEqual({
      title: SHARE_TITLE,
      text: SHARE_TEXT,
      url: link,
    });
  });

  it("opens a text, a WhatsApp chat, and an X post with that message", () => {
    const message = shareMessage(link);
    expect(smsShareUrl(link)).toBe(`sms:?&body=${encodeURIComponent(message)}`);
    expect(whatsAppShareUrl(link)).toBe(`https://wa.me/?text=${encodeURIComponent(message)}`);

    const tweet = new URL(xShareUrl(link));
    expect(`${tweet.origin}${tweet.pathname}`).toBe("https://x.com/intent/tweet");
    expect(tweet.searchParams.get("text")).toBe(SHARE_TEXT);
    expect(tweet.searchParams.get("url")).toBe(link);
  });
});
