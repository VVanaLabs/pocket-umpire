# Pocket Umpire — Demo, Video & Submission Plan

**Window:** Day 1 = Oct 26 → Day 10 = Nov 4 (submission due **9:00 PM ET**). Solo dev.
**Deliverable:** working demo **video** (primary judging artifact) + public repo + Cerebral Valley form.
**Golden rule:** the video proves "does it work" — everything live is optional. Build the pipeline so the demo is a *deterministic replay* of Day-1 footage through the real system, never an improvised live run.
**Judge scoring:** creativity · technical ambition · **does it work**. Theme "Push the Frontier." Budget line to repeat: *"$0.03/delivery, <$1 per match vs $100K+ Hawk-Eye."*

**Pre-window (ASAP, before Day 1):** book ground/net slot + recruit 3–4 players for Day 1 filming; confirm backup friend session; charge both phones, free ≥60 GB storage; print/screenshot consent line.

---

## 1. Day-by-day plan (spikes/kill-switches inline)

### Day 1 (Oct 26) — FILM + ACCESS SPIKES. Nothing gets built before this.
- **AM — Access spike (S1):** `models.list()` on the key; confirm `sam-3.1` + `muse-spark-1.3` respond (no `404 model_not_found`). One smoke call each (1 image → SAM; 1 text → Spark). *Kill-switch:* no SAM access → Spark-grounding → local OpenCV crease/foot geometry only; escalate key issue in parallel.
- **Field session (90 min, main event):** shot list in §2. Chest mount primary; clap-sync every take; second phone parked 2–5 m behind stumps as close-mic reference.
- **EOD spikes on first clips, decide kill-switches:**
  - **S2 — snick SNR:** spike vs ambient at ~20 m (phone MEMS mic) on the snick takes, close mic as control. *Kill-switch:* no clear spike → snick leaves live demo; fallback = synced close phone as virtual stump mic; final fallback = cut snick, say so in limitations.
  - **S3 — front-foot legibility:** is the landing foot + popping crease **back edge** legible at the landing frame despite bowler self-occlusion? *Fallbacks:* cap-brim/head-strap mount, bowler approaches 1–2° off line, manual crease calibration overlay.
  - **S4 — latency:** 5 s delivery clip → SAM 3.1 video track + Spark verdict (low/medium effort). Target ≪ 20–40 s. *Fallback:* 15 fps subsample, trim frames, `reasoning_effort: low`.
  - **S5 — Spark video token cost** via `/v1/responses/input_tokens` on a real clip (docs don't publish video→tokens).
  - **S6 — AV sync:** compare spike/clap offsets on both devices. *Fallback:* clap-sync ritual per take (already filmed in).
  - **S7 — 1080p60 sustainability:** battery/thermal over 30 min continuous + audio. *Fallback:* 1080p30.
- **Mode note:** dev iteration may use `muse-spark-1.3-contributor` ($0.10/$0.20); all calls on match/demo footage stay **Standard** `muse-spark-1.3` (no training on match video).
- **Exit:** footage on disk + labeled; S1–S7 each pass/fail/assigned-fallback; detectors' scope frozen.

### Day 2 (Oct 27) — FOOTAGE LOCK + CALIBRATION
- Ingest: trim to per-delivery clips; `manifest.csv` = clip id, scripted verdict, landing/bat-crossing frame, boundary flag. This manifest is ground truth for every later claim.
- POV→pitch calibration: Spark 1.3 grounding (normalized 0–1000 grid point/box prompts) → crease lines/stumps/pitch corners in pixel coords; map to calibrated pitch coords.
  - **Spike (from research):** grounding-grid accuracy on POV cricket frames is untested. *Fallback:* one-time manual calibration tool (click 4 pitch corners + crease lines on one frame) — manual mode stays in the product either way as a calibration UI.
- Front-foot no-ball detector v1 (MCC 21.5; judge at **back edge** of popping crease; instant = front-foot landing frame) on real clips vs manifest.
- **Contingency:** if Day 1 filming failed (weather/no-show) → film today (staged friend session), shift calibration to Day 2 evening, steal Day 3 slack.
- **Exit:** ≥20 clips calibrated; front-foot detector agrees with manifest on all no-ball takes.

### Day 3 (Oct 28) — WIDE + SCORING EVENTS
- Wide detector v1 (MCC 22) in calibrated pitch coords: configurable off/leg thresholds (no MCC "one bat width" — clubs differ; pick defaults, note "one calibration conversation with a club umpire" in limitations). Ball path from SAM per-frame track; verdict at stumps-crossing frame.
- Bowled: ball track vs stumps track proximity at impact frame; Boundary: ball reaches rope region / chase cutoff.
- Ball-by-ball scoring state machine (legal/wide/no-ball/runs/4/6) → scoreboard updates.
- **Exit:** all Day-1 scripted events reproduce from raw clips through the real pipeline.

### Day 4 (Oct 29) — SNICK DSP (only if S2 passed)
- 48 kHz phone audio as master clock; band-pass 2–10 kHz → RMS envelope (5–10 ms windows) → adaptive threshold (~+8–10 dB over rolling median) → binary "sharp sound" gated to ±250 ms of predicted bat-crossing frame.
- **No model audio** — Spark 1.3 audio understanding is degraded; DSP-only by design.
- Report binary, never bat-vs-pad. Overlay the waveform on the demo frame (judges *see* the detection).
- If S2 failed: implement the waveform overlay + honest caption only if the close-mic fallback works; else cut snick from the arc and give the 35 s to the coach analysis.
- **Exit:** snick take (and 2–3 near-miss takes) classified correctly or scope formally cut.

### Day 5 (Oct 30) — INTEGRATION
- `CaptureSource` interface first-class; `FileSource` (recorded clip) is rung 1 and the demo path; stub `LivePhoneSource` + `GlassesSource` signatures for the architecture slide (no implementation — roadmap).
- Verdict orchestrator: one Spark call per delivery (selected frames + event JSON → structured verdict output, `reasoning_effort` low/medium, `max_output_tokens` ≥ 4000); SAM calls for track/foot masks; verdict lands inside the 20–40 s gap — **measure and log it**.
- Scoreboard UI + verdict card (big text + zoomed evidence frame + elapsed-time watermark).
- **Exit:** full scripted over plays end-to-end from `FileSource`, verdicts match manifest, latency logged.

### Day 6 (Oct 31) — COACH ANALYSIS + POLISH
- Over-end Spark call: per-over event log → 3-sentence tactical card ("2 wides drifting down leg; front foot marginal on ball 3; bowl wider of off"). Stream it; it appears while the over is being walked back.
- Human-override button on the verdict card ("umpire's call wins" — honest positioning, plays well with judges).
- Polish: error states (API down → clear message, not a crash), replay-from-any-clip control.
- **Exit:** demo arc elements all exist; nothing new after today except fixes.

### Day 7 (Nov 1) — FEATURE FREEZE + REPO
- Freeze. Demo harness = one command replaying the scripted 6-delivery over deterministically.
- Repo (§4): README + GIF + architecture diagram + how-to-run + `.env` handling + honest limitations (anything still broken goes in limitations, not into a Day-9 scramble).
- Draft all submission form copy (§5).
- **Exit:** fresh `git clone` → `.env` → run → same verdicts. Judges-grade reproducibility proven once.

### Day 8 (Nov 2) — REHEARSAL 1 + SCREEN CAPTURE
- Full timed run-through of the demo workflow; **record the screen capture** (OBS/QuickTime, 60 fps, laptop driving the pipeline) — this is the video's spine.
- Show the raw cut to one cold viewer (no context); note every moment they don't get in ≤5 s.
- List video edits + any app fixes; app fixes only if trivial (freeze discipline).
- **Exit:** usable screen capture + written edit list.

### Day 9 (Nov 3) — VIDEO EDIT + REHEARSAL 2
- Edit to the §3 arc (iMovie or ffmpeg); captions burned in; narration; export 1080p H.264; upload YouTube **unlisted**; verify link in incognito; add chapter timestamps.
- Rehearsal 2: full run-through on the final build + 2-minute live pitch rehearsal (for any demo-hour / interview ask).
- Finalize form fields; repo public-ready check (§5 checklist).
- **Exit:** video live at a working URL; form copy done; repo judge-ready.

### Day 10 (Nov 4) — SUBMIT EARLY
- Run the §6 checklist in the morning; **submit by early afternoon** (buffer for form/YouTube failures). Save confirmation screenshot. Post repo link; stop.

---

## 2. Footage acquisition (Day 1 field session)

**Rule: film BEFORE building.** 90-minute session, one ground, both phones.

**Mounts:** chest mount primary (KINGKI/ARMOR-X magnetic chest mount, ~$20–40 — phone weight makes cap-brim unreliable; capture head-strap GoPro-style as B-roll only). Landscape, 1080p60 if S7 passes else 1080p30, lock exposure if possible.

**Shot list — ≥20 deliveries + helpers:**

| # | Deliveries | Purpose |
|---|---|---|
| 12 | Legal (mix pace/spin, lengths; a few with runs) | baseline verdicts + scoring |
| 2 | Deliberate front-foot no-balls (1 obvious toe-over, 1 marginal) | no-ball detector |
| 2 | Deliberate wides (1 wide outside off, 1 down leg) | wide detector |
| 1 | Boundary along the ground to the rope | auto-score |
| 2 | Boundary that EXITS FRAME (behind the umpire) — umpire calls "four", then "six" aloud | voice-resolved out-of-frame events |
| 1 | Snick (batter deliberately edges a defensive shot) | audio spike |
| +2–4 | Spares of each scripted category | editing margin |

**Per take:** audible clap in frame (sync fallback), bowler announces take number; on out-of-frame takes the umpire speaks the call crisply toward the phone.
**Helpers:** static pan of full pitch from mount position; crease close-ups; pace out pitch length on camera (calibration references). Second phone on mini-tripod 2–5 m behind stumps recording continuously (close-mic snick reference + S2 control).
**Consent:** verbal consent on camera from every player ("filming for a hackathon demo — OK?") + a written note of names; no bystander faces; footage stays local; only consented clips ever get committed to the repo.
**Backup:** staged session with a friend same ground/next slot (Day 2 contingency above).

---

## 3. Demo arc — 3:00, exact shot list

| Time | Shot | Content |
|---|---|---|
| 0:00–0:15 | Hook | Raw POV: bowler runs in; title: "Club cricket has no umpire tech. Hawk-Eye costs $100Ks. This phone umpires for <$1." |
| 0:15–0:35 | Setup | Phone in chest mount, app recording; 3-second architecture: CaptureSource → SAM 3.1 track + Spark verdict → scoreboard. One line: "works on recorded video today, live phone next, Meta glasses on the roadmap." |
| 0:35–1:15 | Verdict between balls | Delivery 1 → elapsed timer → **"NO-BALL — front foot over the crease"** + zoomed landing frame with crease overlay. Delivery 2 → "legal · 1 run", scoreboard ticks. (Scripted takes #1–2.) |
| 1:15–1:45 | Wides + boundary + voice | Wide → calibrated off-side line overlay → **"WIDE"**. Boundary → **"FOUR"** auto-scored. Ball exits frame behind the umpire → he says "six" → scoreboard: **6**, tagged "voice call — umpire's word is final". (Takes #3–7.) |
| 1:45–2:20 | Snick + coach | Edge → audio waveform overlay, spike at bat-crossing → **"sharp sound at bat-crossing"**. Over completes → **Spark coach card** (over analysis, 3 sentences). (Takes #6–7.) |
| 2:20–2:45 | Roadmap slide | §5 roadmap: glasses via Wearables DAT → second unit for run-outs → LBW triangulation. |
| 2:45–3:00 | Close | Cost line ($0.03/delivery · <$1/match vs $100K+), repo URL, "Push the Frontier." |

**Honesty rules:** elapsed-time watermark on every verdict (real latency, no fake speedups); captions state what each detector actually claims (binary "sharp sound", not "edge confirmed"); voice-resolved verdicts always carry the "voice call" tag; if snick was cut, that slot becomes a second coach-analysis beat.

---

## 4. Repo hygiene for judges

- **README top:** ≤10 s verdict GIF (ffmpeg `palettegen`/`paletteuse`, <5 MB) + one-line pitch + demo video link + cost line.
- **Architecture diagram:** Mermaid source + committed PNG/SVG render; show CaptureSource with three implementations (File ✅ live-stub / Glasses roadmap).
- **How-to-run:** `cp .env.example .env` → paste `META_API_KEY` → one command replays the sample over. Include 2–3 consented sample clips (≤20 MB each) so judges run it in minutes; models used + cost table.
- **Key handling:** `.env` in `.gitignore` from commit #1; key sourced from `~/.zshrc` during dev; README warning line; self-check before public: `git log --all -p | grep -iE 'meta_api|sk-'` → clean.
- **Honest limitations (own it before judges find it):** single fixed POV; 20–40 s between-ball latency (not real-time — by design, cricket gives us the gap); snick = binary sharp-sound, not bat-vs-pad, and depends on Day-1 mic SNR; Spark grounding fallback = one-time manual calibration; no LBW/run-out/caught-behind (roadmap); Spark audio degraded → local DSP by design; the umpire's call always overrides the app.
- MIT license. Keep the video project file locally through Day 10 (fast edit fixes).

## 5. Submission mechanics

**Form fields — draft Day 7, finalize Day 9:** project name; tagline ≤140 chars ("A phone at the umpire's POV that calls no-balls, wides and edges — ball-by-ball — for under $1 a match."); description (problem → what it does → how: SAM 3.1 + Muse Spark 1.3 → what's real vs roadmap); video URL; repo URL; team/contact (monitored email); track = indie; theme answer ("Push the Frontier": frontier = frontier sports tech for the 99% of cricket without Hawk-Eye money).

**Rehearsals:** Day 8 full run-through + cold viewer; Day 9 run-through on final build + 2-minute live pitch. Timed; deviations logged.

**Demo-failure fallbacks (in order):**
1. The video *is* the demo — pre-rendered, zero live risk in the submission.
2. Any live ask → replay mode via `FileSource` (deterministic, no network surprise... until the API): pre-rendered verdict clips exist per delivery as the offline answer.
3. YouTube link rot → local copy + Drive mirror linked in README.

## 6. Roadmap slide (one slide, three lines + tag)

1. **Hands-free: Ray-Ban Meta glasses** via Wearables Device Access Toolkit — camera frames stream straight into this app; Mock Device Kit for hardware-free dev. "Dev mode today; public ship needs Meta review (timeline unpublished)."
2. **Second unit at the bowler's end** → run-outs and a second no-ball angle.
3. **LBW trajectory** — per-frame SAM ball tracking + calibrated pitch geometry → projected path (monocular precedent: MAGNUS); impact + wicket zone = Hawk-Eye-style review for <$1.
Tag: *"Everything above is a CaptureSource and one more detector away."*

## 7. Submission-day checklist (Day 10 morning)

- [ ] Video live, unlisted; link opens in incognito; chapters set; captions legible on mute
- [ ] Fresh clone → `.env.example` → run → sample over replays with correct verdicts
- [ ] README renders: GIF loads, diagram shows, limitations section present
- [ ] Secrets clean: `git log --all -p | grep -iE 'meta_api|sk-'` → empty; `.env` never committed
- [ ] Only consented clips in repo
- [ ] Form fields pasted, track correct, contact email monitored
- [ ] **Submitted by early afternoon ET** (deadline 9:00 PM ET) + confirmation screenshot saved
- [ ] Backup: local video copy + Drive mirror linked in README
