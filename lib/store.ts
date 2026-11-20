import { createMemoryStore } from "@/lib/memory-store";
import { createUpstashStore } from "@/lib/redis-store";
import type { Store } from "@/lib/types";

const globalStore = globalThis as unknown as { __remiStore?: Store };

let warned = false;

function warnIfMemory(mode: "redis" | "memory") {
  if (mode === "redis" || warned) return;
  warned = true;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Remi waitlist is using in-memory storage. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN so signups persist on Vercel.",
    );
  }
}

export function createStoreFromEnv(): Store {
  if (process.env.WAITLIST_STORE === "memory") {
    warnIfMemory("memory");
    return createMemoryStore();
  }
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) return createUpstashStore(url, token);
  warnIfMemory("memory");
  return createMemoryStore();
}

export function getStore(): Store {
  if (!globalStore.__remiStore) globalStore.__remiStore = createStoreFromEnv();
  return globalStore.__remiStore;
}

export function resetStoreForTests(): Store {
  const store = createMemoryStore();
  globalStore.__remiStore = store;
  return store;
}
