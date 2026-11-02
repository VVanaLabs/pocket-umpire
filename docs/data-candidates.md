# YouTube data candidates (verified frames, 2026-11-02)

More labeled overs = the submission's ceiling-raiser. Picks below were
verified by sampling real frames (not thumbnails/posters). Priority is
by fit to our proven angles and by how cheap honest labels are.

**Key insight: a broadcast scorebug is free ground truth.** Videos with a
live scorebug (score + per-ball dots) let us label runs/wicket per ball
by reading scorebug transitions — no hand-labeling pass needed beyond
spot-checks, and the labels are the match's own official record.

## 1. Silver Wolves vs Pheonix Firebirds — tennis ball, daylight (RUN FIRST)
- https://www.youtube.com/watch?v=F0_ZwSDHWes (21 Mar 2025, The Ballpark)
- Verified frame (~25:00): fixed behind-bowler angle, full pitch + both
  creases, CricHeroes-style scorebug `PF 15-2 / 1.5` with ball dots
  (W 0 4 0 0 …). Daylight, large players — closest to our village
  transfer setup, but easier (better light, bigger scale).
- Labels: scorebug transitions per ball; spot-check 10% by eye.

## 2. Dubai Tape Ball — night, behind-stumps (domain twin of Over 1)
- https://www.youtube.com/watch?v=qONqY13WwD8 (Final, 1st innings, 48 balls)
- Verified frames (~2:00, ~6:40): single fixed camera behind the stumps
  at night in a floodlit car park — near-identical domain to our verified
  Over 1 (night tape-ball, stumps foreground, bowler delivering to camera).
- Labels: no scorebug seen in sampled frames → hand-label one 6-ball over
  first (15 min), expand only if verdicts track.

## 3. Chinnor CC vs Bledlow Village — leather ball, full match (volume/stress)
- https://www.youtube.com/watch?v=6hbglBgsQFs (24 May 2025, 5h52m stream)
- Verified frames (~30:00, ~90:00): fixed elevated behind-bowler angle,
  FrogBox scorebug `CHIN 31/1 (10.4)` with ball dots. Real village
  leather-ball cricket — the actual target market.
- Caveat: players/ball are small at this distance; treat as the hard
  stress test (wicket-concept tracking), not the next accuracy claim.

## Rejected after frame checks
- Tape-ball "finals highlights" (UaPB8YLfRkM, dweXb1wrfy8, wZhwBep0ZjQ,
  RDWIGmnxBak): edited multi-cam highlights with cuts/replays — unusable
  for ball-by-ball pipeline runs. Highlights ≠ data.

## Rules for use
- Research/validation only: download locally, run pipeline, publish only
  derived artifacts (verdict JSONL, label CSVs, agreement stats) — never
  redistribute footage or stills; credit the source channel wherever the
  derived numbers appear, labeled `source: youtube/<id> (research)`.
- Same honesty bar as our own footage: model output is not accuracy
  until compared against scorebug/human labels, and say so.
- Precedent: Match 2 (zO2ztbJ3bI8) already follows this pattern.
