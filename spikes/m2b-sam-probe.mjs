// M2b: non-streaming SAM call — full status + usage to distinguish
// "no matches" from "input not ingested".
import OpenAI from "openai";
const c = new OpenAI({
  baseURL: "https://api.meta.ai/v1",
  apiKey: process.env.META_API_KEY,
});
const file_id = process.argv[2];
const prompt = process.argv[3] || "cricket ball";
const part = JSON.parse(process.argv[4] || '{"type":"input_file"}');
const t0 = Date.now();
const r = await c.responses.create({
  model: "sam-3.1",
  input: [
    {
      role: "user",
      content: [{ type: "input_text", text: prompt }, { ...part, file_id }],
    },
  ],
  metadata: { propagation_direction: "both", mask_encoding: "one_bit" },
});
console.log("total_s:", ((Date.now() - t0) / 1000).toFixed(1));
console.log("status:", r.status, "| output_text_len:", (r.output_text || "").length);
console.log("output_head:", JSON.stringify((r.output_text || "").slice(0, 300)));
console.log("usage:", JSON.stringify(r.usage));
console.log("error:", JSON.stringify(r.error));
if (process.env.SAVE) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.SAVE, r.output_text || "");
  console.log("saved", (r.output_text || "").length, "chars to", process.env.SAVE);
}
