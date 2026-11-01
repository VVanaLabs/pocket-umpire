# Over 1 — verdicts (2026-10-31, all Standard `muse-spark-1.3`)

6/6 Spark verdicts match hand labels in `docs/labels.csv`. Total 14/0.

- O1B1: SIX — lofted, field static. Verdict 3.4s.
- O1B2: 2 runs — both batters mid-pitch sprinting. Verdict 3.1s. (Bat untracked: static/occluded at contact — verdict carried by runner motion + audio.)
- O1B3: Dot — block, static. Verdict 3.4s.
- O1B4: SIX — clean strike, batter celebration. Verdict 4.1s.
- O1B5: Dot — beaten, stumps intact. Verdict 2.7s.
- O1B6: Dot — left alone, stumps intact. Verdict 2.6s.

SAM: wicket 105/105 stable ID 0 on all 6 (bowled ruled out geometrically);
bat 98/105/84 on shot balls, 0 on static-bat balls (concept pose-sensitive —
known limit, verdicts didn't need it). Ball concept: zero on all (S8 stands).

Coach card: "Explosive Start Then Bowlers Fight Back" — twin sixes, bowler
adjusted pace/lines for comeback dots; recommends wide-yorker variation. 4.0s.

Per-ball latency: SAM ~5-7s + verdict ~3-4s ≈ 10s/ball — inside the 20-40s gap.
Cost: SAM $0.021 + verdict ~$0.005 ≈ **$0.026/ball**, over ≈ $0.16.
