# Research: Capture + Audio (Pocket Umpire)

Scope: phone-POV capture (recorded file → live frames → WebRTC), MCC law ground truth for detectors, snick detection via phone audio, Wearables Device Access Toolkit (future glasses path), mounting hardware.

---

## 1. Phone POV capture options — ranked by effort

| # | Source | What it is | Latency | Effort | What the demo loses |
|---|--------|-----------|---------|--------|---------------------|
| 1 | **Recorded video file** | Phone records via native Camera app (60fps if possible); `CaptureSource` = file + frame iterator (OpenCV/ffmpeg decode). Audio in the container, extracted to WAV. | None that matters — post-hoc; a 3-second clip processes well inside the 20–40s between-ball budget | **Hours.** Zero custom capture code | No "live" story. Latency claim is "after the ball is dead", which is the honest claim anyway |
| 2 | **On-device live frames** | AVFoundation `AVCaptureVideoDataOutput` (iOS) / CameraX `ImageAnalysis` (Android), or MediaPipe camera helper; frames land in a callback at 30–60fps | 1–2 frames pipeline ≈ **30–100ms** per frame | **Days.** Native app shell, camera permissions, real-time frame buffers, audio/video clock sync | Nothing functionally; adds app-dev risk during a 10-day window. This is the "phone live stream" rung |
| 3 | **WebRTC stream** | Phone camera → WebRTC peer → laptop/server inference | Glass-to-glass typically **100–500ms** (sub-200ms on LAN; camera itself ≈100ms of it) | **Weeks.** Signaling server, jitter buffers, custom VideoCapturer to fuse inference | Nothing the judges can see; worst risk/reward for this window |

**Recommendation:** Rung 1 for the demo build, with `CaptureSource` designed so rung 2 is a drop-in (both produce: frame + pts + PCM audio track). Rung 3 stays a roadmap item with glasses. Judging rewards "DOES IT WORK", not streaming architecture.

**Day-1 spike (capture):** confirm 60fps recording + audio on the actual demo phone; check phone storage/battery for a full session (capture at 4K60 fills ~6GB/10min — use 1080p60/720p60).

---

## 2. Umpiring ground truth (MCC Laws, 2017 Code)

### Front-foot no-ball — Law 21.5 ("Fair delivery – the feet")
In the **delivery stride**:
- **21.5.1** back foot must land **within and not touching the return crease** for the stated mode of delivery.
- **21.5.2** front foot must land with **some part of the foot, whether grounded or raised**:
  - on the same side of the imaginary line joining the two middle stumps as the return crease (21.5.1), and
  - **behind the popping crease**.
- Umpire calls No ball if **any** of the three conditions fails.
- Detector implications:
  - Judgment instant = **frame where the front foot lands** ("whether grounded or raised" — a toe still aloft behind the line is legal).
  - Crease geometry (Law 7.3): the popping crease is the **back edge** of the white line marking; the line itself lies on the legal side → toe **on** the line is **legal**. Calibrate to the back edge, not line center.
  - "Front foot" = the foot landing nearer the striker in the delivery stride (over/round the wicket matters via 21.5.1 return crease — demo checks 21.5.2 only).
  - **Occlusion risk:** umpire POV is directly behind the bowler at the bowler's end; the landing foot is near-field and may occlude its own crease line. Plan: calibrate pitch geometry once (Spark single-frame vision), segment foot with SAM 3.1, judge foot-vs-back-edge-of-line in calibrated coords. **Day-1 spike:** film real deliveries from a chest-mounted phone; verify the landing frame is legible.

### Wide — Law 22 ("Judging a Wide")
- **22.1.1** A Wide: ball (not a No ball) **passes wide of where the striker is standing** (22.1.1.1, 2022 wording also references where they *had* stood) **and** would also have passed wide of a striker in a **normal guard position**; **22.1.1.2** also a Wide if it passes **above head height** of the striker standing upright at the popping crease.
- **22.1.2** "Passing wide" = **not sufficiently within reach to be hit with the bat by a normal cricket stroke**.
- **22.4.1** Not a Wide if the striker's movement caused it (moved toward/away); **22.4.2** not a Wide if it touches bat/person.
- **21.13** **No ball overrides Wide**; **22.6** Wide = 1 run + re-bowl (not one of the over).
- Detector implications: no fixed "one bat and a half" rule in MCC law (that's limited-overs playing conditions); for a club demo, encode a **configurable off/leg-side threshold in calibrated pitch coordinates** (default: limited-overs convention on off side, generous down-leg = Wide) and state it in the UI. Needs striker pose + ball trajectory → this is the hardest of the three detectors; ship it last.

### Scoring events (boundary/bowled) — no detector law needed
- Bowled = ball breaks wicket with ball (Law 29; bails off + ball contact). Boundary = ball crossing boundary rope/wall in the frame. Both are binary vision events, cheap.

---

## 3. Audio snick detection — feasibility

### Signature
- Bat-edge contact is a **short broadband transient** (<10–20ms) with strong high-frequency energy (mostly 2–10kHz+); ball-on-pad is duller/lower-frequency; ball-on-ground/bounce is a lower thud. This bat-vs-pad separation is exactly what commercial Snicko/UltraEdge does with frequency analysis.
- **Reality check (phone at umpire POV):** stump mics sit ~1m from the bat; the umpire stands ~20m away. Phone MEMS mic SNR for an edge at that distance is the single biggest unknown. Crowd/ambient noise is the second.

### Phone mic sampling
- **iOS:** `AVAudioRecorder`/`AVAudioEngine`, set `AVSampleRateKey` = **48kHz** mono, 16-bit PCM (44.1kHz also standard).
- **Android:** `AudioRecord`, request **48kHz** `CHANNEL_IN_MONO` `ENCODING_PCM_16BIT`; actual rate is device-dependent — read back `getSampleRate()` and resample if needed. (8k–48k supported range.)
- 48kHz = 20.8µs audio resolution vs 16–33ms video frame → **audio is the master clock for event timing**; map spike time → nearest video frame.

### Simple pipeline (v1)
1. Extract audio track from capture (or parallel `AudioRecord`), mono, 48kHz.
2. Band-pass ~2–10kHz (kills pad thud + low rumble), compute **RMS envelope in 5–10ms windows**.
3. Spike = window RMS > **k × rolling baseline** (adaptive threshold, e.g. +8–10dB over 1s median) → candidate snick timestamp.
4. Sync: video pts ↔ audio timeline from the same container (or clap-sync at start if separate recorders).
5. Verdict rule: a spike within ±250ms of the predicted bat-crossing frame (ball passes striker plane) → **"edge sound detected"**; no spike → quiet. Present the waveform + synced slow-mo in the demo — this visual is judge-friendly even if classification stays binary.
- Do **not** claim bat-vs-pad classification in v1; report "sharp sound at bat-crossing" like broadcast UltraEdge does.

### Precedents (cite in repo docs)
- Khan et al. 2019, *Turkish Journal of Electrical Engineering*: snick/bat/glove/pad classification, features + NN/SVM, **85.7%** on real-match snicks, 132-signal dataset.
- *"The 5th Umpire"* (DOAJ): wavelets + NN to separate ball-on-bat from ball-on-pad.
- GitHub: `nikhilnnk/snickometer` (Python librosa-based), `rahul188/cricket-snickometer` (Python, 2024), `sudo-boo/cric-ai` (ultra-edge + cricket analytics), `bewajafarwah/shot-through-sound` (librosa+ffmpeg shot-from-sound). None mature — good: proves the category, leaves room.

**Day-1 spike (critical):** record 15–20 real club deliveries with the phone in the chest mount at umpire distance; measure edge-spike SNR vs ambient. **Kill-switch:** if edges are not visible in the RMS envelope, drop snick from the live demo and keep it as a roadmap item (or add a synced second phone at the stumps as a "virtual stump mic" — demo-cost fallback, flag as scope creep to the user).

---

## 4. Wearables Device Access Toolkit — glasses roadmap facts

- **What it is:** SDK connecting iOS/Android apps to Meta AI glasses; apps run on the **phone**, glasses stream sensor data to it (announced at Meta Connect, **Sept 2025**). Camera capability = live glasses frames into your mobile app; speech/audio, display, motion, input also exposed. GitHub SDKs: `facebook/meta-wearables-dat-android` (with `CameraAccess` sample), `facebook/meta-wearables-dat-ios`.
- **Hardware:** Ray-Ban Meta Gen 1/2, Ray-Ban Meta Optics, Meta Ray-Ban Display, Oakley Meta HSTN, Oakley Meta Vanguard. Mock Device Kit simulates a device without hardware.
- **Registration path (roadmap slide):** ① Meta developer account → Wearables Developer Center; ② create project → `APPLICATION_ID` + `CLIENT_TOKEN` (used for app attestation); ③ link glasses in Meta AI app; ④ enable **Developer Mode** in Meta AI app (toggle revealed by tapping app version 5×) — test unpublished apps without store review; ⑤ ship → Meta app review + invite-only release channels.
- **Approval expectations:** dev-mode testing is self-serve and works today; public distribution requires Meta review (timeline unpublished). Platform support: iOS 17.2+, Android 10+; Android needs Kotlin 2.2+.
- **Roadmap line:** "CaptureSource #3 = glasses stream via DAT `CameraAccess` — same frame/audio contract as the phone source; hands-free POV for the umpire who must watch legality AND signal."

---

## 5. Mounting (umpire POV) — products

- **Chest:** KINGKI Magnetic Neck Phone Mount (MagSafe, chest strap + lanyard backup); ARMOR-X MGS-SP01 Magnetic POV Neck Mount; SOH Mingying Magnetic Phone Chest Strap Harness (Amazon); GoPro **Chesty** (needs a phone clamp/MagSafe adapter).
- **Cap brim:** GoPro **Head Strap + QuickClip** (QuickClip grips cap brims; action-cam interface — pair with a lightweight phone clip/MagSafe holder; a full-size phone on a brim is heavy/unstable — chest mount is the reliable demo choice).
- Generic cheap: any "POV magnetic neck mount phone" (category is crowded, ~$20–40).

---

## SOURCES

- MCC Law 21 (No ball), 21.5 feet — https://www.lords.org/mcc/the-laws/no-ball (text via ICC clause 21: https://www.icc-cricket.com/news/mens-test-match-clause-21-no-ball)
- MCC Law 22 (Wide ball) — https://www.lords.org/mcc/the-laws/wide-ball (text via ICC clause 22: https://www.icc-cricket.com/news/mens-test-match-clause-22-wide-ball)
- MCC 2022 law-change note (22.1.1 "had stood" wording) — https://www.lords.org/lords/news-stories/mcc-announces-new-code-of-laws-from-1-october-2022
- Crease definitions, Law 7 (popping crease = back edge of marking) — MCC Laws PDF, lords.org getmedia (2017 Code 4th Ed.)
- Snick classification paper (Khan et al. 2019, 85.7%) — https://journals.tubitak.gov.tr/elektrik/vol27/iss6/7/
- The 5th Umpire (wavelets + NN) — https://doaj.org/article/e5864174fa1a4fc69bdd62f7aa6bee20
- GitHub snick precedents — https://github.com/nikhilnnk/snickometer ; https://github.com/rahul188/cricket-snickometer ; https://github.com/sudo-boo/cric-ai ; https://github.com/bewajafarwah/shot-through-sound
- iOS AVAudioRecorder sample rate — https://developer.apple.com/documentation/avfaudio/avaudiorecorder/init(url:settings:)-5whyq
- Android AudioRecord sample rate (device-dependent, read back) — https://developer.android.com/reference/android/media/AudioRecord.Builder
- Wearables Device Access Toolkit overview + capabilities — https://developers.meta.com/wearables/device-access-toolkit/ ; docs: https://wearables.developer.meta.com/docs/develop/dat/
- DAT Android SDK + CameraAccess sample — https://github.com/facebook/meta-wearables-dat-android ; iOS — https://github.com/facebook/meta-wearables-dat-ios
- DAT announcement (Connect Sept 2025, third-party apps on glasses) — https://roadtovr.com/meta-ray-ban-smart-glasses-third-party-app-sdk-device-access-toolkit/
- WebRTC latency breakdown (glass-to-glass ~100–500ms; camera ≈100ms) — https://transitiverobotics.com/blog/webrtc-latency-breakdown/ ; https://www.videosdk.live/developer-hub/webrtc/webrtc-latency
- Mounts — https://kingki.co/on-body/kingki-magnetic-neck-mount ; https://armor-x.com/products/mgs-sp01-magnetic-pov-neck-mount-for-iphones ; https://www.gopro.com/en/us/shop/mounts-accessories/head-strap-plus-quickclip/ACHOM-001.html ; https://gopro.com/en/us/shop/mounts-accessories/chesty/AGCHM-001.html
