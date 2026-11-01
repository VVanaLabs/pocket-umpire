# Cost ledger (metered, Standard pricing)

## v2 unit economics (2026-11-01) — the <$1/match path
- SAM **image** on 1 contact still: 0.8s, `images_processed: 1` (~$0.0002
  at video-frame rates), both stump sets boxed. The 105-frame video track
  ($0.021) was checking stumps that never move — 100x waste, cut.
- Spark **contributor** single-image verdict: correct (6, boundary), 4.3s,
  1289 in + 383 out (~$0.003 at Standard; contributor presumably lower).
- Blob tracker + audio SNR + geometry: $0 (local).
- **~$0.003/ball -> 240-ball match ~= $0.72. Under $1.**
- Contact still doubles as the wicket check (stumps in-frame); end still
  only on appeal/close calls.

## Incurred ≈ $0.55 (v1 path, as of 2026-11-01)
| Bucket | Calls | Math | $ |
|---|---|---|---|
| SAM video probes (tape-match) | 7 × 105f | 735f × $0.20/1K | 0.147 |
| SAM demo over tracks | 12 × 105f | 1260f × $0.20/1K | 0.252 |
| SAM village validation | 4 × 105f | 420f × $0.20/1K | 0.084 |
| Spark grounding (M4 + vil) | 2 | ~3.9K tok | 0.009 |
| Spark verdicts (6 + arbiter test) | 7 | ~19K tok | 0.034 |
| Spark coach card | 1 | ~0.5K tok | 0.001 |
| Spark smokes | ~6 | tiny | 0.002 |
| **Total** | | | **≈ $0.53** |

Per-ball/demo-over unit economics (measured): SAM $0.021 + verdict $0.005 ≈ **$0.026/ball**; full over ≈ $0.16.

## Projection to submission
| Item | $ |
|---|---|
| Verdict overlay re-runs (~12 balls) | 0.31 |
| Rehearsals: 3 × over (18 balls) | 0.47 |
| Blob-tracker probes (~10 SAM image calls) | 0.03 |
| Retries/buffer +25% | 0.20 |
| **Remaining** | **≈ $1.00** |
| **Hackathon total ≈ $1.55** | vs $25 ceiling (PLAN budgeted $17.50 — replay-based demo runs leaner) |
