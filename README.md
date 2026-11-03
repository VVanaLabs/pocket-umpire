# Pocket Umpire — the phone umpires the game nobody officiates

Most cricket on Earth is played without officials: club, tape-ball, and
street matches where scoring is memory and disputes settle arguments, not
matches. Pocket Umpire turns match video into a **ball-by-ball scorebook,
verdict cards, and shareable highlights** — SAM 3.1 perceives, Muse Spark
judges, MCC geometry decides where a calibrated angle exists, and a human
can correct any ball. The corrections become the dataset.

Built for the **Meta Global AI Developer Hackathon** (indie track, submit
Nov 4, 9:00 PM ET). Meta models only, via `https://api.meta.ai/v1`.

**Live pitch page:** https://vvanalabs.github.io/pocket-umpire/ ·
**Demo video (3 min + vertical):** https://github.com/VVanaLabs/pocket-umpire/releases/tag/v0.1-demo ·
**Match-2 annotation dashboard:** https://vvanalabs.github.io/pocket-umpire/dashboard.html

## Does it work? (verified proof)

| Proof | Result | Evidence |
|---|---|---|
| Over 1, night tape-ball (6 balls) | **6/6** runs + not-bowled vs hand labels, score 14/0 — legal balls only, single behind-stumps angle | `verdicts/over1.jsonl`, `docs/labels.csv` |
| Cheap v2 path rerun | **6/6 again**, ≈6.1s/ball, ≈$0.0029/ball | `verdicts/over1-v2.jsonl` |
| One-command reproduction | `pnpm cli analyze` regenerates 6/6 + 14/0 (needs `META_API_KEY` + stills — see Run it) | `src/analyze.ts`, `verdicts/over1-manifest.example.json` |
| Edge-selected stills (no hand-picking) | **6/6 again**, 14/0 — onset+blob preprocessor feeds `analyze` | `spikes/edge-select.py`, `verdicts/over1-edge.jsonl`, `docs/edge.md` |
| Cross-footage transfer | `wicket` concept tracks 105/105 (behind-bowler) and 68/105 (side-on) on daylight village cricket; Spark grounding ~15px | `docs/validation.md` |
| Match 2, daylight (12 balls) | **8/10 agreement** vs frame-by-frame labels (2 unclear excluded) — both misses are undercalled quick singles; labels pending owner spot-check | `verdicts/match2.json`, `verdicts/match2-labels.csv` |
| Dubai, night tape-ball (6 balls, 2nd venue) | 6/6 verdicts (0 nulls); exact on 3 dots, right category on 2 scoring balls, 1 clip excluded — supervisor labels, spot-check pending | `verdicts/dubai-s3.jsonl`, `docs/dubai-s3-spike.md` |
| Rules engine | MCC 21.5.2 / 22 geometry + score machine, 21 tests green | `src/rules.ts`, `src/score.ts`, `tests/` |

Honest scope: from a single behind-stumps angle, verdicts are perceptual
(runs, boundary, bowled via stump state). Wide/no-ball geometry is built
and unit-tested synthetically (`pnpm cli verdict`, `pnpm cli score-demo`)
and needs a calibrated side angle on real footage — that is the roadmap,
not a current claim. Village validation proves concept tracking and
grounding transfer, not verdict accuracy there.

## How it works

0. **The edge listens first** — on-device audio onset + blob tracking
   segment each ball and select contact/end stills locally; only those
   2 JPEGs (~60KB of a ~480KB clip) ever leave the device (`docs/edge.md`).
1. **SAM 3.1 watches** — image-mode wicket check on the contact still
   (v1 used 105-frame video tracks; image mode is 100× cheaper for stumps
   that never move).
2. **Motion finds the ball** — SAM concepts score zero on a 3px ball smear
   in both lighting conditions, so a $0 frame-differencing blob tracker
   recovers the delivery line and contact frame (`docs/blob-tracker.md`).
3. **Muse Spark judges** — contact + end stills + stump state + audio
   crack SNR → one JSON verdict (runs/boundary/wicket) in ~5s.
4. **Geometry decides** — where calibrated, MCC laws in code (crease
   projection, wide planes, 0.03m/0.10m margins) arbitrate; Spark only
   resolves ambiguity (`src/rules.ts`, `src/geometry.ts`).
5. **Humans correct** — every verdict lands in an annotation dashboard;
   corrections export as JSON and ingest as ground-truth labels
   (`pnpm cli ingest corrections.json`) for the next run.

## Cost & latency (measured, `docs/cost.md`)

| Path | Per ball | Per 240-ball match | Latency |
|---|---|---|---|
| v2 (SAM image + contributor Spark) | ≈$0.0029 | **≈$0.69** | ≈6.1s |
| v1 (SAM video ×2 + Standard Spark) | ≈$0.047 | ≈$11.30 | ≈10s |

The <$1/match figure uses contributor-model pricing and is stated that
way; at Standard Spark pricing v2 is ≈$1.86/match. Contributor mode
trains on submitted content (per Meta's model terms), so it is opt-in,
never the silent default for user footage. Total hackathon spend
to date ≈ $0.62.

## Run it

```bash
export META_API_KEY=...   # env only, never committed
pnpm install
npx tsc --noEmit && npx vitest run        # 19 green
pnpm cli score-demo                        # synthetic illegal-ball over
pnpm cli verdict --foot=0.06               # geometry verdict path
pnpm cli analyze <manifest.json> out.jsonl # SAM image + Spark per ball
```

Reproducing Over 1: `verdicts/over1-manifest.example.json` points at local
stills (`/tmp/balls/…`) extracted from the credited source footage — media
is never committed. Regenerate stills with `spikes/edge-select.py` per
`docs/edge.md`, adjust the paths, then run the `analyze` command above.
No API key? `score-demo` and `verdict` run fully offline.

## Roadmap

- **Second angle** — a side-on phone unlocks front-foot no-ball proof;
  every camera is already a `CaptureSource` with an angle role
  (`src/capture.ts`).
- **Glasses umpire** — umpire-POV capture and mid-pitch audio for snicks.
- **Auto highlights** — excitement-ranked vertical reel renders at the
  final ball (`src/highlights.ts`).

## Credits

Demo footage is third-party YouTube video, credited and linked — never
committed to this repo: night tape-ball match (`R9zhF2u_GFs`), daylight
match 2 (`zO2ztbJ3bI8`), Sanderstead village cricket (`b4KMnTdVo7c`).
Planning history: `PLAN.md`, `docs/winning-plan.md`.
