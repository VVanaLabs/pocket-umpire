# Glasses integration — Meta Wearables Device Access Toolkit (DAT)

The companion-app ↔ pipeline contract (manifest shape, segmentation,
hive arbitration, privacy rules) is specified in **`docs/dat-bridge-contract.md`**.

Status: **scaffold built (`companion/`), not compiled or run.** The Android
companion app exists (DAT 1.0.1, Mock Device path included) but has not
been compiled — no Android SDK on the dev machine — nor run on Mock Device
or hardware. No glasses footage
is claimed anywhere in this submission. The display contract is exercised
in `docs/dat-bridge-contract.md`; the capture contract is `GlassesSource`
in `src/capture.ts`. Sources: Meta Wearables Developer Center
(wearables.developer.meta.com), DAT build/streaming/microphone docs,
accessed 2026-11-01.

## What DAT gives us (documented capabilities)
- A companion iOS/Android app opens a **DeviceSession** with supported AI
  glasses; the user starts/stops the session from the app or the glasses.
- The session can **stream camera video, capture photos, and take
  microphone audio** from the glasses (HFP voice channel; beamformed mics).
- Resolution/framerate are requested via stream configuration.
- A **Mock Device Kit** supports development/testing without hardware.
- Display glasses additionally run standalone **web apps (HTML/CSS/JS)**.

## Mapping to Pocket Umpire
| DAT piece | Our piece | Notes |
|---|---|---|
| DeviceSession (user-started) | `GlassesSource` lifecycle | Umpire starts it at the toss; ends at stumps |
| Video stream (umpire POV) | `DeliveryClip.clipPath` per ball | Segmented on the phone by audio onsets (bat crack), same picker as the file pipeline |
| Mic audio (HFP) | `DeliveryClip.audioPath` | Mid-pitch mic: snick band + appeals live where they happen, ~20m closer than any boundary phone |
| Photo capture | Contact/end stills | The v2 pipeline already consumes exactly two stills per ball |
| Web app on display glasses | Display web app (planned) | Verdict card + score bug + voice confirm/correct; no phone screen touched |
| Session = master clock | `clockOffsetS = 0` | The umpire's view defines match time; side phones clap-sync to it |

## Why the pipeline doesn't change
`pnpm cli analyze` consumes contact+end stills + an audio SNR number.
Glasses change only where those artifacts come from: stream → segment →
stills. SAM image check, Spark verdict, geometry arbitration, scorebook,
and the annotation loop are identical — which is why the phone-verified
6/6 is evidence for the glasses product, not a separate demo.

## Integration steps when hardware/project access lands
1. Register a DAT project (Wearables Developer Center), add app
   APPLICATION_ID + CLIENT_TOKEN attestation metadata.
2. Scaffold the companion app from the DAT sample; open a DeviceSession;
   log stream config actually granted (resolution/fps).
3. Segment the stream with the existing onset picker; emit DeliveryClips.
4. Point `analyze` at the glasses manifest; verify latency stays inside
   the 20–40s between-balls gap (v2 measures ~6s of model time).
5. Ship a display web app; voice confirm/correct via the glasses mic;
   corrections flow into the labels pipeline as today.

## Honest limits
- No DAT project registration or paired hardware yet — steps 1–2 are
  untested; stream quality (fps at cricket distances, mic SNR on a real
  snick) is the open empirical question, same class as M5/M9 in PLAN.md.
- Glasses are an additional `CaptureSource`, never a dependency: the
  phone path stands alone if DAT access slips.
