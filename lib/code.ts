const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

export function makeCode(length = CODE_LENGTH): string {
  const chars: string[] = [];
  const maxUnbiased = ALPHABET.length * Math.floor(256 / ALPHABET.length);
  while (chars.length < length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= maxUnbiased) continue;
      chars.push(ALPHABET[byte % ALPHABET.length]!);
      if (chars.length === length) break;
    }
  }
  return chars.join("");
}
