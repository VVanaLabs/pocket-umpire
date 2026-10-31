# Research: Meta Model API — SAM 3.1 + Muse Spark/Wonder for Pocket Umpire

Researched 2026-11 (pre-Demo). All facts below from Meta's official docs unless noted. Env key: `META_API_KEY` in `~/.zshrc`; docs call it `MODEL_API_KEY` — read whichever exists, pass as `Authorization: Bearer …`, never commit.

## 0. Platform shape (applies to everything)

- Base URL `https://api.meta.ai/v1`, **OpenAI-compatible Responses API** (`POST /v1/responses`) + Chat Completions + Files API. Use the stock OpenAI SDK with `baseURL` override. Same Bearer key, billing, docs for all models.
- Models: `sam-3.1`, `muse-spark-1.3` (+`-contributor`), `muse-spark-1.2`, `muse-wonder-1.0`, `muse-image-1.0`, `muse-voice-transcribe-1.0`. `client.models.list()` confirms what the team's key can access — **Day-1 spike**.
- Rate limits are **per team** (all keys pooled), per-model buckets; 429 → exponential backoff + jitter, honor `Retry-After`, watch `x-ratelimit-remaining-*` headers.
- No data training on prompts in Standard mode; Contributor mode is cheaper but trains on your content (`muse-spark-1.3-contributor` only; no Wonder contributor).

## 1. SAM 3.1 — segmentation & tracking

**Endpoint/request.** `POST /v1/responses`, `model: "sam-3.1"`. One user message: an `input_text` part (the prompt) + one media part: `input_image` (`image_url`: public URL or base64 data URL) or `input_video` (`video_url`, or `file_id` from `POST /v1/files` with `purpose: "user_data"` — upload is synchronous; upload once, re-segment many times).

**Prompting — two modes, never mixed (mixing = HTTP 400):**
- **Concept prompt**: a short concrete noun phrase in `input_text`, e.g. `"cricket ball"`, `"red cricket ball"`. Detects every instance. One concept per request (lists, "and", negation, OR, spatial phrasing unreliable → send separate requests or filter boxes yourself). Attributes narrow predictably; plurals/case ignored; commands/questions ("segment the ball") return nothing.
- **Box/point prompts**: `input_text` in the token grammar, e.g. `<0f>1<|box;x1=444;y1=626;x2=675;y2=849;w=1800;h=1200|>,2<|point;x=1430;y=700;w=1800;h=1200|>-<|point;x=1300;y=450;w=1800;h=1200|>` — object id, box (x2/y2 inclusive), positive points, `-` prefix = negative point. Coordinates in **source pixels after rotation** (EXIF/rotation flag); all tokens carry same `w;h` = media pixel size; mismatched aspect ratio → 400. Up to 16 prompted objects; helpers `buildObjectPrompt` (TS) / `build_object_prompt` (Py). Ideal chain: Muse Spark grounding finds ball → box-prompt SAM → segment+track.

**Video mode.** MP4/MOV, H.264/H.265/MPEG-4 (**no VP9/WebM** — phone recordings fine). Max **15,000 frames (~10 min)/request**; tracks up to **16 objects/frame**. Concept prompt → detect frame 0 + track whole clip. Box/point prompts can sit on any frame via `<Nf>` markers; `metadata.propagation_direction` = `both` (default) | `forward` | `backward`, measured from earliest prompt frame. Service auto-remuxes MP4 to faststart losslessly (coords unchanged).

**Output.** Streams (recommended, `stream: true`) into the `output_text` lane as special-token text: **one line per frame**, `<0f>` marker + object ordinal + `<|box;x1=..;…;w=..;h=..|>` + `<|mask;x=..;y=..;data=..|>`. **Stable object identity across frames** = free ball/limb tracking. `metadata.include_confidence: "true"` adds `c=0..1` per box/mask per frame. `metadata.mask_encoding: "one_bit"` → compact masks (`!` marker; several× smaller — use for video). Box/point prompts always return one_bit. Parse with `@meta-sam/parser` (`parseImageStream` → `decodeMaskToRaster` → Uint8Array 0/1 raster). **Zero matches = empty output_text with `response.completed`** — branch on it, don't treat as error. Box coords can jitter slightly between runs (streamed or not).

**Limits & errors.** Prompt rule violations → HTTP 400 with exact message (permanent, don't retry unchanged). Unknown/no-access model → 404 `model_not_found`.

**Pricing (per-image/per-frame, not tokens).** Image **$2.50 / 1,000 images** ($0.0025/img). Video **$0.20 / 1,000 frames** ($0.0002/frame) — **min 50 frames billed per video request**; `usage.video_frames_processed` reports billed frames. Demo math: 5 s @ 30 fps delivery = 150 frames ≈ **$0.03**; a 10-over match analyzed delivery-by-delivery ≈ **<$1 SAM spend**. Rate limit: **3,000 RPM, no TPM**.

## 2. Muse Spark 1.3 / Muse Wonder 1.0 — vision & reasoning

**Modalities.** Both: text+**image+video**+audio+PDF in → text out, **1,048,576-token context**, same endpoints. Swapping = change model ID. Spark = high-volume/latency/cost-sensitive; Wonder = flagship quality at 3.2×–4.7× the price. **Recommendation: `muse-spark-1.3` for all in-demo calls; Wonder only if a post-over analysis quality gap appears.**

**Images.** `input_image` with `image_url` (plain string: public URL or base64 data URL) or `input_file` with uploaded `file_id`; Chat Completions wraps as `image_url: {url}`. Up to **50 images/request** (400 beyond); 50 MB inline / 1 GiB via Files; jpeg/png/gif/webp/ico. **Token cost scales with resolution**: ~1280 px ≈ **1,300–1,500 input tokens** (1×1 ≈ 3). Free exact pre-count: `POST /v1/responses/input_tokens`. A calibration frame ≈ ~1.4K tok ≈ **$0.002** on Spark — cost is a non-issue; latency is the metric to measure.
- **Perception grounding (POV→pitch calibration path)**: Spark localizes objects on a **normalized 0–1000 grid** (`(0,0)` TL, `(1000,1000)` BR; px = `round(norm * dim / 1000)`). Prompt patterns: **point** ("where is"), **box** (prefix "You are an object grounding expert… do not miss any objects" measurably improves recall), **count** (point every instance, then count). Pair with structured output for parseable JSON of crease lines, stumps, pitch corners. SAM 3.1 cannot reason about scenes — docs explicitly prescribe Spark→SAM handoff.

**Video.** `input_video` (`video_url`) or `input_file` (`file_id`), **MP4 only**. Reads visual sequence + embedded audio together. ⚠️ **Audio understanding in Spark 1.3 "not fully supported" (degraded)** — use Spark 1.2 for audio-only asks. Implication: **snick detection = local audio DSP (on-device spike detect), not model audio.** Docs don't publish video→token cost; use `/v1/responses/input_tokens` on a real delivery clip (Day-1 spike).

**Reasoning.** Both are reasoning models; `reasoning_effort` = `minimal|low|medium|high|xhigh|max` (`max`: Wonder + Spark 1.3 only; **`"none"` → HTTP 400**; omit → model-determined). Reasoning tokens bill as output tokens and consume `max_output_tokens` — set ≥4000 or risk empty/truncated answers. Higher effort = more latency + cost; docs advise `low` for direct-answer tasks. **No published latency figures anywhere** — TTFB grows with reasoning, so stream (`stream: true`) and use `low`/`medium` for between-ball verdicts. Reasoning summaries available (`reasoning.summary: "auto"`) — nice for the demo UI's "why" text. Multi-turn continuity: Responses API `previous_response_id` or `include: ["reasoning.encrypted_content"]` (Chat Completions redacts reasoning — don't use it for the verdict loop).

**Pricing (per 1M tokens, Standard).** Spark 1.3: **$1.25 in / $4.25 out**, cached in $0.15. Contributor variant: **$0.10 / $0.20** (150 RPM, trains on content — fine for offline dev iteration, avoid for demo footage if licensing matters). Wonder 1.0: **$4.00 in / $20.00 out**, cached $0.20, no contributor. No long-context premium. Full 10-over demo analyzed with Spark ≈ low single-digit dollars.

## 3. Rate limits (solo-demo lens)

| Model | RPM | TPM | Notes |
|---|---|---|---|
| `sam-3.1` | 3,000 | — | billed per frame |
| `muse-spark-1.3` | 3,000 | 4,000,000 | contributor variant 150 RPM / 3M TPM |
| `muse-wonder-1.0` | 3,000 | 4,000,000 | |
| `muse-image-1.0` | 150 | — | n/a for us |

Background responses: 600 submissions/min/team. A solo demo (1 verdict call + optionally 1 SAM call per delivery, ~100 deliveries/match) is **3+ orders of magnitude under limits**; the binding constraints are per-call latency and the 50-frame SAM minimum, not throughput.

## 4. Cricket / sports-vision precedents (cite in submission + README)

- **MAGNUS** (github.com/Ranvin36/MAGNUS): monocular physics-informed ball trajectory + LBW prediction from single camera — validates our roadmap slide (LBW from one POV camera).
- **"Automated Wicket-Taking Delivery Segmentation… OCR-Guided YOLOv8"** (arXiv 2510.18405, 2025): pitch/ball detection + trajectory for dismissal zones in cricket video.
- **Abbas et al.** (arXiv 2211.12009): deep-learning segmentation/tracking of cricket ball deliveries (broadcast FPV); follow-up IEEE 2025 on FPV shot extraction.
- **CricketAnalyzer** (DOI 10.22541/au.175456859.94010958, 2025): camera-based real-time ball speed vs radar guns — "phone replaces $100Ks of hardware" framing.
- **AthletiQ** (github.com/milansinghal2004/AthletiQ): **SAM2** for cricket player tracking/biomechanics — direct SAM-in-cricket precedent.
- **Amazon Science**: VLM-based cricket scene classification (zero-/few-shot) — VLM+cricket precedent.
- **SAM3 for NFL All-22 player tracking** (akhiltghosh.com/blog/all22-cv-pipeline, 2026): text-prompted SAM3 = zero training data sports detection — same trick as our `cricket ball` concept prompt.
- **SAM 3.1 announcement** (ai.meta.com/blog/segment-anything-model-3, 2026-03-27): object multiplexing (16 objects/forward pass, ~2× video speed), drop-in SAM 3 replacement — citation for "provable latency" slide.

## SOURCES

- https://dev.meta.ai/docs/sam/overview — SAM 3.1 request/response anatomy
- https://dev.meta.ai/docs/sam/segmenting — prompts (concept/box/point), video, limits, errors, confidence, encodings
- https://dev.meta.ai/docs/sam/reading-segmentation — output grammar, object identity
- https://dev.meta.ai/docs/sam/client-libraries — @meta-sam/parser, prompt builders
- https://dev.meta.ai/docs/pricing-rate-limits — all pricing + rate-limit tables
- https://dev.meta.ai/docs/models — model matrix, modalities, availability
- https://dev.meta.ai/docs/image-understanding — image passing, 50-img cap, token estimation, grounding grid
- https://dev.meta.ai/docs/video-understanding — video/audio flow, Spark 1.3 audio caveat
- https://dev.meta.ai/docs/reasoning — reasoning_effort levels, billing, latency notes
- https://dev.meta.ai/products/meta-model-api — pricing snapshot
- https://ai.meta.com/blog/segment-anything-model-3/ — SAM 3.1 multiplexing
- https://developer.meta.com/ai/resources/blog/build-with-muse-spark/ — Spark quickstart/base URL
- Precedents: arXiv 2211.12009, arXiv 2510.18405, DOI 10.22541/au.175456859.94010958, github.com/Ranvin36/MAGNUS, github.com/milansinghal2004/AthletiQ, amazon.science (cricket scene classification), akhiltghosh.com/blog/all22-cv-pipeline
