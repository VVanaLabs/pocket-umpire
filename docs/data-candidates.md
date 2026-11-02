# YouTube data candidates (verified frames, 2026-11-02)

More labeled overs = the submission's ceiling-raiser. Picks below were
verified by sampling real frames (not thumbnails/posters). Priority is
by fit to our proven angles and by how cheap honest labels are.

**Key insight: a broadcast scorebug is free ground truth.** Videos with a
live scorebug (score + per-ball dots) let us label runs/wicket per ball
by reading scorebug transitions — no hand-labeling pass needed beyond
spot-checks, and the labels are the match's own official record.

## Street tier (the actual wedge — run these first)

### S1. Musa team vs Yahya team — literal alley cricket
- https://www.youtube.com/watch?v=qEztR3oRmnY (12:12, street in Pakistan)
- Verified frames (~4:00, ~7:00): kids playing in a residential alley,
  a board for stumps, fixed phone behind the stumps at the bowler's end
  looking down the "pitch". In-video score overlay (`3 OVER = 13 RUNS`)
  gives innings progression. THIS is the product's home turf.
- Caveats: house rules (`1 OVER = 1 RUN` overlay suggests shortened
  format), no creases/markings — runs verdicts from stills only, no
  geometry claims; labels from overlay + hand-check.

### S2. Pakistan street tournament — night, on a road, scorebug
- https://www.youtube.com/watch?v=l6vYjuBS7gU (41:26)
- Verified frame (~10:00): night match on a closed street, crowd on the
  pavements, broadcast scorebug (`1st INNING 12-0 Overs 2.2`) → scorebug
  labels apply. Organized but unmistakably street: road surface, street
  lights, sponsor-board stumps.

### S3. Dubai Tape Ball — night car park (already pick #2 below)
- Floodlit car park, behind-stumps, 48 balls. Street in everything but name.

## Organized-amateur tier (later — user steer: not the wedge)

## 1. Silver Wolves vs Pheonix Firebirds — tennis ball, daylight
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

## Outcomes (2026-11-02)
- S1 alley: run — handheld camera breaks end-stills (docs/street-s1-spike.md).
- S3 Dubai: run — 6/6 verdicts, supervisor labels, human pass pending (docs/dubai-s3-spike.md).
- S4 Silver Wolves: run — onset segmentation misaligned vs scorebug; NOT claimable (docs/sw-s4-spike.md).
- S5 NCC: blocked — upload audio is digital silence (docs/sw-s4-spike.md).
- Next segmentation upgrade (from S4): scorebug ball-counter transitions as delivery anchors on scorebug videos.
