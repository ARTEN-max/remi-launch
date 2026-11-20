import type { SignupRecord } from "@/lib/types";

const FORMULA = /^[=+\-@]/;

export function csvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

const COLUMNS = [
  "email",
  "x_handle",
  "remember",
  "referral_code",
  "referred_by",
  "referral_count",
  "position",
  "utm_source",
  "utm_campaign",
  "ref",
  "source",
  "created_at",
] as const;

export function toCsv(records: SignupRecord[]): string {
  const lines = [COLUMNS.join(",")];
  records.forEach((record, index) => {
    lines.push(
      [
        csvCell(record.email),
        csvCell(record.xHandle),
        csvCell(record.remember),
        csvCell(record.code),
        csvCell(record.referredBy),
        csvCell(record.referralCount),
        csvCell(index + 1),
        csvCell(record.utmSource),
        csvCell(record.utmCampaign),
        csvCell(record.ref),
        csvCell(record.source),
        csvCell(record.createdAt),
      ].join(","),
    );
  });
  return `${lines.join("\n")}\n`;
}
