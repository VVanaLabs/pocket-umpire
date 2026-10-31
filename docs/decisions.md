# Decisions Layer Plan — umpiring verdicts, scoring, analysis (Pocket Umpire)

Scope: the brain. Input = one delivery clip + audio from `CaptureSource` (recorded file for the demo; interface stays swappable for live/glasses). Output = structured verdict (JSON), score state, spoken line + overlay card, post-over analysis. Hard rule for the architecture story: **geometry rules live in code; models do perception; Spark arbitrates only ambiguity.** A verdict must be deterministic given calibrated geometry — the model never vibes a decision.

Timeline: Day 1 = Sat Oct 26 … Day 10 = Tue Nov 4 (submission due 9:00 PM ET). Solo dev. Between-delivery latency budget: **20–40 s** (no real-time needed).

---

## 0. Pipeline shape (one delivery)

```
clip+audio → decode → [calibration cache] → delivery segmenter (release frame)
   ├─ SAM 3.1: ball track, front foot + crease line, stumps/bails, striker box
   ├─ homography: pixels → calibrated pitch coords (meters)
   ├─ RULE CHECKS (pure code, unit-tested): Law 21.5 front-foot, Law 22 wide, boundary, bowled
   ├─ AUDIO DSP (offline-grade, no model): snick spike detect, audio=master clock
   ├─ margin < ε ? → Spark arbiter (structured output) on annotated evidence frames
   → VERDICT JSON → score state machine → ball log → overlay card + TTS
after over 6 → ball log → Spark → over summary + coach analysis; renders: pitch map, wagon wheel
```

Calibration (once per session): one Spark perception-grounding call on a static pitch frame → crease lines, pitch corners, boundary in normalized 0–1000 grid → px conversion → homography to pitch meters. Cached as `calibration.json`; re-run if the mount shifts. Cost ≈ 1.4K tokens ≈ **$0.002**.

---

## 1. Decision encoding — explicit rule checks over calibrated geometry

### 1.1 Front-foot no-ball — implements MCC **Law 21.5** (21.5.2)
- Judgment instant = **front-foot landing frame** ("some part of the foot, whether grounded or raised, behind the popping crease" — a toe aloft behind the line is legal).
- **Popping crease = back edge of the white line** (Law 7.3) → calibrate the legal boundary to the back edge, not line center; toe **on** the line is legal.
- Perception: SAM 3.1 segments (a) front foot at landing frame, (b) popping-crease line; homography maps both to pitch coords. Rule: `margin_cm = dist(foot_rearmost_point, crease_back_edge)`; `pass` if any part of the foot (segmented mask extent) is behind the back edge.
- **Occlusion risk** (bowler's own foot occludes near-field crease at landing): Day-1 footage spike decides. Mitigation: judge at landing frame −1..−3 where the foot is still visible approaching the crease + SAM mask extent; Spark arbiter for the rest.
- Back-foot / return-crease check (21.5.1) is out of demo scope — POV can't see it reliably; UI states we enforce 21.5.2.

### 1.2 Wide — implements MCC **Law 22**
- Encode: ball crossing position at the popping-crease plane (from SAM ball track) in calibrated coords, vs **configurable thresholds** `WIDE_OFF_M`, `WIDE_LEG_M` relative to striker's stance center (SAM striker box). Plus above-head-height check (22.1.1.2) via striker box top vs ball height.
- Law overrides encoded as code: striker movement cancels (22.4.1 — if stance box shifted > δ during delivery, widen thresholds), bat/person contact cancels (22.4.2 — snick signal or SAM bat/ball overlap), **no-ball overrides wide (21.13** — evaluate no-ball first, wide only if legal**)**.
- No MCC "one bat width" rule exists — threshold defaults = limited-overs convention, generous down-leg; **Day-1 conversation with a local club umpire** fixes the default; value lives in config, shown in the UI.
- Hardest detector (needs trajectory + striker pose) → ships last, lowest accuracy bar, falls back to "down-leg = wide" binary.

### 1.3 Spark as arbiter (ambiguity only)
- Each rule check emits `margin` + `confidence`. If `|margin| < ε` (ε: foot 5 cm, wide 15 cm) or perception confidence < 0.6 → route to Spark: send 2–3 annotated evidence frames (overlay: crease line, foot mask / trajectory + threshold lines, rendered with OpenCV/PIL) + one-line question. `muse-spark-1.3`, `reasoning_effort: low`, structured output, `stream: true`. Spark may return `unclear` → verdict shows "umpire's call" with the code-computed side.
- Arbiter prompt pattern: "You are a cricket umpire reviewing this calibrated frame. The white line is the popping crease; its back edge (marked) is the legal boundary. Does any part of the landing foot sit behind the back edge?" — never open-ended.

### 1.4 Verdict schema (per delivery, stored as `verdicts/O{over}B{ball}.json`)

```json
{
  "delivery_id": "O2B4",
  "decision": "legal | no_ball | wide",
  "decision_source": "pipeline | voice | voice_override",
  "checks": {
    "front_foot": {"status": "pass|fail|unclear|n/a", "margin_cm": 6.2, "law": "MCC 21.5.2", "landing_frame": 1204},
    "wide":        {"status": "pass|fail|unclear|n/a", "margin_cm": 41.0, "law": "MCC 22.1.1", "crossing_frame": 1288},
    "snick":       {"detected": true, "spike_ms": 1180.4, "snr_db": 12.5, "bat_crossing_frame": 1286},
    "boundary":    {"detected": false}, "bowled": {"detected": false, "law": "MCC 29"}
  },
  "confidence": 0.86,
  "evidence": [
    {"frame": 1204, "t_s": 12.31, "kind": "foot_landing", "overlay": "overlays/O2B4_landing.jpg"},
    {"frame": 1288, "t_s": 13.07, "kind": "crease_crossing", "overlay": "overlays/O2B4_crossing.jpg"}
  ],
  "arbiter": {"used": true, "model": "muse-spark-1.3", "response_id": "resp_...", "question": "front_foot"},
  "timings_s": {"decode": 1.1, "sam": 6.2, "rules": 0.05, "arbiter": 8.9, "render_tts": 1.4, "total": 17.7}
}
```

## 2. Scoring events + state

- **Bowled (Law 29)**: SAM ball track reaches stump plane → check bails (small objects atop stumps, tracked from frame 0) for displacement within the next ~5 frames. Binary. Fallback: single Spark frame query "has a bail been dislodged?"
- **Boundary**: ball track (or, if lost, the last-known + Spark clip query) crosses the calibrated boundary polygon. 4 vs 6 ignored in v1 — "boundary" = 4 runs, UI notes it. Roadmap note for 6.
- **Ball log** (append-only JSONL, `match/ball_log.jsonl`): `{delivery_id, over, ball_legal_index, bowler, batter, decision, runs, wicket:{type}|null, events:[...], verdict_ref, clip_ref, t_recorded}`.
- **State machine** (`score.py`, pure code, unit-tested):

| State | Transition |
|---|---|
| `READY` | release frame detected → `IN_FLIGHT` |
| `IN_FLIGHT` | ball dead (track lost / stump plane passed / T+2s) → `VERDICT_PENDING` |
| `VERDICT_PENDING` | checks + optional arbiter done → `VERDICT_SHOWN` (card + TTS fire) |
| `VERDICT_SHOWN` | voice confirm ("yes"/"over"), voice override, or 5 s → `SCORE_UPDATED`: legal → `balls+1`; wide/no-ball → 1 run, rebowl (Laws 22.6 / 21.13); boundary/bowled applied |
| `SCORE_UPDATED` | 6 legal balls → over complete, trigger analysis layer → `READY` |

Score = runs / wickets / overs.(legal balls). Illegal deliveries never increment the ball count. Wide+no-ball mutual exclusion via 21.13 ordering.

## 3. Audio snick (v1 = binary "sharp sound")

- DSP (code only — Spark 1.3 audio is degraded, don't use model audio): extract 48 kHz mono PCM → band-pass **2–10 kHz** → RMS envelope, **5–10 ms** windows → spike when RMS ≥ **+8–10 dB** over 1 s rolling median → candidate timestamps.
- Gating: candidate is a snick candidate only if it lands within **±250 ms of the predicted bat-crossing frame** (ball track at striker plane). Output: `{detected, spike_ms, snr_db}` — **never** claims bat-vs-pad (frequency content decides later; roadmap).
- **Sync strategy: audio is the master clock** (20.8 µs resolution vs 16–33 ms frames). Container audio + video pts from the same device recording → trust pts. Day-1 spike validates drift; if drift > ~½ frame, add a **clap-sync ritual** (clap at record start, align clap transient to first frame) as a standing pre-recording step.
- Tuning: sweep band-pass bounds, window size, and dB threshold over the labeled footage set; pick the operating point on an ROC-style table; lock values in `config.toml` with the footage date.

## 3.5 Voice channel — players/umpire resolve what the camera can't

The umpire's word is legally final (the app assists, never overrules) — so give the human a voice input on the same 48k PCM we already capture.

- **v1 mechanics (no LLM, $0):** on-device STT (iOS `Speech` / Android `SpeechRecognizer`; `whisper.cpp` fallback) → **exact keyword grammar** {four, six, wide, no ball, out, not out, over, undo}. **Time-gated**: keywords only count while a ball is `VERDICT_PENDING`/`VERDICT_SHOWN` — kills false positives from field chatter and appeals.
- **Semantics:** *confirm* ("yes"/"over" accepts pipeline verdict) · *override* (spoken decision wins; logged with evidence clip, `decision_source: voice_override`) · *resolve* (out-of-frame event: ball exits frame behind the umpire → "four"/"six" sets runs + boundary) · *undo* (rollback last ball).
- **Rescues two cut/weak items:** 4-vs-6 (was stretch) and behind-umpire boundaries (was frame-exit-inferred only).
- **Player appeals** ("howzat!"): logged as `events:["appeal"]` review hints, **never** auto-score (roadmap: appeal→review flow).
- **Cost/latency:** on-device STT <1 s, $0 — no change to the latency budget or cost model.

---

## 4. Analysis layer (post-over, trivial cost)

| Artifact | How | Est. cost |
|---|---|---|
| Over summary card | ball log (JSON) for the over + 2–3 evidence thumbnails → Spark 1.3 structured output: `{runs, wickets, key_events[], 2–3 sentence coach analysis}` | ~3K in / ~400 out ≈ **$0.005/over** |
| Coach voice-over | same text → platform TTS (free, offline) | $0 |
| Pitch map | bounce points (calibrated coords from ball track) → PIL/SVG overlay on pitch diagram; **no model** | $0 |
| Wagon wheel | shot direction = calibrated bearing at boundary crossing / last-known track → line render; **no model** | $0 |
| Match summary (demo closer) | full ball log + 3 frames → `muse-wonder-1.0` once | ~$0.10 |

Whole 6-over demo match: **<$0.50 total model spend** (SAM ≈ $0.03/delivery is the floor; Spark verdicts + analysis are cents). Wonder only if Spark's summary reads flat in review.

## 5. Verdict output — voice + overlay

- **Overlay card**: rendered annotated frame (SAM masks + crease line + verdict banner: decision, confidence, margin in cm, law ref, evidence thumbnails; snick shows the RMS waveform with the spike marked — judge-friendly visual). Rendered from the verdict JSON by one renderer module (OpenCV→PIL).
- **TTS**: platform TTS (iOS `AVSpeechSynthesizer` / Android `TextToSpeech`) — free, offline, <1 s. Scripted lines: "No ball — front foot over the line." / "Wide, down the leg side." / "Good ball, no run." / snick: "Edge — sharp sound at the bat." Wicket first, then decision.
- **Latency budget** (budget 40 s; target p95 ≤ 30 s):

| Stage | Budget | Note |
|---|---|---|
| decode + delivery segmentation | 2 s | ffmpeg/OpenCV; release-frame detect is cheap |
| SAM 3.1 video track (ball + foot + stumps, one call) | 5–10 s | 150 frames ≈ $0.03; 3K RPM is no constraint |
| homography + rule checks | <0.1 s | pure code |
| Spark arbiter (only marginal deliveries) | 5–15 s | stream + `reasoning_effort: low`; **measure Day 2** — biggest unknown |
| card render + TTS | 2 s | local |
| **Total** | **14–29 s** | fits; non-marginal deliveries skip arbiter → ~10–15 s |

Kill-switch if Spark verdict latency > 25 s: run checks-only verdict (geometry + confidence), arbiter becomes post-hoc "second opinion" shown in the over summary instead.

---

## 6. Day-by-day plan (Day 1 = Oct 26)

| Day | Build | Done means |
|---|---|---|
| **1** | **Spike day + footage.** Record 15–20 real club deliveries, chest-mount, 1080p60 (also: a static pitch calibration frame; clap-sync clips). Run: snick SNR analysis on footage; Spark grounding → crease JSON + homography prototype on the calibration frame; `client.models.list()` key check; one `/v1/responses/input_tokens` timing on a delivery clip; club-umpire wide-threshold conversation. Start ground-truth sheet. | Footage + labels sheet exist; calibration.json v0; SNR number recorded; **kill-switch decisions made for snick + front-foot legibility** |
| **2** | **Rule engine core.** `geometry.py` (px→meters homography, crease coords) + `rules.py` (Law 21.5.2 check, wide thresholds, 21.13/22.4 ordering) with unit tests on synthetic geometry (12+ cases: toe-on-line legal, raised-foot-behind legal, back-edge boundary). Measure Spark arbiter latency with a real key. | `pytest rules` green; arbiter round-trip timed (go/no-go vs 25 s switch) |
| **3** | **Perception backbone.** SAM 3.1 per-delivery call: concept-prompt `cricket ball` track + foot/crease/stumps objects; delivery segmenter (release frame); bat-crossing frame prediction. Ball log schema v1 + state machine skeleton. | Ball track + landing/crossing frames extracted for ≥15 of 20 footage deliveries |
| **4** | **Front-foot + wide end-to-end + arbiter.** Wire SAM masks → rules; annotation overlay renderer v1; Spark arbiter structured-output call for marginal cases; verdict JSON assembled. Run on all labeled footage. | No-ball + wide verdicts on footage; accuracy vs hand labels recorded; overlays look judge-legible |
| **5** | **Snick pipeline.** Full DSP on footage; sync validation (pts vs clap); threshold tuning table vs ground truth; waveform viz artifact. **Formal snick kill-switch decision.** | Snick verdict per delivery + ROC table; decision recorded: in-demo / stump-mic fallback / roadmap-only |
| **6** | **Scoring events + score.** Bowled (bail displacement), boundary (polygon crossing); state machine complete; full verdict JSON per delivery; JSONL ball log writes. | Mock 2-over input → correct score; unit tests for illegal-ball counting |
| **7** | **Output layer + accuracy pass.** Overlay card final (waveform, law ref, margins), TTS lines, end-to-end CLI: clip in → verdict+card+voice out; run on all 20–30 labeled balls; fix top-3 failure modes; p50/p95 latency measured. | p95 ≤ 30 s; per-detector accuracy table filled; ≥90% no-ball accuracy on legible deliveries |
| **8** | **Analysis layer.** Over-summary Spark structured call, pitch map + wagon wheel renders, coach TTS; wire into over-complete transition; demo script for the post-over segment. | One over → summary card + renders, cost logged |
| **9** | **Hardening / freeze.** Record a full 2-over mock innings through the real pipeline; fix top failures only; finalize thresholds + config toggles (snick on/off, arbiter on/off fallback switches); re-run labeled regression set. **Code freeze end of day.** | Full match runs clean twice; regression accuracy ≥ Day-7 numbers; toggles proven |
| **10** | **Demo + submit.** Record demo video (one over live-narrated + verdicts + over analysis), cut, repo README (architecture diagram: rules-in-code/models-perceive/Spark-arbitrates), submission. Due **9:00 PM ET**. | Submitted |

## 7. Test strategy — recorded footage is the only test harness

- **Ground truth**: hand-label all Day-1 footage (target 20–30 deliveries): `labels.csv` = delivery_id, no-ball y/n (+ which edge), wide y/n (+ side), snick heard y/n (headphones, 3 listens), boundary/bowled y/n, landing-frame legibility (good/partial/occluded), bounce location (off/straight/leg), notes. One labelling session Day 1 evening; revisit Day 7 with fresh ears.
- **Acceptance bars** (footage set): front-foot ≥ 90% on `good/partial` legibility (occluded deliveries excluded and reported honestly); wide ≥ 80% (v1); bowled/boundary ≥ 95% (binary events); snick = per kill-switch, reported as detection rate + false-positive count per over.
- **Regression**: labeled set is the CI — rerun after every detector change (Day 4, 5, 6, 7, 9); any accuracy drop blocks the change.
- **Synthetic unit tests** (no footage needed): rules.py geometry cases incl. the two famous edges — *toe on the line = legal* (back-edge rule) and *raised foot behind the line = legal* (grounded-or-raised rule). These are the demo's credibility moments; test them explicitly.

## 8. Day-1 spikes (decide before building on them)

| # | Spike | Method | Kill-switch / fallback |
|---|---|---|---|
| S1 | **Snick SNR at ~20 m** (biggest risk) | 15–20 chest-mount deliveries; measure 2–10 kHz spike SNR vs ambient | Edges invisible → snick leaves live demo, becomes roadmap; optional second phone as synced virtual stump mic only if user approves scope |
| S2 | **Landing-frame legibility** from chest POV | Inspect footage: foot + crease both visible at landing in ≥70% of deliveries | Partially occluded → judge at pre-landing frames + mask extent; fully occluded → front-foot ships as "review assist" (slow-mo + overlay for the human), framed honestly in demo |
| S3 | Model access + arbiter latency | `client.models.list()`; timed Spark structured-output call Day 1–2 | Missing model → swap model ID (Spark 1.2 fallback); latency >25 s → arbiter moves to post-hoc (§5 switch) |
| S4 | A/V sync drift | pts alignment + clap test on both test devices | Drift > ½ frame → clap-sync ritual becomes a pre-recording step |
| S5 | 1080p60 + audio sustainability | 20-min continuous record: battery/thermal/storage | Degrades → 1080p30 (frame accuracy still fine; audio clock unchanged) |
| S6 | Wide threshold default | Conversation with a local club umpire | No umpire available → ship limited-overs defaults, labeled in UI as configurable |

## 9. Fallbacks summary (what degrades, what never breaks)

- **Never degrades**: rules-in-code verdicts given geometry; score state machine; ball log; overlay rendering. These are pure local code.
- **Graceful**: arbiter off → code verdict + confidence shown; snick off → log records `audio: unavailable`; boundary/bowled ambiguous → Spark clip query instead of geometry; analysis layer skips Wonder.
- **Demo-day insurance**: every verdict path works on pre-recorded Day-1 footage; the demo video is recorded Day 10 morning from the Day-9-hardened pipeline, never live-field-dependent.

Cost sanity: full 6-over demo match (36 deliveries): SAM ≈ $1.10, Spark verdicts+analysis ≈ $0.30, Wonder closer ≈ $0.10 → **≈ $1.50 total**.
