// Match2 end-to-end (v2 path): clip -> contact still -> SAM signboard surrogate
// -> contributor verdict -> match log. Keep every call cheap.
import OpenAI from "openai";
import { createReadStream, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const c = new OpenAI({ baseURL: "https://api.meta.ai/v1", apiKey: process.env.META_API_KEY });
const HITS = [18.0, 74.9, 80.7, 103.2, 168.3, 173.3, 185.3, 197.3, 334.3, 484.4, 502.9, 548.4];
if (!existsSync("/tmp/m2clips")) mkdirSync("/tmp/m2clips");
const log = [];
for (let i = 0; i < HITS.length; i++) {
  const t = HITS[i], id = `m2b${String(i + 1).padStart(2, "0")}`;
  const start = Math.max(0, t - 4);
  execSync(`ffmpeg -y -v error -ss ${start} -i /tmp/match2.mp4 -t 7 -vf fps=15 -c:v libx264 -pix_fmt yuv420p -c:a aac /tmp/m2clips/${id}.mp4`);
  execSync(`ffmpeg -y -v error -ss 4 -i /tmp/m2clips/${id}.mp4 -frames:v 1 /tmp/m2clips/${id}.jpg`);
  const b64 = readFileSync(`/tmp/m2clips/${id}.jpg`).toString("base64");
  const sam = await c.responses.create({ model: "sam-3.1",
    input: [{ role: "user", content: [{ type: "input_text", text: "white signboard with black text" }, { type: "input_image", image_url: "data:image/jpeg;base64," + b64 }] }],
    metadata: { mask_encoding: "one_bit" } });
  const samTxt = sam.output_text || "";
  const board = (samTxt.match(/\|box/g) || []).length;
  const prompt = `You are a cricket umpire. CONTACT still of a daylight tape-ball game, makeshift board-stumps ${board > 0 ? "visible and standing" : "not visible"}. Reply ONLY JSON: {\"decision\":\"legal|no-ball|wide\",\"runs\":0-6,\"wicket\":bool,\"boundary\":bool,\"one_line\":\"<12 words\"}.`;
  let verdict = null, raw = "";
  for (let attempt = 0; attempt < 2 && !verdict; attempt++) {
    const v = await c.responses.create({ model: "muse-spark-1.3-contributor",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: "data:image/jpeg;base64," + b64 }] }],
      reasoning: { effort: "low" }, max_output_tokens: 1024 });
    raw = v.output_text || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) { try { verdict = JSON.parse(m[0]); } catch {} }
  }
  if (!verdict) verdict = { decision: "needs-review", runs: 0, wicket: false, boundary: false, one_line: raw.slice(0, 80) };
  log.push({ id, t, board_boxes: board, verdict, sam_images: sam.usage?.images_processed ?? 1 });
  console.log(`${id} t=${t}s board=${board} ->`, JSON.stringify(verdict));
}
writeFileSync("/tmp/m2clips/match2.json", JSON.stringify(log, null, 1));
console.log("SAVED", log.length);
