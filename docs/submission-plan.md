# Winning-submission plan — indie track (due Nov 4, 9:00 PM ET)

Source of truth: hackathon page fetched 2026-11-01. Indie is judged on exactly
three things: **creativity, technical ambition, whether it works.** Themes:
Build for Your World / Push the Frontier — we sit on both (a firsthand club
problem + a machine doing a job it never could). ~3 days left. Ruthless order below.

## Thesis (one line for the form)
**The phone umpires the game nobody officiates: club cricket called live by
SAM 3.1 + Muse Spark for <$1/match.**

## Why this wins each criterion
- Creativity: nobody points frontier models at the 3M+ unofficiated cricket
  matches a year; umpire-POV + voice verdicts + auto highlights is a new loop.
- Technical ambition: multi-model pipeline (SAM tracking × Spark reasoning ×
  projective geometry × rules engine), cross-footage validation (night tape /
  daylight village), measured latency/cost budget, multi-angle + glasses roadmap
  with the interface already in code.
- Whether it works: 6/6 verdicts on real footage with logs, costs, and timings
  — deterministic replay, no live-demo luck.

## Build order (cut everything else)
1. **Nov 1 (today): blob ball tracker, timeboxed 2h.** Frame-diff → box-prompt
   SAM, audio-gated. If it greens, wides enter the demo; if not, it ships as
   "in progress" and the demo leans on proven verdicts. Either way we stop at 2h.
2. **Nov 1–2: verdict overlay cards on the 6 ball clips** (score bug + verdict
   stamp, Pillow path already proven). These are the demo's visual proof.
3. **Nov 2: 3-min video assembly** (spine below). Voiceover = your own voice,
   phone mic, one take per section; captions burned in; end card + vertical cut.
4. **Nov 2–3: README rewrite** (problem → pipeline diagram → proof table →
   cost → roadmap → credits) + repo tidy (`pnpm verify`: tsc + vitest green).
5. **Nov 3: full rehearsal** — rerun over end-to-end, confirm determinism,
   freeze code. Buffer for fixes.
6. **Nov 4 early afternoon ET: submit.** Never the evening; forms break.

## 3-minute video spine
| Time | Beat | Visual |
|---|---|---|
| 0:00–0:15 | Hook: "No umpire showed up. The phone did the job." | Night six, SIX! stamp |
| 0:15–0:40 | Problem: unofficiated club cricket, disputes, cost | Stills + one-line stats |
| 0:40–1:20 | The over: 3 balls with verdict cards appearing live | Clips + score bug 0/0→14/0 |
| 1:20–1:50 | How it works: SAM tracks → Spark judges → geometry decides | Track overlays, grounding dots |
| 1:50–2:15 | Proof it generalizes: daylight village footage + $0.026/ball ticker | vil1 clip, cost table |
| 2:15–2:40 | What's next: second phone, glasses, auto highlights reel | Vertical reel fullscreen |
| 2:40–3:00 | Coach card, repo link, footage credits, "Push the Frontier" | End card |

## Cut list (explicitly not doing)
- Live-phone transport, auto clap-sync, auto-posting, per-player reels, LBW,
  real no-ball/wide footage, TTS voiceover. All live in roadmap docs, none block.
- More footage: two sources validated is enough; a third adds risk, not points.

## Risks → mitigations
- Blob tracker fails → demo stands on 6/6; tracker becomes "active R&D" slide.
- Video render hell → stills + captions version is the fallback; story > polish.
- Form/deadline → submit Nov 4 afternoon ET with screenshots of confirmation.

## Form copy (draft)
- Title: **Pocket Umpire — AI umpire for the games nobody officiates**
- Tagline: *SAM 3.1 sees it, Muse Spark calls it, any phone can be the umpire.*
- Description: problem (3M+ unofficiated matches) → pipeline → proof (6/6,
  $0.026/ball, 10s) → validation (2 footages) → roadmap (angles, glasses,
  highlights) → repo link.
