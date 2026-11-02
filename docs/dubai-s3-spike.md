# Dubai S3 spike — locked-off night tape-ball (qONqY13WwD8), 2026-11-02

Second-venue transfer test, chosen because it mimics our setup:
fixed camera behind the stumps, floodlit car park, 48-ball innings
(framing verified identical at 60/300/600/900/1200s). Research use
only: footage/stills in /tmp, derived artifacts committed
(`verdicts/dubai-s3.jsonl`, `verdicts/dubai-labels.csv`).

## Result
- Pipeline ran end-to-end (onsets → edge stills → SAM + Spark):
  **6/6 verdicts returned, zero nulls** — vs 4/6 on handheld alley
  footage (docs/street-s1-spike.md). Fixed camera is the difference.
- Model over: 0, 2, 0, 0, 6, 0 = 8/0.
- Supervisor visual labels (montage read of the 6 clips):
  agreement on d1b01 (0), d1b04 (0), d1b06 (0); d1b02 running (model 2,
  count 1–2 uncertain); d1b05 lofted boundary (model 6, 4-vs-6
  uncertain); d1b03 excluded — clip may start post-delivery (appeal/
  crowd onset), runners crossing, honestly unclear.

## Honest status
This is **not yet a second accuracy claim**: labels are one
supervisor's montage read, with two count-uncertainties and one
excluded ball. It becomes claimable after a human label pass over the
6 clips in /tmp/dubai-s3/clips/ (or by the Match-2 dashboard ingest
flow). Until then, submission copy keeps the single verified Over 1.

## Pipeline notes (from delegate report, /tmp/dubai-s3/report.txt)
- 242 onset picks in 33 min (crowd-heavy final); a 3–7kHz bat-crack
  filter was needed — 46 picks fail it (crowd/whistle thumps).
  Pure SNR onset picking is not a segmenter at a noisy final.
- 640×360 night frame: corridor/threshold retuned in a /tmp copy of
  edge-select.py only. Repo script untouched.
- Onset gaps in the chosen over: 11–44s. "One over = 6 × even spacing"
  does not hold; segmentation must be per-ball, not per-over.
