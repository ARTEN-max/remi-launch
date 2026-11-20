import { toCsv } from "@/lib/csv";
import { authorizeAdmin } from "@/lib/http";
import { EXPORT_LIMIT } from "@/lib/limits";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const denied = authorizeAdmin(request);
  if (denied) return denied;

  try {
    const records = await getStore().exportSignups(EXPORT_LIMIT);
    const csv = toCsv(records);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="remi-waitlist.csv"',
        "cache-control": "no-store",
        "x-export-count": String(records.length),
        "x-export-limit": String(EXPORT_LIMIT),
      },
    });
  } catch (error) {
    console.error("admin export failed", error instanceof Error ? error.name : "unknown");
    return Response.json(
      { ok: false, error: "Couldn't export the waitlist." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
