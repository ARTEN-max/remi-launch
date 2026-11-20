import { authorizeAdmin, json } from "@/lib/http";
import { storageMode } from "@/lib/site";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const denied = authorizeAdmin(request);
  if (denied) return denied;

  try {
    const stats = await getStore().stats();
    return json({
      ok: true,
      storage: storageMode(),
      generatedAt: new Date().toISOString(),
      ...stats,
    });
  } catch (error) {
    console.error("admin stats failed", error instanceof Error ? error.name : "unknown");
    return json({ ok: false, error: "Couldn't read the waitlist." }, 500);
  }
}
