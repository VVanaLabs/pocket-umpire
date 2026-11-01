// One-command match analysis (v2 path): per ball, SAM 3.1 image wicket check
// on the contact still + Muse Spark contributor verdict on contact+end stills.
// Geometry/rules arbitrate only where a calibrated angle exists (see rules.ts);
// from a single behind-stumps angle the verdict is perceptual, always "legal".
import { readFileSync, writeFileSync } from "node:fs";
import { meta, withResilience } from "./meta.js";
import { SAM_MODEL, SPARK_DEV_MODEL } from "./config.js";
import { applyBall, freshScore, oversBowled, type MatchScore } from "./score.js";

export interface BallInput {
  delivery_id: string;
  contact: string; // contact-still path
  end: string; // end-still path (+~2.5s)
  audio_snr_db?: number;
  label_runs?: number; // ground truth, when labeled
}

export interface BallResult {
  delivery_id: string;
  sam_boxes: number;
  sam_s: number;
  spark_s: number;
  input_tokens: number;
  output_tokens: number;
  verdict: { decision: string; runs: number; wicket: boolean; boundary: boolean; one_line: string } | null;
  label_runs?: number;
  match?: boolean;
}

const img = (p: string) =>
  "data:image/jpeg;base64," + readFileSync(p).toString("base64");

export async function analyzeBall(b: BallInput): Promise<BallResult> {
  const t0 = Date.now();
  const sam = await withResilience(() =>
    meta().responses.create({
      model: SAM_MODEL,
      input: [{ role: "user", content: [
        { type: "input_text", text: "wicket" },
        { type: "input_image", image_url: img(b.contact) },
      ] }],
      metadata: { mask_encoding: "one_bit" },
    } as never),
  );
  const sam_s = (Date.now() - t0) / 1000;
  const samText = sam.ok ? ((sam.value as { output_text?: string }).output_text ?? "") : "";
  const boxes = (samText.match(/\|box/g) || []).length;

  const t1 = Date.now();
  let verdict: BallResult["verdict"] = null, inTok = 0, outTok = 0;
  for (let a = 0; a < 2 && !verdict; a++) {
    const r = await withResilience(() =>
      meta().responses.create({
        model: SPARK_DEV_MODEL,
        input: [{ role: "user", content: [
          { type: "input_text", text: `You are a cricket umpire reviewing one delivery from a fixed match camera behind the stumps. Two frames: CONTACT (bat-ball moment) and END (+2.5s). SAM image check: wicket boxes=${boxes} on contact frame; stumps intact = not bowled. Bat-ball audio crack SNR ${b.audio_snr_db ?? "?"}dB over ambient. Judge ONLY what you see: reply ONLY JSON {"decision":"legal","runs":0-6,"wicket":false,"boundary":false,"one_line":"<20 words"}. Runs: both batters mid-pitch sprinting=2; batter watching ball sail + static field=6; everyone static=0. Boundary only if fielders make no play. No guessing no-ball/wide from this angle — always legal.` },
          { type: "input_image", image_url: img(b.contact) },
          { type: "input_image", image_url: img(b.end) },
        ] }],
        reasoning: { effort: "low" },
        max_output_tokens: 1024,
      } as never),
    );
    if (!r.ok) continue;
    const v = r.value as { output_text?: string; usage?: { input_tokens: number; output_tokens: number } };
    inTok = v.usage?.input_tokens ?? 0;
    outTok = v.usage?.output_tokens ?? 0;
    const m = (v.output_text || "").match(/\{[\s\S]*\}/);
    if (m) { try { verdict = JSON.parse(m[0]); } catch { /* retry once */ } }
  }
  const spark_s = (Date.now() - t1) / 1000;
  return {
    delivery_id: b.delivery_id, sam_boxes: boxes,
    sam_s: +sam_s.toFixed(1), spark_s: +spark_s.toFixed(1),
    input_tokens: inTok, output_tokens: outTok, verdict,
    ...(b.label_runs !== undefined
      ? { label_runs: b.label_runs, match: !!verdict && verdict.runs === b.label_runs && !verdict.wicket }
      : {}),
  };
}

export async function analyzeMatch(manifestPath: string, outPath: string): Promise<MatchScore> {
  const balls = JSON.parse(readFileSync(manifestPath, "utf8")) as BallInput[];
  let score = freshScore();
  const lines: string[] = [];
  for (const b of balls) {
    const r = await analyzeBall(b);
    lines.push(JSON.stringify(r));
    if (r.verdict) {
      const d = r.verdict.decision === "no_ball" ? "no_ball" : r.verdict.decision === "wide" ? "wide" : "legal";
      score = applyBall(score, r.delivery_id, d, r.verdict.runs, r.verdict.wicket);
    }
    console.log(`${r.delivery_id} sam=${r.sam_boxes}box/${r.sam_s}s spark=${r.spark_s}s -> ${JSON.stringify(r.verdict)}${r.match !== undefined ? (r.match ? " MATCH" : " MISS") : ""}`);
  }
  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`score: ${score.runs}/${score.wickets} (${oversBowled(score)} ov) -> ${outPath}`);
  return score;
}
