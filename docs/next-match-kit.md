# Next-match kit — new footage + human labeling (the flywheel)

Strategy: we don't need perfect labels in-house. Ship model-proposed
verdicts, let users correct them in the dashboard, export corrections as
ground truth. Every corrected ball makes the next call better — and is
the accuracy story we report, errors included.

## Adding a new match video (tomorrow)

1. Keep footage local (never commit media). Note source + credit.
2. Segment balls + select stills on-device:
   `spikes/onsets.mjs` (audio onsets) → `spikes/edge-select.py <clip> <id> <outdir>`
   (see `docs/edge.md`).
3. Build a manifest like `verdicts/over1-manifest.example.json`
   (`delivery_id`, `contact`, `end`, `audio_snr_db`).
4. Run: `export META_API_KEY=...; pnpm cli analyze <manifest> verdicts/<match>.jsonl`
   Default Spark model is contributor (cheap, disclosed); use
   `SPARK_DEV_MODEL=muse-spark-1.3` for Standard.
5. Generate the dashboard from the results (`spikes/gen-dashboard.mjs`
   pattern), commit verdict JSON + dashboard, push site to `gh-pages`.

## Labeling Match 2 (15-min human pass, any volunteer)

Dashboard: https://vvanalabs.github.io/pocket-umpire/dashboard.html
(works once repo is public / Pages on — until then open `site/dashboard.html`).

For each of the 8 `needs_human_video_pass` balls in
`verdicts/match2-labels.csv` (m2b01, 03, 04, 08, 09, 10, 11, 12):
click "▶ watch this ball", then set runs (0–6) + wicket (true/false) in
the dashboard fields. Export corrections JSON, fill `label_runs` /
`label_wicket` in the CSV, set status `human_labeled`.

Then report honestly in README proof table:
`Match 2: X/12 vs human labels (errors: …) — corrections exported`.
A disclosed 10/12 beats a suspicious 30/1. Never present model output
as accuracy before this pass.

## Recruiting labelers

Pilot leagues ARE the labelers: send a filmed match → they get the
scorebook + highlights, we get corrected labels. That exchange is the
pilot pitch on the landing page.
