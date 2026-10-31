# Spikes (measured, not assumed)

## M1 — model access (2026-10-31, PASS)
- `models.list()` → 9 models: muse-wonder-1.0, sam-3.1,
  muse-spark-1.3-contributor, muse-voice-transcribe-1.0, muse-spark-1.3,
  muse-image-1.0, muse-spark-1.2-contributor, muse-spark-1.2, muse-spark-1.1
- `sam-3.1` OK, `muse-spark-1.3` OK.
- Spark smoke (`reasoning effort low`, 512 tokens): `"ok"`, RTT **1.1s**.
- Gotcha: Spark defaults to reasoning effort **high** — 32-token budget dies to
  reasoning tokens with `status: incomplete`. Always send `reasoning: { effort: "low" }`
  + `max_output_tokens ≥ 512` for verdict/arbiter calls.

## M2 — SAM video latency (BLOCKED: no footage)
Needs a 7s/105f clip. Run when first footage lands; kill at >25s/ball → image-mode keyframes.

## M3–M11 — all BLOCKED on footage (see PLAN.md §4).
