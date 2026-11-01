// v2 path validation: SAM image (contact still, wicket check) + contributor
// Spark verdict (contact+end stills). Compare against docs/labels.csv.
import OpenAI from "openai";
import { readFileSync, writeFileSync } from "node:fs";
const c = new OpenAI({ baseURL: "https://api.meta.ai/v1", apiKey: process.env.META_API_KEY });
const balls = [
  { id: "O1B1", clip: "32", snr: 10.5, label: 6 },
  { id: "O1B2", clip: "112", snr: 10.3, label: 2 },
  { id: "O1B3", clip: "180", snr: 10.5, label: 0 },
  { id: "O1B4", clip: "227", snr: 17.9, label: 6 },
  { id: "O1B5", clip: "333", snr: 15.7, label: 0 },
  { id: "O1B6", clip: "406", snr: 13.6, label: 0 },
];
const out = [];
for (const b of balls) {
  const cimg = readFileSync(`/tmp/balls/c${b.clip}.jpg`).toString("base64");
  const eimg = readFileSync(`/tmp/balls/e${b.clip}.jpg`).toString("base64");
  const t0 = Date.now();
  const sam = await c.responses.create({ model: "sam-3.1",
    input: [{ role: "user", content: [{ type: "input_text", text: "wicket" }, { type: "input_image", image_url: "data:image/jpeg;base64," + cimg }] }],
    metadata: { mask_encoding: "one_bit" } });
  const samT = ((Date.now() - t0) / 1000);
  const boxes = ((sam.output_text || "").match(/\|box/g) || []).length;
  const t1 = Date.now();
  let verdict = null, usage = null;
  for (let a = 0; a < 2 && !verdict; a++) {
    const r = await c.responses.create({ model: "muse-spark-1.3-contributor",
      input: [{ role: "user", content: [
        { type: "input_text", text: `You are a cricket umpire reviewing one delivery from a fixed night-match camera behind the stumps. Two frames: CONTACT (bat-ball moment) and END (+2.5s). SAM image check: wicket boxes=${boxes} on contact frame; stumps intact = not bowled. Bat-ball audio crack +${b.snr}dB over ambient at contact. Judge ONLY what you see: reply ONLY JSON {"decision":"legal","runs":0-6,"wicket":false,"boundary":false,"one_line":"<20 words"}. Runs: both batters mid-pitch sprinting=2; batter watching ball sail + static field=6; everyone static=0. Boundary only if fielders make no play. No guessing no-ball/wide from this angle — always legal.` },
        { type: "input_image", image_url: "data:image/jpeg;base64," + cimg },
        { type: "input_image", image_url: "data:image/jpeg;base64," + eimg }] }],
      reasoning: { effort: "low" }, max_output_tokens: 1024 });
    usage = r.usage;
    const m = (r.output_text || "").match(/\{[\s\S]*\}/);
    if (m) { try { verdict = JSON.parse(m[0]); } catch {} }
  }
  const sparkT = ((Date.now() - t1) / 1000);
  const ok = verdict && verdict.runs === b.label && !verdict.wicket;
  out.push({ delivery_id: b.id, label_runs: b.label, sam_boxes: boxes, sam_s: +samT.toFixed(1), spark_s: +sparkT.toFixed(1), usage, verdict, match: !!ok });
  console.log(`${b.id} label=${b.label} sam=${boxes}box/${samT.toFixed(1)}s spark=${sparkT.toFixed(1)}s ->`, JSON.stringify(verdict), ok ? "MATCH" : "MISS");
}
writeFileSync("verdicts/over1-v2.jsonl", out.map(o => JSON.stringify(o)).join("\n") + "\n");
console.log("MATCHES:", out.filter(o => o.match).length, "/", out.length);
