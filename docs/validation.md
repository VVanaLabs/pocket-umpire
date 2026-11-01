# Cross-footage validation (2026-11-01)

Second source: Sanderstead village cricket highlights (YouTube `b4KMnTdVo7c`,
10 min, daylight 720p25, whites, edited cuts) — different light, kit, cameras,
editor. Two continuous 7s/105f clips: `vil1` (behind-bowler, both stump sets +
umpire visible) and `vil2` (side-on, keeper + batter + stumps).

## What transfers
- `wicket` concept: vil1 **105/105, stable ID 0**; vil2 68/105, stable ID 0
  (occlusion by keeper mid-clip). Same grammar as night tape-ball (105/105).
- Spark grounding on vil1: near/far stump bases + crease endpoints all land
  within ~15px, conf 0.65, 4.4s, ~1.9K tokens. Both-ends-visible framing is the
  ideal calibration shot — better than night footage.
- Side-on vil2 is the no-ball profile view the demo lacks — validates the
  multi-angle roadmap: this angle exists in the wild and segments.

## What doesn't (now decisive, two lighting conditions)
- `cricket ball`: **zero matches on all 4 daylight frames too**. Red/white ball,
  day or night, ~10px at 720p from 40m+ never trips the concept detector.
  Blob tracker (frame-diff → box-prompt SAM) is mandatory, not a fallback.
  Next build item.

## Cost of this validation
4 SAM calls (420 frames) ≈ $0.084 + 1 grounding ≈ $0.004 → **≈ $0.09**.
