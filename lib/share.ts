export const SHARE_TITLE = "Remi";

export const SHARE_TEXT =
  "Most AI forgets you the second you open a new chat. Remi remembers you for years. I just saved a spot.";

export function referralPath(code: string): string {
  return `/?ref=${encodeURIComponent(code)}`;
}

/** Ready-to-send text: the line plus the personal referral link. */
export function shareMessage(link: string): string {
  return `${SHARE_TEXT} ${link}`;
}

/** Web Share payload. The link stays in `url` so a platform does not paste it twice. */
export function sharePayload(link: string): { title: string; text: string; url: string } {
  return { title: SHARE_TITLE, text: SHARE_TEXT, url: link };
}

export function xShareUrl(link: string): string {
  const params = new URLSearchParams({ text: SHARE_TEXT, url: link });
  return `https://x.com/intent/tweet?${params.toString()}`;
}

export function whatsAppShareUrl(link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareMessage(link))}`;
}

/**
 * Opens Messages (iMessage on Apple, SMS elsewhere) with the message filled in.
 * `?&body` is the no-recipient form both platforms prefill.
 */
export function smsShareUrl(link: string): string {
  return `sms:?&body=${encodeURIComponent(shareMessage(link))}`;
}
