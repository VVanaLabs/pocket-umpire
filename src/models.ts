// SAM 3.1 + Spark live calls — Meta ecosystem only, one baseURL.
// shortcut: SAM video-mode request shape is provisional until spike M2
// confirms it against api.meta.ai; image-mode keyframes are the fallback.
import { meta, withResilience } from "./meta.js";
import { SAM_MODEL, SPARK_MODEL } from "./config.js";

export async function spikeModelsList(): Promise<string[]> {
  const r = await withResilience(() => meta().models.list());
  if (!r.ok) throw new Error(`models.list failed: ${r.error}`);
  return (r.value.data as { id: string }[]).map((m) => m.id);
}

export async function sparkSmoke(prompt = 'Reply with the single word "ok".'): Promise<string> {
  const r = await withResilience(() =>
    meta().responses.create({
      model: SPARK_MODEL,
      input: prompt,
      reasoning: { effort: "low" },
      max_output_tokens: 512,
    } as never),
  );
  if (!r.ok) throw new Error(`spark smoke failed: ${r.error}`);
  const v = r.value as { output_text?: string };
  return v.output_text ?? JSON.stringify(v).slice(0, 200);
}

/** Marginal-case arbiter: 2–3 annotated evidence frames + one line question. */
export async function sparkArbiter(question: string): Promise<string> {
  const r = await withResilience(() =>
    meta().responses.create({
      model: SPARK_MODEL,
      input: `You are a cricket umpire reviewing a calibrated frame. ${question} Answer with one word: PASS, FAIL, or UNCLEAR.`,
      reasoning: { effort: "low" },
      max_output_tokens: 512,
    } as never),
  );
  if (!r.ok) return "UNCLEAR (arbiter unreachable — code verdict stands)";
  const v = r.value as { output_text?: string };
  return v.output_text?.trim() ?? "UNCLEAR";
}

export function samModelId(): string {
  return SAM_MODEL;
}
