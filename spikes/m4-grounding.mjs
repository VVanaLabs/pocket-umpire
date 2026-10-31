// M4: Spark grounding accuracy on tape-ball night footage (0-1000 grid).
import OpenAI from "openai";
import { readFileSync } from "node:fs";
const c = new OpenAI({
  baseURL: "https://api.meta.ai/v1",
  apiKey: process.env.META_API_KEY,
});
const b64 = readFileSync("/tmp/tape-frames/f30.jpg").toString("base64");
const t0 = Date.now();
const r = await c.responses.create({
  model: "muse-spark-1.3",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: 'You are an object grounding expert. Locate on the normalized 0-1000 grid ((0,0) top-left, (1000,1000) bottom-right): (1) the three stumps at the near end (left foreground) — bottom base point of middle stump; (2) the popping crease line near those stumps — its two visible endpoints; (3) the far-end stumps base point. Reply with JSON only: {"near_stump_base":[x,y],"crease_endpoints":[[x1,y1],[x2,y2]],"far_stump_base":[x,y],"confidence":0.0-1.0}. No other text.',
        },
        {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${b64}`,
        },
      ],
    },
  ],
  reasoning: { effort: "low" },
  max_output_tokens: 1024,
});
console.log("rtt_s:", ((Date.now() - t0) / 1000).toFixed(1));
console.log("output_text:", r.output_text);
console.log("usage:", JSON.stringify(r.usage));
