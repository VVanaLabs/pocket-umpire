# Street S1 spike — alley cricket (qEztR3oRmnY), 2026-11-02

Research-only run on docs/data-candidates.md item S1 (Pakistan alley
cricket, kids, board stumps). Footage/stills stay in /tmp; only derived
findings live here.

## What worked
- Download + audio onset segmentation: 102 onset picks over 12:12
  (bat cracks + street noise; overcount vs ~36-48 balls — needs the
  min-separation/SNR pass before it is a segmenter).
- edge-select.py (corridor retuned in a /tmp copy) produced contact/end
  stills for 6 deliveries (s1b01–s1b06). Supervisor visually verified
  contact stills: batter mid-swing/follow-through, ball visible in
  several. Manifest ready at /tmp/street-s1/manifest.json in the exact
  `verdicts/over1-manifest.example.json` shape.

## What broke (honest list)
- **Camera is handheld, not fixed.** The operator pans up to follow big
  shots — end stills for s1b03/s1b05 are sky/rooftops. Our fixed-camera
  corridor + end-still assumptions only half-apply. Real street footage
  from spectators will look like this; the pipeline must tolerate
  camera motion or ask the filmer to lock off (next-match-kit already
  says tripod — this is why).
- House rules (`1 OVER = 1 RUN` overlay, board stumps, no creases):
  runs perception only; no MCC geometry, no wide/no-ball claims.
- Labels: score overlay gives innings progression, not per-ball
  outcomes; per-ball labels still need a human pass over the 6 clips.

## Status
Verdict step (`pnpm cli analyze /tmp/street-s1/manifest.json`) is
**blocked on META_API_KEY not being set** in the current environment.
When the key is available: run analyze, hand-label the 6 clips
(15 min), report agreement either way. A failure here is a finding,
not a claim — nothing from S1 appears in submission copy yet.
