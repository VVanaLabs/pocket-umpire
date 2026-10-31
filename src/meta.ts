import OpenAI from "openai";
import { META_BASE_URL, metaApiKey } from "./config.js";

let _client: OpenAI | null = null;

/** Single shared client for the whole Meta ecosystem (SAM + Spark, one API). */
export function meta(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: META_BASE_URL,
      apiKey: metaApiKey(),
    });
  }
  return _client;
}

/** timeout + 1 retry; on failure the caller degrades to "no call", never throws to the demo. */
export async function withResilience<T>(
  fn: () => Promise<T>,
  timeoutMs = 30_000,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const value = await withTimeout(fn(), timeoutMs);
      return { ok: true, value };
    } catch (e) {
      if (attempt === 1)
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { ok: false, error: "unreachable" };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>(
    (_, rej) => (t = setTimeout(() => rej(new Error(`timeout after ${ms}ms`)), ms)),
  );
  return Promise.race([p, timeout]).finally(() => clearTimeout(t!));
}
