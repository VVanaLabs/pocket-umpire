# Winning plan — review + path to Nov 4 (supersedes submission-plan build order)

Reviewed 2026-11-01 against the indie criteria: **creativity, technical
ambition, whether it works.** Deadline Nov 4, 9:00 PM ET; submit early afternoon.

## Judge's-eye score today

| Criterion | Score | Why |
|---|---|---|
| Creativity | 8/10 | Unofficiated club cricket is a real, huge, ignored problem; phone-as-umpire + scorebook + highlights + annotation loop is a fresh product shape. Board-as-stumps adaptation on match 2 is a memorable frontier detail. |
| Technical ambition | 7/10 | SAM 3.1 tracking/segmentation, Muse Spark verdicts, projective geometry, MCC laws in code, $0 motion ball-tracker, multi-angle/glasses interfaces, cross-footage validation. Docked because the working pipeline lives in `spikes/` scripts, not one integrated, reproducible product path. |
| Whether it works | 5/10 *as judges will see it* | The proof exists but is hidden: `verdicts/` is gitignored, match-2 log lives only in /tmp, README still says "Footage: none yet — M2–M11 blocked", the landing page is tailnet-only with a placeholder repo link, and there is no demo video yet. A judge exploring the repo today would conclude *less* than we have actually built. |

**The gap is not more features. It is proof packaging + one integrated run.**
Every hour below buys judge-visible evidence; feature work that doesn't is cut.

## Refined winning thesis

> **Pocket Umpire turns one phone video of an unofficiated cricket match into
> a ball-by-ball scorebook, verdict cards, and shareable highlights — SAM 3.1
> perceives, Muse Spark judges, MCC geometry decides, and a human can correct
> any ball. The corrections become the dataset.**

Why this framing wins:
- It does not overclaim full officiating (no LBW/run-out footage proof exists).
- The annotation dashboard stops being internal tooling and becomes the trust
  mechanism + data flywheel: “AI calls it, humans confirm it, every match
  makes the next call better.” That is creative *and* credible.
- The memorable demo unit is an over becoming a scorebook live, not a model
  benchmark.

## Claim hygiene (fix before anyone external reads)
1. **SAM image pricing:** repo research pins SAM image at $2.50/1K images =
   $0.0025/image, not “~$0.0002 at video-frame rates” in `docs/cost.md`.
   Recompute v2 honestly: SAM image $0.0025 + contributor Spark (~1.3K in /
   0.4K out ≈ $0.0002 at contributor rates) ≈ **$0.003/ball** — the headline
   survives, the derivation must be correct. State contributor-vs-standard.
2. **Latency:** v1 ≈ 10 s/ball (SAM video + Spark). v2 measured pieces are
   0.8 s SAM image + 4.3 s Spark ≈ 5 s sequential. Landing page must not mix.
3. **Accuracy scope:** 6/6 is *over 1 vs hand labels*, fully logged. Match 2
   (12 balls, 30/1 claimed) is **unverified until a human labels it** in the
   dashboard. Never present model output as ground truth.
4. README status, landing-page stats, submission-plan cost ($0.026) and
   `docs/cost.md` must tell one story after the v2 rerun.

## P0 — today, Nov 1 (proof integrity; ~3h, nothing else starts first)
1. **Un-hide the proof.** Commit sanitized verdict logs (no frames, no keys):
   `verdicts/over1.jsonl`, `verdicts/over1-notes.md`, a committed match-2 JSON
   exported from /tmp, and ground-truth labels. Adjust `.gitignore` so future
   verdict JSON/notes are tracked while footage/stills stay out.
2. **Label match 2.** Human pass in the annotation dashboard (12 balls,
   minutes). Export corrections, commit as ground truth, report model
   accuracy honestly — errors included, with the dashboard screenshot as the
   human-in-the-loop beat. A disclosed 10/12 with corrections beats a
   suspicious 12/12.
3. **Validate v2 on all 6 over-1 balls** (not just b32): SAM image +
   contributor verdict per ball vs `docs/labels.csv`; record accuracy,
   per-call latency, token usage, corrected $/ball. This converts v2 from a
   one-ball probe into the shipping pipeline — or kills the <$1 claim early.
4. **One-command reproducibility.** Fold the match pipeline into the CLI
   (`pnpm cli analyze …` over a folder of ball clips → verdict JSONL + running
   score + moments), reusing the existing spikes logic — no new framework.
   Acceptance: one command on the cached clips regenerates the committed
   outputs; `npx tsc --noEmit` + `npx vitest run` stay green (19 tests today).
5. **README + landing rewrite to current truth:** problem → pipeline diagram
   → proof table (over 1 verified; match 2 labeled; village transfer) →
   corrected cost/latency → annotation loop → roadmap (second angle, glasses,
   auto highlights) → footage credits. Replace the placeholder repo link.

## P1 — Nov 2 (the artifacts judges actually consume)
6. **3-minute demo video** (spine in `docs/submission-plan.md`, updated):
   hook six → problem → over becoming scorebook with verdict cards → how it
   works (SAM/Spark/geometry) → match-2 dashboard + human correction →
   daylight/village transfer + cost ticker → highlights reel → roadmap/end
   card. Own voice, burned captions, deterministic replay only. Plus the
   vertical highlights cut for shareability.
7. **Public landing page.** Tailnet is for us, not judges: publish the static
   site (e.g. GitHub Pages once the repo has a public remote) with working
   repo + video links, tappable balls, proof table. Test logged-out.
8. **Public-safe dashboard demo:** timeline + ball cards driven by committed
   JSON with YouTube deep-links (no third-party stills committed), annotation
   fields + export visible. This is the “it works, try it” surface.

## P2 — Nov 3 (rehearsal + freeze)
9. Clean-checkout rehearsal: fresh clone → install → typecheck/tests →
   CLI score-demo → open site/dashboard → play video end-to-end. Fix only
   what a judge would hit. Freeze code EOD; record backup copies of video,
   screenshots of every proof number.
10. Optional, only if P0–P1 are done: blob-trajectory stump-plane crossing
    shown as an R&D wide-call visual. Timebox 2h. Nothing else new.

## Nov 4 (submission day)
11. Morning: final link check (repo public, video plays, page live logged
    out). **Submit early afternoon ET.** Screenshot the confirmation.

## Explicit cut list
Live-phone transport, auto clap-sync, glasses/Wearables DAT, LBW, run-outs,
caught-behind audio claims, auto-posting, per-player reels, third footage
source, TTS voiceover, any new model calls beyond the v2 validation rerun.
All remain roadmap copy, none consume build hours.

## Top risks → mitigation
| Risk | Mitigation |
|---|---|
| Judge can't find proof (repo hides it) | P0.1 + README proof table + public page (P1.7) |
| Unverified match-2 numbers get challenged | Human labels + disclosed accuracy (P0.2) |
| <$1/match claim collapses on pricing | Corrected derivation + full v2 rerun (claim hygiene, P0.3) |
| Demo video slips | It is P1, before all optional tech; stills+cards fallback tells the same story |
| Deadline/form failure | Freeze Nov 3, submit early afternoon Nov 4 |

## Definition of “winning-ready”
A judge in 3 minutes can: watch the over get called, see 6/6 + match-2
labeled accuracy with logs in a public repo, read a correct <$1/match cost
derivation, click balls on a live page, and repeat our thesis back:
*the phone umpires the game nobody officiates — and every correction makes
it better.*

## Execution status (2026-11-01, same day)
- [x] P0.1 proof committed (`verdicts/over1*.jsonl`, `match2.json`, labels template)
- [x] P0.3 v2 validated 6/6 on all over-1 balls; corrected $0.0029/ball
- [x] P0.4 one-command `pnpm cli analyze` reproduces 6/6 + 14/0
- [x] P0.5 README/landing/cost claim hygiene (contributor contingency stated)
- [x] P1 demo video 179.6s + vertical cut (GitHub release v0.1-demo)
- [x] P1 public site + dashboard (GitHub Pages), repo public (VVanaLabs)
- [x] P2 fresh-clone rehearsal: tsc + 19 tests green
- [ ] P0.2 match-2 human video labels (dashboard live; agent strip-reads in
      `verdicts/match2-labels.csv` — 4 plausible, 8 need a human video pass)
- [ ] Nov 4: submit early afternoon ET (form requires the human)
