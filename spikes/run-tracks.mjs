// Batch: upload each demo clip once, run wicket + bat concepts, save tracks.
import OpenAI from "openai";
import { createReadStream } from "node:fs";
import { writeFileSync, mkdirSync } from "node:fs";
const c = new OpenAI({
  baseURL: "https://api.meta.ai/v1",
  apiKey: process.env.META_API_KEY,
});
mkdirSync("/tmp/tracks", { recursive: true });
const balls = ["b32", "b112", "b180", "b227", "b333", "b406"];
for (const b of balls) {
  const up = await c.files.create({
    file: createReadStream(`/tmp/balls/${b}.mp4`),
    purpose: "user_data",
  });
  for (const concept of ["wicket", "cricket bat"]) {
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
    writeFileSync(`/tmp/tracks/${b}-${concept.replace(" ", "_")}.txt`, txt);
    console.log(`${b} ${concept}: ${((Date.now() - t0) / 1000).toFixed(1)}s frames=${frames} ids=[${ids}] chars=${txt.length} file=${up.file_id ?? up.id}`);
  }
}
console.log("done");
