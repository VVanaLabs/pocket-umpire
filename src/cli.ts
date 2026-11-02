import { checkFrontFoot, checkWide, needsArbiter } from "./rules.js";
import { applyBall, freshScore, oversBowled } from "./score.js";
import { samModelId, sparkArbiter, sparkSmoke, spikeModelsList } from "./models.js";

const cmd = process.argv[2];

if (cmd === "spike-m1") {
  // M1: key has sam-3.1 + muse-spark-1.3, smoke calls succeed.
  const ids = await spikeModelsList();
  console.log("models:", ids.join(", "));
  const need = [samModelId(), process.env.SPARK_MODEL ?? "muse-spark-1.3"];
  for (const m of need)
    console.log(m, ids.includes(m) ? "OK" : "MISSING");
  const t0 = Date.now();
  console.log("spark:", await sparkSmoke());
  console.log(`smoke rtt: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} else if (cmd === "verdict") {
  // Deterministic demo verdict from geometry numbers (no footage needed):
  // --foot <meters over crease> --cross <crossing x> [--bat] [--conf <0..1>]
  const args = Object.fromEntries(
    process.argv.slice(3).map((a) => a.replace(/^--/, "").split("=")),
  );
  const foot = checkFrontFoot(
    args.foot === undefined ? 0 : Number(args.foot),
  );
  const wide = checkWide(args.cross === undefined ? 0.2 : Number(args.cross), {
    noBall: foot.status === "fail",
    batContact: args.bat !== undefined,
  });
  const conf = args.conf === undefined ? 0.9 : Number(args.conf);
  const decision =
    foot.status === "fail" ? "no_ball" : wide.status === "fail" ? "wide" : "legal";
  let arbiter = "skipped (clear)";
  if (needsArbiter(foot, wide, conf))
    arbiter = await sparkArbiter(
      "The white line is the popping crease; its back edge is the legal boundary. Does any part of the landing foot sit behind the back edge?",
    );
  console.log(JSON.stringify({ foot, wide, decision, confidence: conf, arbiter }, null, 2));
} else if (cmd === "analyze") {
  // One-command match analysis: manifest JSON -> verdict JSONL + running score.
  // manifest: [{delivery_id, contact, end, audio_snr_db?, label_runs?}]
  const { analyzeMatch } = await import("./analyze.js");
  const m = process.argv[3];
  if (!m) throw new Error("usage: pnpm cli analyze <manifest.json> [out.jsonl]");
  await analyzeMatch(m, process.argv[4] ?? "out/verdicts.jsonl");
} else if (cmd === "score-demo") {
  // Scripted over: proves illegal-ball counting without footage.
  const script: [string, "legal" | "no_ball" | "wide", number][] = [
    ["O1B1", "legal", 1],
    ["O1B2", "no_ball", 0],
    ["O1B2r", "legal", 4],
    ["O1B3", "wide", 0],
    ["O1B3r", "legal", 0],
    ["O1B4", "legal", 0],
    ["O1B5", "legal", 6],
    ["O1B6", "legal", 2],
  ];
  let s = freshScore();
  for (const [id, d, r] of script) s = applyBall(s, id, d, r);
  console.log(`${s.runs}/${s.wickets} (${oversBowled(s)} ov)`, JSON.stringify(s.ballLog));
} else if (cmd === "ingest") {
  // Flywheel intake: dashboard corrections JSON -> human labels in the labels CSV.
  // usage: pnpm cli ingest <corrections.json> [labels.csv]
  const { readFileSync, writeFileSync } = await import("node:fs");
  const { ingestCorrections } = await import("./labels.js");
  const corrPath = process.argv[3];
  const csvPath = process.argv[4] ?? "verdicts/match2-labels.csv";
  if (!corrPath) throw new Error("usage: pnpm cli ingest <corrections.json> [labels.csv]");
  const corrections = JSON.parse(readFileSync(corrPath, "utf8"));
  const r = ingestCorrections(readFileSync(csvPath, "utf8"), corrections);
  writeFileSync(csvPath, r.csv);
  console.log(`human_labeled: ${r.labeled.length} (${r.labeled.join(", ") || "none"})`);
  console.log(`model agrees: ${r.agree}/${r.labeled.length}`);
  for (const d of r.disagree) console.log("  disagree:", d);
  if (r.skipped.length) console.log(`skipped (untouched/unknown): ${r.skipped.join(", ")}`);
} else {
  console.log("usage: pnpm cli spike-m1 | verdict [--foot=M --cross=X --bat --conf=C] | score-demo | analyze <manifest.json> [out.jsonl] | ingest <corrections.json> [labels.csv]");
}
