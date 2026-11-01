# Blob ball tracker v1 (2026-11-01, ~1h timebox) — WORKS, $0 model cost

Local CV only (ffmpeg frames + numpy + Pillow in /tmp/venv): three-frame
differencing (threshold 40) in fixed pitch corridor → connected components
(area 2–400) → greedy link (per-frame step 20–90px) → keep 4–30-frame tracks
ranked by displacement. Tuned out: 98-frame flicker chains (crowd/sightscreen)
die on the duration cap; bat-swing blobs lose to longer ball flights.

## Measured (tape-match, 720p, 15fps)
- b32 (SIX): delivery line f76–98, (650,585)→(501,329), ~150px/s, ends at bat
  at contact. Visual overlay: dots ride the pitch line into the bat. TRUE BALL.
- b227 (SIX): f4–10 (424,572)→(506,298) ~200px/s + f38–55 second branch.
- b180 (DOT): tracks END f58–59 at the bat, nothing fast after — ball dies.
  Outcome signature: post-contact fast motion = scoring shot; silence = dot.

## What this unlocks
- Delivery trajectory → line fit → stump-plane crossing = wide calls (the
  missing verdict input). Audio-gate ±250ms around the crack to kill bat blobs.
- Box-prompt SAM at blob boxes for segmentation: schema untested, next step.
- Corridor 2× upscale before differencing: free 4× pixels, untested.
- Cost: frames + numpy. Zero SAM/Spark calls. Contributor models untouched
  (no Spark calls needed at all).

## Limits
- Fixed camera assumed (tripod/club mount); PTZ or handheld needs stabilization.
- Bat-swing blobs compete — handled by duration ranking, not eliminated.
- Post-hit six flight leaves corridor (sky) — separate sky-region pass for
  boundary confirmation.
