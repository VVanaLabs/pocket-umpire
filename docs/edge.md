# Edge architecture — the device does the cheap 99%, the cloud judges 2 frames

Status: **proven end-to-end 2026-11-01.** `spikes/edge-select.py` (local,
$0) turns each ball clip into contact+end stills + an SNR number;
`pnpm cli analyze` on those stills reproduces the verified over:
**6/6 verdicts, 14/0** (`verdicts/over1-edge.jsonl`).

## The split

| Layer | Where | What | Cost |
|---|---|---|---|
| Capture + segmentation | glasses / phone | stream → per-ball clips via audio onset picker (bat crack = +10dB over 3s rolling median, `spikes/onsets.mjs` method) | $0 |
| Keyframe selection | device | contact frame = onset frame, confirmed by corridor blob motion within ±1s (`spikes/edge-select.py`); end = contact +2.5s | $0 |
| Ball tracking | device | three-frame differencing blob tracker — finds a ~3px ball SAM can't (`docs/blob-tracker.md`) | $0 |
| Audio SNR | device (stream) | peak vs preceding-3s median, carried with the clip | $0 |
| Wicket check | cloud | SAM 3.1 **image** on the contact still | $0.0025 |
| Verdict | cloud | Muse Spark contributor, contact+end stills → JSON | ~$0.0004 |
| Laws + score | device/cloud | MCC geometry + scorebook in code, never in the model | $0 |

**Per ball: ~480KB of video stays on the device; ~60KB (2 JPEGs) leaves it.**
A 240-ball match uploads ~14MB total and costs ≈ $0.69 in model calls.

## Why this is the glasses architecture, not an optimization
- **Bandwidth/privacy:** the umpire's glasses never stream raw video to a
  server. Two frames per ball is the whole uplink — works on a village
  ground with one bar of signal, and bystanders aren't uploaded.
- **Latency:** segmentation and keyframe selection are local and instant;
  the ~6s cloud verdict is the only wait, inside the 20–40s between balls.
- **Offline tolerance:** stills queue on-device; verdicts land when signal
  returns. The scorebook is local-first either way.
- **Cost floor:** every experiment that can be $0 is $0 (motion, audio,
  geometry). Cloud spend is exactly two model calls per ball.

## Honest limits (measured, not hidden)
- Blob-only contact selection was 5/6 on the over (b32's loudest track is
  the *returning* ball; b227 has decoy branches). The shipped selector
  therefore keys on the **audio onset** — proven on the full-match stream —
  and uses blob motion only as confirmation. Frame-exact contact from
  vision alone needs a delivery→shot sequence model; upgrade trigger: a
  ball actually miscalls because of it.
- Clip-local SNR cannot reproduce stream SNR (the pre-clip crowd roar is
  cut off), so the stream-measured value is carried through `--snr-db`.
  On-device this is free: the picker runs on the continuous stream.
- The contact still is the onset frame ±a few frames; Spark judges the
  *outcome* (sprinting / watching / static) from contact+end, which is
  why ±0.3s of contact error does not move verdicts (validated: the
  edge-selected stills are not the hand-picked ones, same 6/6).
