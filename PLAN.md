# Pocket Umpire — Master Plan (control tower)

**Window:** Day 1 = Sat Oct 26 → Day 10 = Tue Nov 4, **submission 9:00 PM ET**. Solo dev. Code freeze EOD Day 9; feature freeze EOD Day 8.

## 1. Pitch & scope

**Pitch:** Club cricket has no umpire tech — Hawk-Eye costs $100Ks. Pocket Umpire mounts a phone at the umpire's POV (chest mount), records each delivery, and AI-umpires it: front-foot no-ball, wide, bowled, boundary and edge (audio-spike) verdicts between balls, ball-by-ball scoring, and post-over coach analysis — at **≈$0.04/delivery, <$1.50 per match**. Works on recorded video today; live phone next; Meta glasses (Wearables Device Access Toolkit) on the roadmap. Judged on creativity · ambition · **does it work** — so the demo is a deterministic replay of real footage, never an improvised live run.

| IN demo (frozen) | OUT roadmap (slide only) |
|---|---|
| Front-foot no-ball (MCC 21.5.2, back-edge rule) | LBW trajectory (MAGNUS precedent) |
| Wide, off-side (MCC 22; leg-side = stretch, cut by default) | Run-out (needs 2nd camera unit) |
| Bowled (bail displacement) + boundary (labeled *inferred*; voice "four"/"six" resolves & upgrades to 4-vs-6) | Caught behind |
| Edge/snick = local audio DSP, binary "sharp sound" | Bat-vs-pad classification |
| Ball-by-ball score + over-summary coach card + TTS | Live phone stream rung (stub only) |
| Voice channel: umpire speech confirms/overrides verdicts, resolves out-of-frame events (on-device STT, $0) | Player "howzat" appeal auto-detection |
| `CaptureSource` swappable: file ✅ / live stub / glasses signature | Glasses stream via DAT (Mock Device Kit dev mode) |

## 2. Architecture + latency budget

```
phone MOV 1080p60 (chest mount, audio = master clock, 48k mono PCM)
 └─ INGEST      ffmpeg probe → motion energy + audio onsets → delivery windows
     └─ per ball: 7s clip (release−2.5s…+4.5s) @15fps + native-fps contact frames + 48k PCM
         ├─ CALIBRATE   Spark 1.3 single-frame grounding → pitch keypoints → homography  [cached/over; manual click-cal fallback]
         ├─ TRACK       SAM 3.1 VIDEO (105 frames) → ball / front foot / stumps, stable IDs
         ├─ PRECISE     SAM 3.1 IMAGE at native fps: foot-contact, stump-hit frames
         ├─ GEOMETRY    px→meters; Law 21.5.2 / 22 / 29 checks — DETERMINISTIC CODE
         ├─ SNICK DSP   2–10 kHz spectral flux on PCM; Spark image corroboration only
         ├─ ARBITER     margin < ε or conf < 0.6 → Spark (stream, effort low) — ambiguity only
         └─ VERDICT     verdicts.jsonl + overlay card + TTS → score state machine → over summary (Spark)
 └─ MIC (same 48k PCM) → on-device STT keyword grammar ("four/six/wide/no ball/out/undo/over")
                 → confirm/override VERDICT_SHOWN · resolves out-of-frame events (boundary behind umpire)
```

**Principle: models perceive, code decides, Spark arbitrates ambiguity.** Every failure path degrades to "no call" + saved evidence; the demo never hard-fails.

| Stage | Budget | Stage | Budget |
|---|---|---|---|
| Trim/downsample (ffmpeg) | 1–3s | SAM image precision (4–6f) | 2–4s |
| Delivery detect (amortized) | <1s | Spark arbiter+verdict (low) | 2–6s |
| Calibration | 0 (cached) | Overlay render + TTS | 2–3s |
| SAM video (105f) | 6–15s (kill >25s) | **Total** | **≈9–27s typ, 33s worst** — fits the natural 20–40s gap; target p95 ≤ 30s |

## 3. Merged timeline (Day 1..10)

Resolutions (demo deadline wins): **TypeScript/Node 20 single process** over decisions-doc Python — `@meta-sam/parser` is npm-first, no service boundary (decisions' rule/state-machine logic ports 1:1 to vitest); **audio extracted at 48 kHz mono** (16k clips the 2–10 kHz snick band — research-capture wins); **feature freeze EOD D8, code freeze EOD D9** (demo-doc's D7 freeze was too early for accuracy pass, vision-doc's D9 too late for the video); **boundary scored FOUR by default**, 4-vs-6 via audio bounce count = stretch; second phone films passively (snick control data only — no virtual-stump-mic build without user approval).

| Day | Build | Exit gate (kill-switches in §4) |
|---|---|---|
| **1** Oct 26 | **Film before building.** AM: M1 access spikes + tiny smoke calls. 90-min field session: ≥20 deliveries chest-mount 1080p60 (12 legal, 2 no-ball, 2 wide, 1 boundary, 1 snick, 2 out-of-frame boundaries the umpire calls aloud, spares), clap-sync every take, static calibration frame, 2nd phone behind stumps (control only). EOD: run M2–M10 on footage; hand-label `labels.csv`; scope freeze of detectors. Backup session booked. | `docs/spikes.md` = measured numbers (SAM/Spark p50/p95, grounding px error, snick SNR, token counts) + every kill-switch resolved. No Day-2 work depends on an unproven assumption. |
| **2** Oct 27 | Ingest + delivery segmentation (ffmpeg, MOG2 motion energy, spectral-flux onsets → per-ball clips/manifest) **and** rule-engine core in TS: homography DLT+RANSAC (~60 lines), Law 21.5.2 + wide thresholds + 21.13/22.4 ordering, synthetic vitest cases (toe-on-line legal, raised-foot legal). Measure real Spark arbiter latency. | ≥90% deliveries segmented, ≤10% false windows; `vitest rules` green (12+ cases); arbiter round-trip timed → go/no-go vs 25s switch. Contingency: if filming failed → film today (staged), steal D3 slack. |
| **3** Oct 28 | Calibration: Spark grounding → 0–1000 grid → pitch coords → homography, cached per over; re-cal triggers (over change, ORB drift >5px, low conf, manual flag). Manual click-cal HTML tool built same day. Front-foot occlusion decision on real frames. | Reprojection RMS <8px near-field on Day-1 clips + overlay PNGs; synthetic round-trip <1cm. M4 kill → manual cal becomes primary (30s/innings, acceptable, say so in demo). |
| **4** Oct 29 | SAM image mode + prompt grammar (binary prompts, token coords, `@meta-sam/parser`, empty-output-is-normal). Front-foot no-ball E2E: contact-frame picker (mask-bottom velocity) → geometry → verdict JSON vs labels. Overlay renderer v1. | Foot mask at contact ≥80%, stumps ≥95% on 5 deliveries; no-ball verdicts match labels on all no-ball takes. Kill: concept prompts weak on feet → point-tokens seeded from Spark boxes. |
| **5** Oct 30 | SAM video mode (105-frame clips, IDs, `one_bit` masks) vs image tracks on same balls → finalize split (video=coarse, image=precision). Wide E2E: stump-plane crossing, image-space wide line (base + stump-height anchors), bat-contact suppression. | ≥8/10 balls tracked E2E; SAM wall-clock recorded; wide verdicts vs labels ≥80%. M2 kill here: SAM video unusable → 10fps keyframe IoU tracker (~60 lines, 12 frames/ball ≈ $0.03), same interface. |
| **6** Oct 31 | Geometry finalized + scoring: bowled (stump bbox entry ∧ audio thump ±80ms, bail check), boundary (frame-exit ≤0.5s after contact; FOUR default, 6 = stretch), score state machine + append-only ball log JSONL; **voice channel v1** — on-device STT keyword grammar time-gated to VERDICT_PENDING/SHOWN, wired as confirm/override/resolve/undo. | Full scripted over reproduces from raw clips; illegal-ball counting unit-tested; golden geometry suite (12 marginal cases) green; keyword grammar passes on Day-1 voice takes with zero false scores on raw field audio. |
| **7** Nov 1 | Integration service: job queue, stage-memoized `out/<ballId>/`, `CaptureSource` interface (File ✅, live stub, glasses signature), timeout+1-retry → "no call". Snick DSP E2E (48k PCM, band-pass, ROC tuning) + waveform overlay. Verdict output: card + TTS lines. Over-summary Spark call + pitch map + wagon wheel (no model). | Full over E2E, median ≤40s/ball; per-stage p50/p95 table filled; snick formally in-demo or cut (M5); one over → coach card. |
| **8** Nov 2 | Accuracy pass: fresh 4–6 overs from club bowlers, E2E, audit vs labels, fix top error sources. **Feature freeze EOD.** Repo: README, architecture diagram, `.env` hygiene, honest limitations, submission form draft. | ≥85% agreement on no-ball/wide/bowled across ≥30 balls; fresh `git clone` → `.env` → one command → same verdicts. No fresh bowlers? Audit Day-1 set instead (accuracy claim goes qualitative). |
| **9** Nov 3 | **Demo day.** Full timed rehearsal + screen capture (spine of video); THE demo session recorded through the real pipeline; pre-render fallback verdict clips; edit to 3:00 arc (hook → architecture → no-ball/legal → wide/boundary → snick/coach → roadmap → cost close), captions, elapsed-time watermarks, upload unlisted + verify incognito. Rehearsal 2 + 2-min live pitch. **Code freeze EOD.** Cold viewer test. | Demo video live at working URL; fallback assets committed; form fields done; repo judge-ready; secrets self-check clean (`git log --all -p \| grep -iE 'meta_api\|sk-'`). |
| **10** Nov 4 | Re-render only, no new code. Morning checklist (video link, fresh-clone run, README, secrets, consented clips only, form). **Submit by early afternoon ET** + confirmation screenshot. Local video copy + Drive mirror. | Submitted ≥6h before deadline. Stop. |

## 4. Critical path, slips, Day-1 spikes

**Critical path:** footage+spikes (D1) → segmentation+rules (D2) → calibration (D3) → foot/wide verdicts (D4–5) → scoring (D6) → integration+snick+output (D7) → accuracy+freeze (D8) → demo video (D9) → submit (D10).
**Cannot slip:** D1 filming (backup = staged session D2), D9 demo video, D10 submission.
**Can slip (in order):** leg-side wides & 4-vs-6 (already cut by default) · live-phone source (stub forever OK) · pitch map/wagon wheel · Wonder match-closer (Spark summary suffices) · README GIF polish · fresh Day-8 footage (fall back to Day-1 audit) · over-summary TTS voice polish.

| # | Spike (Day 1) | Kill-switch → fallback |
|---|---|---|
| M1 | Key has `sam-3.1` + `muse-spark-1.3` (`models.list()` + smoke calls) | SAM 404 → Spark-grounding boxes + local blob tracker; Spark 404 → `muse-spark-1.2` → template verdicts |
| M2 | SAM video latency on 7s/105f clip, 3 runs, p50/p95; parse check | >25s or parse/codec fail → image-mode keyframe tracker primary (D5 decision point) |
| M3 | Spark video→token precount (`/v1/responses/input_tokens`) | >50K tok/ball → Spark never receives video (already the default; quantify for roadmap) |
| M4 | Spark grounding px error on POV cricket stills (3×5 prompts, homography RMS) | RMS >12px near-field → manual click-cal primary (tool built D3 anyway) |
| M5 | Snick SNR at ~20m (2–10kHz spike vs ambient; close-mic control) | No spike → snick leaves demo (roadmap); waveform-viz only if control mic works |
| M6 | Landing-frame legibility from chest POV (foot + crease back edge) | Fully occluded → pre-landing-frame judging; else front-foot framed as "review assist" |
| M7 | 60fps sustainability (20–30 min battery/thermal/storage) | Degrades → 1080p30 + mask-bottom interpolation + 5cm no-ball margin |
| M8 | A/V sync drift (pts + clap test, both devices) | >½ frame → clap-sync ritual becomes standing pre-record step |
| M9 | Ball trackable at 20m (~60px, motion blur) | Unstable → frame-differencing/color-blob detector; SAM keeps foot/stumps/bat |
| M10 | Wide threshold defaults (club umpire conversation) | No umpire → limited-overs defaults, configurable, labeled in UI |
| M11 | STT keyword false-positive rate on raw field audio (chatter, appeals) | Any false auto-score → voice refines/confirms only, never auto-scores; push-to-talk mode |

## 5. Cost (show the arithmetic)

Per-ball (Standard pricing; Spark `muse-spark-1.3` $1.25/M in, $4.25/M out; SAM image $2.50/1k, video $0.20/1k frames):

```
SAM video: 105 f × $0.0002              = $0.0210
SAM image: 5 × $0.0025                  = $0.0125
Spark verdict: 6.2K in × $1.25/M        = $0.00775
             + 0.35K out × $4.25/M      = $0.00149
Spark calibration: (1.4K×1.25 + 0.5K×4.25)/M ÷ 6 balls/over = $0.0007
TOTAL ≈ $0.043/ball   (Spark never gets video; SAM min 50 f billed)
```

Dev iteration uses `muse-spark-1.3-contributor` ($0.10/$0.20): Spark verdict ≈ $0.0007 → dev per-ball ≈ **$0.034**. **All demo/match/footage verdict calls stay Standard** (no content training on match footage). SAM has no contributor tier.

| Bucket | Volume | Cost |
|---|---|---|
| Day-1 spikes | ~50 SAM-video probes (5,250f=$1.05) + ~100 SAM-image ($0.25) + ~200 Spark calls (1.4M in + 70K out ≈ $2.05) | ≈ $3.35 |
| Dev regression re-runs D2–D7 | 6 days × 20 balls; SAM $0.0335/ball = $4.02 + Spark contributor $0.10 | ≈ $4.15 |
| Day-8 accuracy session (Standard) | 40 balls × $0.043 | ≈ $1.75 |
| Demo + rehearsals | 3 × 36 balls × $0.043 + Wonder closer $0.10 | ≈ $4.75 |
| Slack (retries, failed parses, exploration) | +25% | ≈ $3.50 |
| **Whole hackathon** | | **≈ $17.50 → budget $25 ceiling** |

## 6. Risks

| Risk | L | Mitigation | Owner |
|---|---|---|---|
| All model latencies unpublished; SAM video blows the 20–40s gap | M | M2 measures Day 1; kill >25s → image-mode caps worst case; arbiter-off toggle | D1/D5 |
| Ball invisible at 20m (blur, 60px) | M-H | M9 Day 1; blob-detector fallback; wide degrades to "no call", never fabricated | D1/D5 |
| Snick SNR too low at umpire distance | M-H | M5 Day 1 with close-mic control; cut from demo cleanly, keep waveform story | D1/D7 |
| STT mishears player chatter as verdict keywords | M | M11 Day 1; exact-match grammar + time-gating to VERDICT_PENDING/SHOWN; overrides logged with clip | D1/D6 |
| Landing foot self-occludes crease | M | M6; pre-landing frames + mask extent; honest "review assist" framing | D1/D3 |
| Filming session fails (weather/no-show) | L-M | Backup staged session pre-booked; contingency slot D2; loss = steal D3 slack | D1/D2 |
| Spark grounding inaccurate → homography garbage | M | M4; manual click-cal built D3 regardless; geometry unit tests catch silently-broken calibration | D1/D3 |
| Access/429s mid-demo | L | Solo demo ≈3 orders under rate limits; retry+backoff; pre-rendered fallback clips make video immune | D7/D9 |
| Phone caps 30fps / thermal throttle | L-M | M7; 30fps recipe ready (interpolation + 5cm margin) | D1 |
| Scope creep (virtual stump mic, leg-side wides, live mode) | M | Everything unproven is a Day-1 spike with a kill-switch; freezes D8/D9 | D8 |
| Submission mechanics fail (YouTube, form) | L | Upload+verify incognito Day 9; submit early afternoon Day 10; Drive mirror | D9/D10 |

## 7. Documents

- `docs/vision-pipeline.md` — perception stack: SAM prompting grammar, calibration/homography math, sampling table, per-stage latency, fallback stack, toolchain.
- `docs/decisions.md` — verdicts/scoring/analysis: MCC law encodings (21.5.2, 22, 29), arbiter pattern, verdict JSON schema, score state machine, snick DSP, output/TTS, test strategy.
- `docs/demo-submission.md` — footage shot list, 3:00 demo arc, repo hygiene, submission mechanics + Day-10 checklist, roadmap slide.
- `docs/research-models.md` — API facts: endpoints, prompt rules, pricing, rate limits, precedents (MAGNUS, AthletiQ, SAM3-NFL).
- `docs/research-capture.md` — capture rungs, MCC law ground truth, snick feasibility, Wearables DAT roadmap, mounts.
