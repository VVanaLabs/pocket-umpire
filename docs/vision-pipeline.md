# Vision Pipeline Plan — Pocket Umpire

**Scope:** perception stack for phone-POV cricket umpiring. Frozen in: front-foot no-ball, wide, bowled, boundary (scoring events), edge/snick via local audio DSP. Out (roadmap): LBW trajectory, run-out (2nd camera), caught behind.
**Window:** Day 1 = Oct 26 → Day 10 = Nov 4 (submission 9:00 PM ET). Code freeze EOD Day 9.
**Stack:** SAM 3.1 (segmentation/tracking) + Muse Spark 1.3 (grounding, arbitration, verdict language) on one OpenAI-compatible Responses API (`POST https://api.meta.ai/v1/responses`, `openai` SDK + `baseURL` override). Key = `META_API_KEY` from `~/.zshrc`; **never committed**.

## 0. Architecture in one screen

```
phone MOV 1080p60 (cap-brim/chest mount)
 └─ INGEST      ffmpeg probe → audio onset + motion energy → delivery windows
     └─ per ball: 7s clip (release−2.5s…+4.5s) @15fps + native-fps contact frames + 16k PCM
         ├─ CALIBRATE   Spark 1.3 single-frame grounding → pitch keypoints → homography   [cached per over]
         ├─ TRACK       SAM 3.1 VIDEO request (15fps clip) → ball / front foot / stumps, stable IDs
         ├─ PRECISE     SAM 3.1 IMAGE calls at native fps: foot-contact frames, stump-hit frame
         ├─ GEOMETRY    pixel→pitch meters; no-ball / wide / bowled / boundary   (deterministic code)
         ├─ SNICK DSP   spectral-flux onsets on PCM; Spark image corroboration of contact frame
         └─ VERDICT     Spark phrasing/arbitration (stream, low effort) → verdicts.jsonl + overlay clips
```

**Principle: Spark perceives, code decides.** All verdicts are deterministic pixel→world math on SAM tracks (unit-testable). Spark does scene grounding (calibration), low-confidence arbitration, and language. No verdict depends on any single model call succeeding — every failure path degrades to "no call" + saved evidence, never a crash.

## 1. Day-1 spikes & kill-switches (all unverified assumptions live here)

| # | Question | Method | Kill condition | Fallback path |
|---|----------|--------|----------------|---------------|
| S1 | Key has `sam-3.1` + `muse-spark-1.3`? | `models.list()`; tiny smoke call; expect 404 `model_not_found` otherwise | SAM 404 → perception redesign; Spark 404 → template verdicts | §4 fallback stack |
| S2 | Latency: TTFB + total for 5s clip through SAM video + Spark verdict (low/medium)? No published figures exist | Probe script on Day-1 footage, 3 runs each mode, record p50/p95 | SAM video >25s/ball → image-mode keyframes become primary | §4 |
| S3 | Spark video→token cost on a real clip (`POST /v1/responses/input_tokens`) | Precount on 7s clip | >50K tokens/ball → **decision by default: Spark never receives video; images only** (quantify for roadmap) | already default |
| S4 | Spark grounding accuracy on phone-POV cricket frame (crease corners, stump bases, 0–1000 grid) | 3 stills × 5 prompts; measure px error; homography RMS | RMS >12px near-field → manual click-calibration becomes primary (built Day 3 anyway) | §4 |
| S5 | Does embedded-audio degradation hurt Spark **visual** answers? | Same frame ± loud audio track, compare grounding coords | Any drift → `-an` strip audio before every Spark call (trivial ffmpeg) | already planned |
| S6 | Contributor-mode policy | Process rule, not test | — | Dev iteration on `muse-spark-1.3-contributor` ($0.10/$0.20); **demo/match verdict calls stay Standard** (no content-training on match footage) |
| S7 | SAM video accepts iPhone 60fps→15fps downsampled H.264 MOV; parser handles our stream lines | 1 trimmed clip through full request+parse | Parse/codec failures → transcode recipe (`libx264 yuv420p`) or image-mode fallback | §8 |
| S8 | Ball trackable at 20m (≈60px, motion blur)? | SAM video + image calls on Day-1 net footage; check ID stability | Ball ID unstable → ball detection switches to frame-differencing/color-blob detector; SAM keeps foot/stumps/bat | §8 |

Also Day 1: record 5–10 net deliveries at 1080p60 (cap-brim AND chest rig) + one loud-audio clip. Rig picked by calibration error + usable footage. **Verify 60fps actually records** (some phones cap 30 → margin math in §4.4 degrades; mitigation: mask-bottom interpolation + widen no-ball margin to 5cm).

## 2. Day-by-day

### Day 1 (Sun Oct 26) — access, spikes, rig, first footage
- Repo skeleton (`docs/` only today). Env check. Run S1–S8 above against fresh footage.
- **Exit:** `docs/spikes.md` table with measured numbers (latency p50/p95, grounding px error, token counts) + rig decision + 60fps confirmed.
- **Kill rules enforced same day:** every kill condition above routes to its fallback; no Day-2 work depends on an unproven assumption.

### Day 2 (Mon Oct 27) — Ingest & delivery segmentation
- `ffmpeg`/`ffprobe` probe; audio → 16k mono PCM (`-f s16le -ar 16000 -ac 1`); spectral-flux onset list; MOG2 motion-energy curve.
- Delivery window = motion-energy plateau (bowler in stride, >threshold for >1.5s) ∧ anchored on first bounce onset after window start. Club pace: release→bounce ≈ 0.65–0.75s; front-foot contact ≈ release − 0.4±0.2s. Constants tuned on footage.
- Clip extraction per ball: 7s (release −2.5s … +4.5s) → 15fps H.264 for SAM video; native-fps frames around contact events for SAM image; PCM per ball for DSP.
- **Exit:** `pnpm ingest nets.mp4` emits `balls/` manifest (clipPath, audioPath, releaseT, bounceT). Tests: ≥90% deliveries found, ≤10% false windows on Day-1 footage.

Frame sampling decisions (final):

| Use | Rate | Frames/ball | Why |
|---|---|---|---|
| SAM video tracking | 15 fps | 105 (7s) | stable IDs; half the frames = half cost, tracking tolerates it |
| Foot-contact precision | native (60fps) | 4 (contact ±3) | 60fps: 16ms/frame ≈ ≤7cm foot travel; needed vs 3cm margin |
| Stump-hit confirm | native | 2 | bail motion |
| Spark arbitration/calibration | 1280px stills | ≤3 | ~1,400 tokens/img ≈ $0.002 |
| Snick DSP | 16 kHz mono PCM | — | local CPU, free |

### Day 3 (Tue Oct 28) — Calibration (Spark grounding → homography)
- One Spark call per over: single pre-delivery frame (bowler not blocking crease) + structured-output JSON on the normalized 0–1000 grid: both stump bases, popping-crease corners/intersections, wide-line visible point, rope if in frame, per-point visibility/confidence. Denormalize: `x_px = nx/1000·W, y_px = ny/1000·H` (rotation-adjusted pixels — phone mounted landscape; EXIF autorotate on).
- World frame: origin batter-end middle-stump base, x across pitch (half-width 1.525m), y toward bowler (stump-to-stump 20.12m), z up. Landmarks: popping creases y=1.22 / y=18.90 spanning x∈[−1.525,1.525]; wide guide line off-side x=+0.84 (33in, RH batter; sign flips by config); stump height 0.71m.
- Homography: hand-rolled DLT + RANSAC over ≥4 ground-plane points, per-point σ (near points dominate; batter-end points ~20m away get wide σ). Gate: near-field reprojection RMS <8px.
- **Re-calibration triggers:** (1) every over change (end swap moves the camera), (2) drift monitor — ORB-match stored crease features every ~2s, median shift >5px → recal, (3) Spark per-point confidence below threshold, (4) manual CLI flag.
- Manual fallback tool built same day: single-file HTML page (click 4+ points on a frame → JSON), served locally.
- **Exit:** reprojection overlay PNGs + RMS log for all Day-1 clips; unit test: synthetic homography round-trip error <1cm.
- **Kill (S4-fail):** manual click-cal per end becomes primary (30s per innings — acceptable for demo; note for judges).

### Day 4 (Wed Oct 29) — SAM image mode + prompt grammar
- Targets and prompts (SAM prompting is **binary**: concept OR box/point tokens, never both → 400; ≤16 objects; coords in rotation-adjusted source pixels):

| Decision | SAM target | Prompt strategy | Mode |
|---|---|---|---|
| No-ball | front foot | concept "foot" at contact frame → pick mask nearest popping crease; fallback point-token at Spark-grounded foot box center | image, native fps |
| All | stumps | point tokens on Spark-grounded stump base + top | image (once per cal) |
| Wide/bowled | ball | box-token seeded from frame-differencing blob | video (Day 5) |
| Snick corrobor. | bat | concept "cricket bat" | image, 1 frame |

- Parse via `@meta-sam/parser` → `decodeMaskToRaster`; **zero matches = empty `output_text` is a normal result, not an error** (handle as "not found", record evidence). Visualize overlays for eyeball QA. Contact-frame picker: first frame where foot-mask bottom reaches crease-plane line, using mask-bottom velocity.
- **Exit:** on 5 deliveries — foot mask at contact ≥80%, stumps box ≥95%.
- **Kill:** concept prompts unreliable on feet → point-tokens seeded from Spark grounding box.

### Day 5 (Thu Oct 30) — SAM video mode → finalize mode split + cost check
- One SAM **video** request per ball clip; objects `[ball, front foot, stumps]`; metadata `propagation_direction=both`, `include_confidence`, `mask_encoding=one_bit`; stable IDs across 105 frames; parse stream → per-frame tracks.
- Compare against Day-4 image tracks on the same balls; finalize the split: **video = coarse tracking; image = precision instants** (foot contact, stump hit). Reconcile actual billed frames vs §3 arithmetic.
- **Exit:** ≥8/10 balls tracked end-to-end; SAM wall-clock p50/p95 recorded (feeds §6).
- **Kill — mandated SAM-video-unusable fallback:** codec/latency/parse failure → image-mode keyframe tracker: 10fps keyframes, box-propagation greedy tracker (IoU association, ~60 lines TS), 12 frames/ball ≈ $0.03. Same interface, same downstream geometry.

### Day 6 (Fri Oct 31) — Geometry: no-ball & wide (pixel→world)
- **No-ball:** contact frame from Day 4 picker → foot-mask lowest pixel (contact point p) → ground point `w = H·p` → foot lands at bowler-end distance `d = y′_foot − 1.22m`. `d > +3cm → NO-BALL`; `|d| ≤ 3cm → legal (marginal)`; doubt favors batter (only call when clearly over). Parallax guard: at 60fps the raised-foot error ≈ one frame of travel; contact = first ground-touch frame, not arm-fall frame.
- **Wide:** judged where ball crosses the stump plane (y=0). The wide line is a **vertical plane** (x=0.84, z∈[0,0.71]); homography maps ground only, so build the image-space line from two anchors: base `H·(0.84,0,0)`; top = base + (stumpTopImg − stumpBaseImg) from the SAM stump mask (stump pixel height = 0.71m of local scale). Crossing frame = 2D intersection of ball path (linear fit over ±8 frames) with that segment. `ball center beyond line + 10cm → WIDE`; <10cm → legal, flagged close. Ball lost at crossing → extrapolate; still lost → "no call" (never fabricate). Wide suppressed if bat-contact onset (audio) precedes crossing (batter played it).
- Height-wides and leg-side wides: roadmap/stretch (need batter tracking) — leg-side is the only Day-8 stretch candidate, cut by default.
- **Exit:** vitest golden suite — synthetic homography + synthetic tracks → 12 verdicts (marginal ±3cm both sides, raised foot, occluded crease, extrapolated crossing). Manual audit: 10 real balls vs slow-mo second-phone ground truth.

### Day 7 (Sat Nov 1) — Service integration, snick, scoring
- **Node 20 + TypeScript**, single process (why: official `@meta-sam/parser` is npm; `openai` SDK; ffmpeg CLI from Node; DLT homography is ~60 lines of TS — no opencv, no Python service boundary. Python sidecar only if audio/CV accuracy demands it later).
- Queue of ball jobs, stage-memoized to `out/<ballId>/<stage>.json` so re-runs are incremental (protects iteration budget and demo resilience):

```ts
type BallJob = { ballId: string; over: number; ball: number;
  clipPath: string; audioPath: string; releaseT: number; bounceT: number;
  calibration: Homography }  // cached per over
```

- CaptureSource stays swappable (glasses are a roadmap slide, not a dependency):

```ts
interface CaptureSource { readonly kind: 'file'|'live'|'glasses';
  async *deliveries(): AsyncIterable<BallJob>; }
// FileCaptureSource today · phone live stream (same queue) stretch · GlassesSource = Wearables Device Access Toolkit, later
```

- Every external call: timeout + 1 retry; on failure → verdict "no call" + evidence saved. **Demo never hard-fails.**
- Snick DSP (local — Spark audio is degraded per docs): spectral-flux onsets on PCM within [release+0.05, release+0.9]s → candidate frame → Spark image corroboration (bat–ball proximity) → `edge: probable/none` with confidence.
- Bowled: ball track enters SAM stump bbox moving inward ∧ audio thump within ±80ms → BOWLED (+ native-frame bail check).
- Boundary: single umpire POV **cannot see the rope** → event = ball exits frame ≤0.5s after bat contact at high velocity; FOUR/SIX by bounce count (audio spikes between contact and exit; no bounce = SIX). Labeled `boundary (inferred)` unless rope line was grounded in frame. Honest limitation, roadmap: second camera.
- Verdict language: Spark stream, `reasoning_effort=low`, `max_output_tokens=4096` (reasoning tokens bill as output), in = tracks JSON + ≤3 stills; plus one per-over summary call. `zod`-validated `verdicts.jsonl`.
- **Exit:** full over E2E, median ≤40s/ball; per-stage latency table (above) filled with measured p50/p95; overlay clips rendered.

**Latency budget vs 20–40s between-ball gap** (published figures don't exist — S2 measured; images-only for Spark):

| Stage | Budget | Basis |
|---|---|---|
| Trim + downsample (ffmpeg) | 1–3s | measured Day 2 |
| Delivery detect (batch, amortized) | <1s/ball | measured Day 2 |
| Calibration | 0 (cached) / 2–4s per over | Spark single-frame |
| SAM video request (105 frames) | 6–15s | **S2 measures Day 1**; kill >25s → image-mode |
| SAM parse + geometry | <1s | local |
| SAM image precision (4–6 frames) | 2–4s | measured Day 4 |
| Spark verdict (stream, low) | 2–6s | measured Day 7 |
| Overlay render (ffmpeg) | 1–2s | |
| **Total** | **≈9–27s typical, 33s worst** | fits 20–40s ✓ |

### Day 8 (Sun Nov 2) — Accuracy pass on a real session
- Record 4–6 overs from club bowlers; E2E run; audit vs human-labeled truth; fix top error sources (thresholds, prompts, calibration σ). Root-cause every wrong verdict in `docs/accuracy-notes.md`.
- **Exit:** ≥85% verdict agreement on no-ball/wide/bowled across ≥30 balls. Leg-side-wide stretch: only if >80% of day remains.

### Day 9 (Mon Nov 3) — Demo rehearsal & freeze
- Record THE demo session (provable video) + keep raw phone footage as backup demo input. Pre-render fallback output clips into repo so the demo never depends on a live API. README, architecture diagram, roadmap slide (glasses via Wearables Device Access Toolkit, LBW, run-out, leg-side wides). Submission draft.
- **Exit:** demo video captured; fallback assets committed; **code freeze EOD.**

### Day 10 (Tue Nov 4) — Buffer & submit
- Re-render only. Final cut, upload **before 9:00 PM ET**. No new code.

## 3. Cost model per ball (show the arithmetic)

| Call | Volume | Arithmetic | $/ball |
|---|---|---|---|
| SAM video (15fps × 7s) | 105 frames (≥50 min ✓) | 105 × $0.20/1,000 | $0.0210 |
| SAM image precision | 4–6 frames | 5 × $2.50/1,000 | $0.0125 |
| Spark verdict/arbitration | in ≈2K text + 3×1,400 img ≈6.2K tok; out ≈350 tok | (6.2K×$1.25 + 0.35K×$4.25)/1M | $0.0092 |
| Spark calibration (amortized) | 1 call/over ÷ 6 | (1.4K×$1.25 + 0.5K×$4.25)/1M ÷ 6 | $0.0007 |
| **Total** | | | **≈$0.043** |

- 30-ball demo match ≈ **$1.30**. 20 full iteration passes ≈ $8.60. Whole project « $20.
- Dev iteration on `muse-spark-1.3-contributor` ($0.10/$0.20): verdict call drops to ~$0.001 → per-ball ≈ $0.034. **Demo/match calls stay Standard (S6).**
- Never send full match to SAM video (10 min = 15,000 frames = $3.00/request): per-ball trims keep it ~$1. Spark never receives video (S3 default): images only.
- Image-mode fallback cost: 12 keyframes = $0.030 + Spark ≈ **$0.039/ball** — cost is never the deciding factor between modes; latency and reliability are.

## 4. Fallback stack (consolidated)

| If this breaks | Then |
|---|---|
| SAM video mode unusable (S2/S7) | Image-mode keyframe tracker (Day 5 kill): 10fps, IoU box propagation, 12 frames/ball |
| SAM 3.1 entirely unavailable (S1) | Spark grounding boxes per keyframe + frame-differencing/color-blob ball tracker; same geometry downstream |
| Spark calibration unreliable (S4) | Manual click-calibration (30s per end per innings) — built Day 3 regardless |
| Spark unavailable at run time | Geometry-only verdicts + template verdict strings ("NO-BALL — foot 6cm over the line"); confidence flags preserved |
| Ball untrackable at distance (S8) | Frame-differencing + red/white color blob; SAM keeps foot/stumps/bat |
| Audio unusable (wind/chatter) | Snick = visual-only corroboration, marked low-confidence |
| Phone caps at 30fps | Mask-bottom interpolation; no-ball margin widened to 5cm (slower club pace shrinks per-frame travel) |
| Live mode unstable | Demo runs on recorded file — that is the primary plan anyway |

## 5. REPOS / TOOLS

- **Runtime:** Node ≥20 LTS, TypeScript 5.x, `pnpm`, `tsx` (dev runner)
- **API:** `openai` (npm v4.x) with `baseURL: "https://api.meta.ai/v1"`, `apiKey: process.env.META_API_KEY`
- **SAM parsing:** `@meta-sam/parser` (official) → `decodeMaskToRaster`; `build_object_prompt` helper for token grammar
- **Media:** system `ffmpeg` + `ffprobe` (brew): trim (`-ss/-t`), fps filter, `-an` strip, PCM extract (`-f s16le -ar 16000 -ac 1`), transcode (`libx264 -pix_fmt yuv420p`), overlay burn
- **Frames/overlays:** `sharp` (extraction, verdict-card compositing)
- **Geometry:** hand-rolled DLT homography + RANSAC (~60 lines TS) — no opencv; `zod` for Spark JSON validation
- **Audio DSP:** hand-rolled spectral-flux onset on ffmpeg PCM (no dep); Python `librosa` sidecar only if accuracy fails
- **Tests:** `vitest` — golden geometry cases (synthetic homographies), onset-detector fixtures
- **Calibration tool:** single-file local HTML click-page (Day 3)
- **Reference repos (read-only):** MAGNUS (monocular LBW — pitch calibration lessons), OCR-guided YOLOv8 wicket segmentation, AthletiQ (SAM2 cricket), SAM3 NFL tracking
- **Secrets:** `META_API_KEY` lives in `~/.zshrc`; `.env` gitignored; **never in the repo**

## 6. Open risks (carried)

1. All model latencies unpublished — S2 measures Day 1; image-mode fallback caps worst case.
2. Ball visibility at 20m is the single biggest perception risk (S8); detector fallback is cheap but blur-prone.
3. Boundary events are inferred (rope out of frame at umpire POV) — honestly labeled; demo provability leans on no-ball/wide/bowled/snick.
4. Ground-truth labeling (Day 8) depends on getting club bowlers + a second camera angle; without it, accuracy claim drops to "qualitative".
5. SAM video mode on HEVC iPhone output unverified until S7; transcode recipe ready.
