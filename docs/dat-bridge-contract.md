# DAT bridge contract — companion app ⇄ Pocket Umpire pipeline

Status: contract only; nothing here is implemented against hardware. Everything
below maps 1:1 to code that exists: `BallInput`/`analyzeBall` (`src/analyze.ts`),
`DeliveryClip`/`CaptureSource`/`GlassesSource` (`src/capture.ts`),
`checkFrontFoot`/`checkWide`/`needsArbiter` (`src/rules.ts`), `LAW`
(`src/config.ts`). Companion app must emit artifacts this pipeline already
consumes — no pipeline changes required.

## 1. Manifest contract (what the companion app emits)

Per source per session, one JSON file: a flat array of `BallInput`, exactly the
shape `analyzeMatch` reads (`src/analyze.ts`):

```json
[
  {
    "delivery_id": "O1B1",          // string, unique per match. Suggested: <over>B<ball>, e.g. O1B1
    "contact": "stills/O1B1-contact.jpg",  // path to contact-still JPEG (bat-ball moment)
    "end": "stills/O1B1-end.jpg",          // path to end-still JPEG (+~2.5s after contact; the
                                           // analyze prompt hardcodes "+2.5s" — don't drift)
    "audio_snr_db": 10.5,            // number, optional but strongly expected: bat-crack SNR
                                     // over ambient, dB. Interpolated into the Spark prompt.
    "label_runs": 6                  // optional ground truth for labeled demo balls only —
                                     // never emitted by the companion app itself
  }
]
```

Rules:
- Fields are exactly `delivery_id` (string), `contact` (string path), `end`
  (string path), `audio_snr_db` (number, optional), `label_runs` (number,
  optional). No extra fields — `analyzeBall` ignores anything else.
- Stills must be readable JPEGs; paths are resolved by the caller's cwd.
- Still naming per ball: `<delivery_id>-contact.jpg` and `<delivery_id>-end.jpg`
  in a per-source `stills/` directory (e.g. `glasses/stills/O1B1-contact.jpg`,
  `side-on/stills/O1B1-contact.jpg`). The example manifest
  (`verdicts/over1-manifest.example.json`) uses `c<ms>/e<ms>.jpg`; that legacy
  naming is accepted (paths are opaque to the pipeline) but new emitters use the
  `delivery_id` scheme.
- Segmentation on-device (see §2) decides which frames become stills; the
  manifest is the only thing the pipeline sees.

## 2. Segmentation contract

- **Onset picker segments deliveries** on the glasses mic channel (bat crack):
  the same picker as the file pipeline. Each detected onset = one ball.
- **Contact still**: frame at the onset. **End still**: frame at onset + 2.5 s.
- **`clockOffsetS` semantics** (`DeliveryClip`, `src/capture.ts`): seconds to
  add to a source's clock to align with match time. The glasses DeviceSession
  is the **master clock: `clockOffsetS = 0`** — the umpire's view defines match
  time. Phones clap-sync at record start; audio cross-correlation yields their
  offset (target ~1 frame; manual entry acceptable initially).
- The companion app does segmentation/sync locally; it never ships raw streams.

## 3. Hive extension (multiple CaptureSources)

Each angle is one `CaptureSource` (`AngleRole`: `behind-stumps`, `side-on`,
`square-leg`, `umpire-pov`), each emitting its own manifest per §1 with the
same `delivery_id`s across sources. `GlassesSource` is the `umpire-pov` source
and always `angle: "umpire-pov"`, `source: "glasses"`, `clockOffsetS: 0`.

Specialist roles and conflict resolution — the arbiter is `src/rules.ts` with
thresholds from `LAW` (`src/config.ts`):

- **side-on** is front-foot no-ball gold (crease + landing foot in profile):
  `checkFrontFoot(d)` where `d = foot_rearmost − crease_back_edge` in meters,
  `+ = over`. `d > LAW.NO_BALL_MARGIN_M` (0.03 m) → `fail` (no-ball); doubt
  favors batter.
- **square-leg** supports the wide check: `checkWide(crossingX)` against
  `LAW.WIDE_OFF_M` (0.84 m, RH batter) + `LAW.WIDE_MARGIN_M` (0.10 m).
- **Precedence** (MCC): no-ball overrides wide (21.13, encoded in
  `checkWide({noBall})`); bat contact cancels wide (22.4.2, `checkWide({batContact})`).
- **Unclear specialists don't vote**: `null` distance or occlusion →
  `status: "unclear"`, and a clear specialist angle wins over an unclear one.
- **Arbiter trigger** (`needsArbiter`): confidence < `LAW.ARBITER_MIN_CONF`
  (0.6), any check `unclear`, |foot margin| < `LAW.ARBITER_FOOT_EPS_M`
  (0.05 m), or wide not clearly pass with margin < `LAW.ARBITER_WIDE_EPS_M`
  (0.15 m) → escalate to the Spark arbiter instead of the code decision.

Honest note (code gap): the multi-angle geometry arbitration today runs in the
`pnpm cli verdict` path; `pnpm cli analyze` currently decides
legal/runs/wicket perceptually from the `umpire-pov` pair and always reports
`legal` for no-ball/wide ("No guessing no-ball/wide from this angle"). Until
geometry wiring lands in `analyze`, angle manifests still converge per §1 —
only the contact/end pair from the primary (umpire-pov) source feeds analyze.

## 4. Error & privacy rules

- **Only stills leave the device**: segmentation, sync, and SNR computation
  happen on the companion phone. What goes to the Meta API is exactly what
  `analyzeBall` sends: the two JPEG stills + the `audio_snr_db` number. No
  raw video, no continuous audio, ever uploaded.
- **Contributor vs Standard model** (`src/config.ts`): the analyze path uses
  `SPARK_DEV_MODEL`, default `muse-spark-1.3-contributor` (content may train).
  Standard (no content training) = run with `SPARK_DEV_MODEL=muse-spark-1.3`.
  Contributors must be disclosed per docs/cost.md; the companion app surfaces
  the choice at session start.
- **Session lifecycle**: the DeviceSession is user-started (at the toss) and
  user-stopped (at stumps) from the companion app or the glasses — the app
  never starts capture silently, and no artifacts are emitted outside a
  running session.
- **Glasses are additive**: `GlassesSource` without a registered DAT project
  throws; the phone/file path stands alone. A missing or malformed per-source
  manifest must degrade to "source absent", never block the match.

## 5. Acceptance test (Mock Device session)

Given a Mock Device Kit session, the companion app (or a stand-in script) must
produce, on disk:

1. `stills/<delivery_id>-contact.jpg` and `stills/<delivery_id>-end.jpg` for
   every ball in the mock over.
2. A manifest JSON array per §1 with `delivery_id`, `contact`, `end`,
   `audio_snr_db` filled (use the mock session's mic track for SNR).

Then `META_API_KEY=<key> pnpm cli analyze <manifest.json> out/verdicts.jsonl`
must complete and emit one `BallResult` line per ball plus a running score —
identical flow to the phone-verified path (SAM 3.1 wicket check on contact +
Spark verdict on the pair, ~6 s model time per ball, must fit the 20–40 s
between-balls gap).

**Unverified without hardware** (same class as PLAN.md M5/M9): DAT project
registration + attestation; real stream fps at cricket distance; HFP mic SNR
on a real snick; clap-sync accuracy to ~1 frame; end-to-end latency inside the
between-balls gap; display web-app behavior on glasses hardware. No glasses
footage is claimed anywhere until these close.
