// Per-ball Spark verdicts: contact + end stills + audio SNR + SAM wicket state.
import OpenAI from "openai";
import { readFileSync, mkdirSync } from "node:fs";
const c = new OpenAI({
  baseURL: "https://api.meta.ai/v1",
  apiKey: process.env.META_API_KEY,
});
mkdirSync("/tmp/verdicts", { recursive: true });
const balls = [
  { id: "O1B1", clip: "b32", snr: 10.5, wicket: "undisturbed all 105 frames (SAM id 0)", bat: "tracked 98 frames" },
  { id: "O1B2", clip: "b112", snr: 10.3, wicket: "undisturbed all 105 frames (SAM id 0)", bat: "not detected (static/occluded)" },
  { id: "O1B3", clip: "b180", snr: 10.5, wicket: "undisturbed all 105 frames (SAM id 0)", bat: "tracked 105 frames" },
  { id: "O1B4", clip: "b227", snr: 17.9, wicket: "undisturbed all 105 frames (SAM id 0)", bat: "tracked 84 frames" },
  { id: "O1B5", clip: "b333", snr: 15.7, wicket: "undisturbed all 105 frames (SAM id 0)", bat: "not detected (batter unmoved)" },
  { id: "O1B6", clip: "b406", snr: 13.6, wicket: "undisturbed all 105 frames (SAM id 0)", bat: "not detected (batter unmoved)" },
];
for (const b of balls) {
  const cimg = readFileSync(`/tmp/balls/c${b.clip.slice(1)}.jpg`).toString("base64");
  const eimg = readFileSync(`/tmp/balls/e${b.clip.slice(1)}.jpg`).toString("base64");
  const t0 = Date.now();
  const r = await c.responses.create({
    model: "muse-spark-1.3",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: `You are a cricket umpire reviewing one delivery from a fixed night-match camera behind the stumps. Two frames: CONTACT (bat-ball moment) and END (+2.5s). Trackers: near-end wicket ${b.wicket}; bat ${b.bat}; bat-ball audio crack +${b.snr}dB over ambient at contact. Stumps intact in both frames = not bowled. Judge ONLY what you see: reply with JSON {"decision":"legal","runs":0-6,"wicket":false,"boundary":false,"one_line":"<20 words"}. Runs: both batters mid-pitch sprinting=2; batter watching ball sail + static field=6; everyone static=0. Boundary only if fielders make no play. No guessing no-ball/wide from this angle — always legal.` },
          { type: "input_image", image_url: `data:image/jpeg;base64,${cimg}` },
          { type: "input_image", image_url: `data:image/jpeg;base64,${eimg}` },
        ],
      },
    ],
    reasoning: { effort: "low" },
    max_output_tokens: 1024,
  });
  const t = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${b.id} ${t}s ${r.output_text} usage=${JSON.stringify(r.usage)}`);
}
