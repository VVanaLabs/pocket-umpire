# Spikes (measured, not assumed)

Footage note: `tape-match.mp4` (YouTube `R9zhF2u_GFs`, 8-min night tape-ball match,
1280x720@25 AV1, fixed elevated camera behind the bowling end) lives in /tmp ONLY —
third-party footage, never committed. Used for perception spikes until own POV
footage exists.

## M1 — model access (2026-10-31, PASS)
- `models.list()` → 9 models: muse-wonder-1.0, sam-3.1,
  muse-spark-1.3-contributor, muse-voice-transcribe-1.0, muse-spark-1.3,
  muse-image-1.0, muse-spark-1.2-contributor, muse-spark-1.2, muse-spark-1.1
- `sam-3.1` OK, `muse-spark-1.3` OK.
- Spark smoke (`reasoning effort low`, 512 tokens): `"ok"`, RTT **1.1s**.
- Gotcha: Spark defaults to reasoning effort **high** — 32-token budget dies to
  reasoning tokens with `status: incomplete`. Always send `reasoning: { effort: "low" }`
  + `max_output_tokens ≥ 512` for verdict/arbiter calls.

## M2 — SAM video latency (2026-10-31, PASS)
Clip: 7s, 105f @15fps, H.264 yuv420p (transcoded from AV1 — SAM takes
H.264/H.265/MPEG-4 only, no AV1/VP9). Upload 2.1s (Files API, `purpose: user_data`,
reusable `file_id`). Per-request: **4.3–6.6s total**, TTFB 1.5s, 105/105 frames
billed (`usage.video_frames_processed: 105`) ≈ **$0.021**. Kill was >25s → PASS
with headroom. Output grammar confirmed: one line/frame, `<Nf>` markers, stable
object IDs, `one_bit` masks. Zero matches = `completed` + empty `output_text`
(not an error). Scripts: `spikes/m2-sam-video.mjs`, `spikes/m2b-sam-probe.mjs`.

## M4 — Spark grounding (2026-10-31, PASS with fallback ready)
Night 720p still → 0–1000 grid JSON: near-stump base, crease endpoints, far-stump
base all land within ~10–20px of truth (overlay-verified `f30-annot.jpg`),
confidence 0.62. RTT 4.2s, ~2K tokens ≈ $0.0045. Script: `spikes/m4-grounding.mjs`.
Manual click-cal stays the fallback for daylight POV footage.

## S8/M9 — ball visibility (2026-10-31, CONFIRMED RISK)
Concept prompts on the 105f night clip: `person` ✓, `wicket` ✓ (105/105 frames,
stable ID 0), `cricket bat` ✓ (63 frames, stable ID 1) — but `cricket ball`
and `ball` return ZERO matches, as does `cricket stumps` (wording matters:
`wicket` hits, `cricket stumps` doesn't). Tape ball at ~40m/720p25 night is below
the concept-detection floor. Fallback stack (per plan): frame-differencing /
color-blob ball detector → box-token-prompted SAM track; SAM keeps
wicket/bat/person. Still to prove: box-prompt tracking from a motion blob.

## M3/M5/M6/M7/M10/M11 — BLOCKED on own POV footage.
