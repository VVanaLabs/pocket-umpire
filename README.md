# Pocket Umpire — working log

Phone at the umpire's POV → AI umpires club cricket: no-ball, wide, boundary, snick, scoring, coach analysis — for <$1 a match. Built for the **Meta Global AI Developer Hackathon** (virtual, indie track; submission due **Nov 4, 9:00 PM ET**).

> Living doc: records how we got here and every decision made along the way.
> Control tower for the build itself: [`PLAN.md`](PLAN.md).

## Status

- [x] Meta API access working (`META_API_KEY` in `~/.zshrc`; `muse-spark-1.3-contributor` set as default pi model)
- [x] Plan built via subagents: `PLAN.md` + 5 docs in `docs/`
- [x] M1 access spike (`docs/spikes.md` — sam-3.1 + muse-spark-1.3 OK, smoke 1.1s)
- [x] Scaffold: TS rules engine + score machine + verdict CLI (19 vitest green, Meta-only)
- [ ] Footage: none yet — M2–M11 blocked until first clip lands
- [ ] Day 10: submit (target: early afternoon ET, ≥6h before deadline)

## Decision log (how we got here)

| # | Decision | Rationale / notes |
|---|---|---|
| 1 | **Meta models via api.meta.ai** (after a failed detour through OpenCode's provider — key was expired, 401 `api_key_expired`; "signing in again will not renew") | User's Meta dev key works; pi's provider config in `~/.pi/agent/models.json`; lesson learned: pi hides a provider whose env-var key is unset |
| 2 | **Hackathon project = cricket umpiring app** ("a meta app for tracking a game of cricket… score, analysis, referee/umpire") | Original "Muse OS / Secure VM" framing and a handwired-adjacent brainstorm were **dropped**; subagent brainstorm produced 5 backburner ideas; cricket won on: load-bearing Meta models, natural latency budget, exact/verifiable output |
| 3 | **20–40s delivery gap = the latency budget.** No real-time needed; umpire POV is already the right camera | This single fact makes the whole thing tractable — deterministic replay, never an improvised live run |
| 4 | **Scope frozen:** IN = front-foot no-ball (MCC 21.5.2), wide (MCC 22), bowled/boundary scoring, audio snick. OUT (roadmap) = LBW, run-out, caught behind | Solo dev, 10 days, demo must work |
| 5 | **No glasses — phone-POV only** (user: "dont have glasses") | Ray-Ban Display was $799 for a demo; hackathon judges Meta's *models*, not hardware. `CaptureSource` stays swappable (file ✅ / live stub / glasses-via-Wearables-DAT roadmap). Glasses became a roadmap slide, not a dependency |
| 6 | **Plan built with subagents** (user: "use subagents to build a plan") | 2 researchers (models/SAM, capture/laws) → 3 area planners (vision, decisions, demo) → 1 master merge = `PLAN.md` + `docs/*`. Project folder created: `~/dev/pocket-umpire` |
| 7 | **Planner calls:** TypeScript/Node over Python; 48kHz audio (16k clips the 2–10kHz snick band); feature freeze EOD D8, code freeze EOD D9; boundary = FOUR default; ~$0.04/ball, ~$17.50 total vs $25 ceiling | Conflicts resolved in favor of the demo deadline |
| 8 | **Voice channel added** (user: "players/umpires via audio to resolve boundary or out-of-camera events") | On-device STT, exact keyword grammar, time-gated to VERDICT_PENDING/SHOWN — $0, <1s. Verbs: confirm / override / resolve / undo. Rescues 4-vs-6 + behind-umpire boundaries. Player "howzat" appeals logged, never auto-score. Spike M11 = STT false-positive rate on field chatter; kill-switch = push-to-talk. Demo beat: *"umpire's word is final"* — AI assists, human stays the boss |

## Documents

| File | What it holds |
|---|---|
| `PLAN.md` | Control tower: merged Day 1–10 timeline, latency budget, spikes M1–M11, cost arithmetic ($25 ceiling), risks |
| `docs/vision-pipeline.md` | SAM 3.1 prompting, Spark POV→pitch calibration, no-ball/wide geometry |
| `docs/decisions.md` | Verdict encodings (MCC laws), arbiter pattern, verdict schema, scoring state machine, snick DSP, **voice channel (§3.5)** |
| `docs/demo-submission.md` | Day-1 shot list, 3:00 demo arc, repo hygiene, submission checklist |
| `docs/research-models.md` / `docs/research-capture.md` | Sourced API facts, capture rungs, MCC ground truth, Wearables DAT roadmap |

## Key facts pinned

- API: `https://api.meta.ai/v1`, openai-responses style; key `META_API_KEY` (env, never committed)
- Pricing: Spark 1.3 $1.25/$4.25 per M (contributor $0.10/$0.20 dev only); SAM video $0.20/1k frames, image $2.50/1k
- Critical unknown: model latencies unpublished — **spike M2 (SAM video-mode timing) on Day 1 decides video vs image mode**; kill at >25s/ball
- Weakest links: snick SNR at ~20m (M5), ball visibility at 20m (M9), foot/crease occlusion (M6)
