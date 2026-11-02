# SW S4 + NCC S5 spikes — scorebug sets, 2026-11-02

Research use only; footage/stills in /tmp, derived artifacts committed
(`verdicts/sw-s4.jsonl`, `verdicts/sw-labels.csv`).

## S4 Silver Wolves (F0_ZwSDHWes, behind-bowler daylight) — NOT claimable
Pipeline produced 5/6 verdicts (s4b02 null), all "legal, 0 runs".
The CricHeroes scorebug — read pre/post each chosen onset — shows the
chosen onsets do **not** map 1:1 to deliveries:
- s4b06's window contains a wicket (5-1 → 5-2, W dot): model missed it.
- Between s4b02 and s4b03, +3 runs and a no-ball dot appear: a scoring
  ball the onset spacing merged/missed; s4b02 also returned null.
- s4b04/s4b05 windows sit between overs (5-1/1.0 unchanged): not
  delivery windows at all.

Verdict: segmentation failure before verdict failure. Audio onsets at
a produced broadcast (commentary, crowd, overlays, warm-up included —
this video's first 14.5 min are knock-ups) are not delivery anchors.

**The fix this reveals:** on scorebug videos, segment by scorebug
ball-counter transitions (overs 0.4 → 0.5 is a timestamped, labeled
delivery boundary) and use audio only to refine contact. That turns
the scorebug into segmentation + labels in one. Not built yet;
recorded here so it is not rediscovered.

## S5 NCC (x8ey8xvok90, behind-stumps) — no usable audio
Upload's audio tracks are digital silence (max −91 dB, both opus and
m4a). Onset segmentation impossible; no stills/manifest produced.
Scorebug-transition segmentation (above) is also the only salvage
path. Parked.
