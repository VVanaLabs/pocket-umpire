import { readFileSync, writeFileSync } from "node:fs";
// Highlights: rank balls by excitement, emit an ffmpeg concat recipe.
// Excitement: wicket 50 > six 30 > four 20 > runs 10+runs > appeal 5 > dot 0,
// plus audio SNR as tiebreak (crowd goes loud = viral).
export type Moment = {
  delivery_id: string;
  clip: string;
  start: number; // suggest contact-1s within the 7s ball clip
  dur: number;
  caption: string;
  score: number;
};

const EXCITE: Record<string, number> = { wicket: 50, six: 30, four: 20, appeal: 5, dot: 0 };

export function rankMoments(
  verdicts: { delivery_id: string; runs: number; wicket: boolean; audio_snr_db: number; one_line: string }[],
  clipOf: (id: string) => string,
): Moment[] {
  return verdicts
    .map((v) => {
      const kind = v.wicket ? "wicket" : v.runs === 6 ? "six" : v.runs === 4 ? "four" : v.runs > 0 ? "runs" : "dot";
      const base = kind === "runs" ? 10 + v.runs : EXCITE[kind];
      return {
        delivery_id: v.delivery_id,
        clip: clipOf(v.delivery_id),
        start: 3,
        dur: 4,
        caption:
          kind === "six" ? "SIX! 🚀" : kind === "wicket" ? "BOWLED! 💥" : kind === "four" ? "FOUR!" : kind === "runs" ? `${v.runs} RUNS` : "BEATEN!",
        score: base + v.audio_snr_db / 10,
      };
    })
    .filter((m) => m.score > 1) // dots don't make the reel
    .sort((a, b) => b.score - a.score);
}

if (import.meta.url.endsWith(process.argv[1])) {
  const lines = readFileSync("verdicts/over1.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const numOf: Record<string, string> = { O1B1: "b32", O1B2: "b112", O1B3: "b180", O1B4: "b227", O1B5: "b333", O1B6: "b406" };
  const moments = rankMoments(lines, (id) => `/tmp/balls/${numOf[id]}.mp4`);
  writeFileSync("/tmp/moments.json", JSON.stringify(moments, null, 1));
  console.log(moments.map((m) => `${m.delivery_id} ${m.caption} (${m.score.toFixed(1)})`).join("\n"));
}
