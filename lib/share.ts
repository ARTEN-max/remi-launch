export const SHARE_TEXT =
  "Most AI forgets you the second you open a new chat. Remi remembers you for years. I just saved a spot.";

export function referralPath(code: string): string {
  return `/?ref=${encodeURIComponent(code)}`;
}

export function xShareUrl(link: string): string {
  const params = new URLSearchParams({ text: SHARE_TEXT, url: link });
  return `https://x.com/intent/tweet?${params.toString()}`;
}

export function whatsAppShareUrl(link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${link}`)}`;
}
