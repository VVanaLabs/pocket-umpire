# Session log — 2026-10-31 → 2026-11-01 (pre-compact)

## 0. Meta models access
- Notice "Could not refresh meta; showing cached models" = harmless, pi fell back to cached catalog.
- `~/.pi/agent/models.json` already had `meta` provider (api.meta.ai, `$META_API_KEY`); key verified live (HTTP 200, 9 models).
- Running pi session lacked the env var → fix = restart pi from fresh shell. `/model` → muse-spark-1.3, Ctrl+S default.
- Key finding: Spark defaults reasoning effort HIGH; 32-token budgets die with `status: incomplete`. Always `reasoning: {effort: "low"}` + `max_output_tokens >= 512`.

## 1. Repo scaffold (commit fccc485)
- TypeScript/Node 22, Meta-ecosystem only (openai SDK + baseURL api.meta.ai). No Python service.
- `src/config.ts` (LAW thresholds), `geometry.ts` (DLT homography + RANSAC-ish solver), `rules.ts` (21.5.2/22.4.2/21.13, VerdictSchema, needsArbiter), `score.ts` (state machine), `meta.ts` (shared client, timeout+1-retry), `models.ts` (SAM/Spark calls), `cli.ts` (spike-m1 | verdict | score-demo). Fixed: wide "n/a" → "pass" when no-ball (21.13); tsconfig rootDir removed (tests outside src).
- 19 vitest green. `pnpm approve-builds -y esbuild` needed for install.

## 2. Footage #1: tape-match (YouTube R9zhF2u_GVs — "Need 50 From 16 Balls", 485s, 720p25 AV1, night, fixed elevated behind-bowler)
- Lives in /tmp only (third-party, never committed). Transcode to H.264 for SAM (no AV1/VP9).
- Onset picker (`spikes/onsets.mjs`): RMS/50ms, +10dB over 3s median, 4s separation → 12 hits.
- 6-ball demo over cut (7s @15fps H.264): b32,b112,b180,b227,b333,b406. Hand labels (`docs/labels.csv`): 6,2,0,6,0,0 = 14/0.

## 3. Spikes (docs/spikes.md)
- M1 PASS: models.list 9 models; sam-3.1 + muse-spark-1.3 OK; smoke "ok" 1.1s.
- M2 PASS: SAM video 4.3–6.6s/105f, upload 2.1s, 105/105 billed ($0.021). Grammar confirmed: `<Nf>` lines, stable IDs, one_bit masks. Empty output_text = zero matches, not error. Scripts: spikes/m2-sam-video.mjs, m2b-sam-probe.mjs.
- M4 PASS: Spark grounding ~10–20px on 720p night, conf 0.62, 4.2s, ~2K tok ($0.0045). spikes/m4-grounding.mjs.
- S8 CONFIRMED RISK: "cricket ball"/"ball" zero everywhere; "wicket" 105/105 id 0, "cricket bat" 63f id 1, "person" hits; "cricket stumps" zero (wording matters — "wicket" hits).
- Ball-failure analysis: ~2–4px at 40m/720p + 30px motion smear + low contrast. Zoom crop proved mush. Fix order: (1) motion blob tracker + box-prompt SAM, audio-gated ±250ms; (2) 2× corridor crop; (3) closer/faster camera (umpire POV 1080p60 = 4× pixels); (4) trajectory fit for crossing plane.

## 4. Demo over (commit 1b62ecf) — 6/6 Spark verdicts match labels
- Per ball: SAM wicket+bat tracks + contact/end stills + audio SNR → Spark JSON verdict, ~3s each. Wicket 105/105 id 0 all 6 (bowled ruled out geometrically). Bat 98/105/84 on shots, 0 on static poses (known limit).
- Coach card: "Explosive Start Then Bowlers Fight Back" + wide-yorker tip, 4.0s.
- Measured: ~10s/ball, $0.026/ball, over ≈ $0.16. verdicts/over1.jsonl + over1-notes.md.
- Caveats logged: no-ball/wide unjudgeable at 40m (synthetic rules engine covers); b333/b406 dots read from stills.

## 5. Direction decisions (user)
- Footage role: demo ON this YouTube footage (credited), not test-only.
- Multi-angle + glasses direction: `src/capture.ts` — CaptureSource interface (file/live-phone/glasses) + AngleRole (behind-stumps/side-on/square-leg/umpire-pov) + clap-sync offsets. LivePhone/GlassesSource are signatures only. Commit 0f490dc/d472406.
- Highlights/viral: `src/highlights.ts` excitement rank (wicket 50 > six 30 > four 20 > runs > dot, SNR tiebreak) + `spikes/build-reel.sh` → 12s vertical 9:16 (blurred bg, Pillow captions — ffmpeg lacks drawtext; Arial Supplemental fonts) + landscape twin. Reel: SIX,2RUNS,SIX + end card. Commit b96257d.

## 6. Validation, footage #2 (commit 9104e51)
- Sanderstead village cricket (b4KMnTdVo7c, 608s daylight 720p25 whites, edited). vil1 behind-bowler (both stump sets = ideal calibration), vil2 side-on (no-ball profile view exists in wild).
- Transfers: wicket 105/105 id 0 (vil1), 68/105 id 0 (vil2, keeper occlusion); grounding ~15px conf 0.65 4.4s.
- Ball zero in daylight too → blob tracker mandatory. docs/validation.md.

## 7. Cost (docs/cost.md) — incurred ≈ $0.53
- SAM $0.48 (2,415 frames: 7 probes + 12 over tracks + 4 validation). Spark $0.05 (23 calls).
- Projection: ~$1.00 more → ≈$1.55 total vs $25 ceiling (PLAN's $17.50 assumed 20 live passes; replay demo runs leaner).

## 8. Hackathon status
- Event real, matches plan (indie track, "Push the Frontier", due Nov 4 9pm ET, $1M). User applied + accepted. Submission by early afternoon ET Nov 4.

## 9. Next up (ordered)
1. Blob ball tracker (frame-diff → box-prompt SAM, audio-gated) — highest leverage, ~1hr.
2. Verdict overlay cards on full ball clips.
3. 3-min demo video cut (spine: over verdicts + coach card + highlights + roadmap).
4. README demo section + architecture diagram + submission form copy.
5. Submit early afternoon ET Nov 4. Reels for Shorts/Reels/TikTok (per-player moments need batter ID — post-deadline).
