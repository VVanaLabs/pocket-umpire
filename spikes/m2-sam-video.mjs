// M2: SAM 3.1 video-mode latency + output parse on 105f tape-ball clip.
import OpenAI from "openai";
import { createReadStream, statSync } from "node:fs";
const c = new OpenAI({
  baseURL: "https://api.meta.ai/v1",
  apiKey: process.env.META_API_KEY,
});
console.log("file bytes:", statSync("/tmp/delivery1.mp4").size);
let t0 = Date.now();
const up = await c.files.create({
  file: createReadStream("/tmp/delivery1.mp4"),
  purpose: "user_data",
});
console.log("upload_s:", ((Date.now() - t0) / 1000).toFixed(1), "file_id:", up.id);
t0 = Date.now();
let ttfb = -1;
const stream = await c.responses.create({
  model: "sam-3.1",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "cricket ball" },
        { type: "input_file", file_id: up.id },
      ],
    },
  ],
  metadata: { propagation_direction: "both", mask_encoding: "one_bit" },
  stream: true,
});
let chunks = 0;
let textLen = 0;
let frameLines = 0;
for await (const ev of stream) {
  if (ttfb < 0) ttfb = Date.now() - t0;
  chunks++;
  const d = ev?.delta ?? ev?.output_text?.delta ?? "";
  if (typeof ev?.output_text === "string") textLen += ev.output_text.length;
  if (typeof d === "string" && d.length) {
    textLen += d.length;
    frameLines += (d.match(/<0f>/g) || []).length;
  }
  if (chunks <= 6) console.log("ev:", ev?.type, JSON.stringify(String(d)).slice(0, 120));
}
console.log("ttfb_s:", (ttfb / 1000).toFixed(1));
console.log("total_s:", ((Date.now() - t0) / 1000).toFixed(1));
console.log("chunks:", chunks, "text_len:", textLen, "frame_markers:", frameLines);
