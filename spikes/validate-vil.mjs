// Validation on daylight village footage: does the concept guide transfer?
import OpenAI from "openai";
import { createReadStream } from "node:fs";
const c = new OpenAI({
  baseURL: "https://api.meta.ai/v1",
  apiKey: process.env.META_API_KEY,
});
for (const clip of ["/tmp/vil1.mp4", "/tmp/vil2.mp4"]) {
  const up = await c.files.create({
    file: createReadStream(clip),
    purpose: "user_data",
  });
  for (const concept of ["wicket", "cricket ball"]) {
    const t0 = Date.now();
    const r = await c.responses.create({
      model: "sam-3.1",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: concept },
            { type: "input_file", file_id: up.file_id ?? up.id },
          ],
        },
      ],
      metadata: { propagation_direction: "both", mask_encoding: "one_bit" },
    });
    const txt = r.output_text || "";
    const frames = new Set(txt.match(/<[0-9]+f>/g) || []).size;
    const ids = [...new Set((txt.match(/<[0-9]+f>[0-9]+/g) || []).map((s) => s.split(">")[1]))];
    const box0 = (txt.match(/<\|box;x1=[^|]+\|>/) || ["none"])[0];
    console.log(`${clip.split("/").pop()} ${concept}: ${((Date.now() - t0) / 1000).toFixed(1)}s frames=${frames} ids=[${ids}] ${box0.slice(0, 60)}`);
  }
}
