# Cost ledger (corrected 2026-11-01)

Pricing basis: SAM video $0.20/1K frames, SAM image $2.50/1K images,
Spark Standard $1.25/$4.25 per M in/out, Spark contributor $0.10/$0.20
per M in/out (repo research: `docs/research-models.md`).

## v2 unit economics — the <$1/match path (measured, 6 balls)
Per ball: SAM image on the contact still ($0.0025) + contributor Spark
verdict on contact+end stills (measured 2,565 in / ~510 out avg ≈ $0.0004).
Blob tracker + audio SNR + geometry: $0 model cost (local).

- **≈ $0.0029/ball → 240-ball match ≈ $0.69** (contributor pricing).
- At Standard Spark pricing the same run is ≈ $0.0077/ball ≈ $1.86/match —
  the <$1 claim is contributor-contingent and is stated that way everywhere.
- Measured latency: SAM image ~0.9s + Spark ~5.2s ≈ **6.1s/ball** sequential
  (vs v1 ≈ 10s; both inside the 20–40s between-balls gap).
- Validated: `verdicts/over1-v2.jsonl` (6/6 vs hand labels, runs + not-bowled)
  and reproduced via `pnpm cli analyze` (6/6, score 14/0).
- Scope note: 240 legal balls; re-bowled wides/no-balls add calls. From a
  single behind-stumps angle those decisions are not yet judged (roadmap).

## v1 unit economics (corrected)
Two SAM video concepts per ball (wicket + bat) = $0.042 + Spark verdict
≈ $0.005 → **≈ $0.047/ball, ≈ $0.28/over** (earlier $0.026 counted one
concept — corrected).

## Incurred to date ≈ $0.62
| Bucket | Calls | $ |
|---|---|---|
| SAM video probes (tape-match) | 7 × 105f | 0.147 |
| SAM demo over tracks | 12 × 105f | 0.252 |
| SAM village validation | 4 × 105f | 0.084 |
| Spark grounding (M4 + village) | 2 | 0.009 |
| Spark v1 verdicts + arbiter + coach + smokes | ~14 | 0.037 |
| Match-2 run (12 SAM images + contributor verdicts) | 12 balls | ≈ 0.034 |
| v2 validation + CLI reproduction (12 SAM images + verdicts) | 12 balls | ≈ 0.034 |
| **Total** | | **≈ $0.60–0.62** |

Third-party footage and all renders live in /tmp only; nothing above
depends on committed media.
