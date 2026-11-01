# Glasses companion app (Meta Wearables DAT) — scaffold

Android companion app for the Pocket Umpire glasses path. It does the DAT plumbing that
`GlassesSource` (`src/capture.ts`) assumes: register the project, open a `DeviceSession`, add a
camera stream, capture **contact** and **end** stills per delivery, and append them to a manifest
JSON shaped exactly like `verdicts/over1-manifest.example.json` — so `pnpm cli analyze` consumes it
unchanged.

**Status: scaffold. Never built, never run on hardware, never run on Mock Device.**
See [Verified vs unverified](#verified-vs-unverified) before trusting anything here.

## DAT version and artifacts

| Item | Value | Where it came from |
|---|---|---|
| SDK version | `1.0.1` | `mavenCentral` + `gradle/libs.versions.toml`; matches the version pinned in the upstream `CameraAccess` sample |
| Artifacts | `com.meta.wearable:mwdat-core:1.0.1`, `mwdat-camera:1.0.1`, `mwdat-mockdevice:1.0.1` | Maven Central (group `com.meta.wearable`); no access token needed |
| API surface | `Wearables.initialize/startRegistration/createSession`, `session.addCamera(StreamConfiguration)`, `camera.stream.start/state/errorStream/capturePhoto`, `PhotoData.Bitmap|HEIC`, `MockDeviceKit` | github.com/facebook/meta-wearables-dat-android — `README.md`, `plugins/mwdat-android/skills/{getting-started,camera-streaming,mockdevice-testing,permissions-registration}/SKILL.md`, and `samples/CameraAccess/app/build.gradle.kts` + `MainActivity.kt` |
| Build toolchain | AGP `8.11.1`, Kotlin `2.2.21`, Gradle wrapper `8.14.1`, `compileSdk`/`targetSdk` 36, `minSdk` 31 | same sample's `gradle/libs.versions.toml` / wrapper |

Upstream install guidance (Android SDK 36, Meta AI app, Developer Mode) is documented at
wearables.developer.meta.com/docs/develop/dat/build-integration-android.

## Setup

1. **Tooling** — Android Studio, JDK 17+ (wrapper uses Gradle 8.14.1), Android SDK **platform 36**.
   `compileSdk = 36` needs the platform installed; the wrapper alone is not enough.
2. **Credentials (placeholders, no secrets in the repo).**
   ```bash
   cd companion
   cp local.properties.example local.properties   # git-ignored
   ```
   For **Developer Mode** nothing else is needed: both placeholders are `"0"` and DAT attestation
   is skipped. For a production build, put the `APPLICATION_ID` / `CLIENT_TOKEN` from the Wearables
   Developer Center into `local.properties` (`mwdat_application_id`, `mwdat_client_token`). They are
   injected through `manifestPlaceholders` into the manifest `meta-data` entries.
3. **Build**
   ```bash
   cd companion
   ./gradlew :app:assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
4. **Developer Mode on the phone** — install the Meta AI app, enable Developer Mode (Meta AI app →
   Settings → Developer Mode), pair the glasses in the Meta AI app.
5. **Run** — launch *Pocket Umpire Glasses*, tap **Connect glasses**, approve registration in the
   Meta AI app. The activity log shows registration state, session state, stream state and the
   negotiated stream config. **Capture delivery** writes one delivery (contact still → 2.5s → end
   still → manifest entry).

## Mock Device Kit (no glasses)

`mwdat-mockdevice` is wired behind `BuildConfig.DEBUG`. Launch with the `mwdat_mock` extra and the
app pairs a simulated Ray-Ban Meta, powers it on, unfolds and dons it — a real `DeviceSession`
then runs end-to-end without hardware. (MockDeviceKit auto-registers `Wearables.registrationState`.)

```bash
# Optional mock media (must live in the app's own external files dir: no storage permission needed)
adb push plant.mov /sdcard/Android/data/dev.pocketumpire.companion/files/plant.mov
adb push plant.png /sdcard/Android/data/dev.pocketumpire.companion/files/plant.png

# Mock video must be H.265/HEVC (Android does not transcode mock feeds):
# ffmpeg -hwaccel videotoolbox -i input.mp4 -c:v hevc_videotoolbox -c:a aac_at -tag:v hvc1 \
#   -vf "scale=540:960" plant.mov

adb shell am start -n dev.pocketumpire.companion/.MainActivity \
  --ez mwdat_mock true \
  --es mock_video_uri file:///sdcard/Android/data/dev.pocketumpire.companion/files/plant.mov \
  --es mock_image_uri file:///sdcard/Android/data/dev.pocketumpire.companion/files/plant.png
```

`setCameraFeed(Uri)` is used on purpose: the `CameraFacing` variant streams the **phone** camera and
needs `android.permission.CAMERA`, which is *not* in the manifest (that is the handset permission,
unrelated to the DAT `Permission.CAMERA` the app requests through the Meta AI app).

Then tap **Connect glasses** → **Capture delivery**. Same manifest path as with real glasses.

## Stills → `pnpm cli analyze`

Stills + manifest are written to app-specific external storage (no storage permission, API 30+):

```
/sdcard/Android/data/dev.pocketumpire.companion/files/glasses/
  manifest.json          # [{delivery_id, contact, end, audio_snr_db}]
  stills/
    O1B1-contact.jpg
    O1B1-end.jpg
```

Naming and fields follow `docs/dat-bridge-contract.md` §1 (flat `BallInput` array, no extra
fields, `stills/<delivery_id>-{contact,end}.jpg`). Manifest paths are stored **relative to the
manifest directory**, so pull and rewrite them to the local pull location before analysis:

```bash
adb pull /sdcard/Android/data/dev.pocketumpire.companion/files/glasses ./glasses-out

OUT="$(pwd)/glasses-out"
jq --arg out "$OUT" 'map(.contact = "\($out)/\(.contact)" | .end = "\($out)/\(.end)")' \
  glasses-out/manifest.json > out/glasses-manifest.json

pnpm cli analyze out/glasses-manifest.json
```

`label_runs` (ground truth) is not emitted by the app; add it in the manifest when scoring a
labelled over, exactly as in the phone-verified flow.

## What is stubbed (the seam)

`MainActivity.captureDelivery()` is the marked seam:

```kotlin
// TODO(segmentation): replace the button press with the onset picker on the glasses mic stream:
// one delivery = bat crack -> contact still -> +2.5s end still.
// TODO(mic): audio_snr_db from the beamformed glasses mic (snick band vs ambient).
```

So today: one delivery per tap, fixed 2.5s contact→end gap, `audio_snr_db: null`. Replacing the tap
with the existing onset picker is the only change the rest of the pipeline needs.

## Verified vs unverified

Verified while writing this scaffold:

- `./gradlew --version` → Gradle 8.14.1 runs.
- `./gradlew help` and `./gradlew :app:tasks` → settings, version catalog and both build scripts
  configure successfully.
- `./gradlew :app:dependencies --configuration debugRuntimeClasspath` → `mwdat-core:1.0.1`,
  `mwdat-camera:1.0.1`, `mwdat-mockdevice:1.0.1` resolve from Maven Central.
- `https://repo1.maven.org/maven2/com/meta/wearable/<artifact>/1.0.1/<artifact>-1.0.1.pom` → HTTP 200
  for all three artifacts.
- `manifestPlaceholders` → manifest `meta-data` wiring copied from the upstream sample.

**Not verified (blockers):**

- **No Android SDK on this machine** (`~/Library/Android/sdk` does not exist; `ANDROID_HOME` points
  at it anyway). Per the spike brief, no SDK was installed, so the app has **not been compiled**:
  `./gradlew :app:compileDebugKotlin` fails with
  `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path ...`.
  Kotlin/Java compile errors are therefore possible — API names were taken from the upstream skills
  and sample, not from a successful compile.
- No DAT project registration, no paired glasses, no phone: registration, session, stream, photo
  capture and the Mock Device path have **not been executed**.
- No `DeliveryClip`/segmentation or mic/SNR work: the companion emits stills + manifest only.

## Next steps

1. Install Android SDK platform 36 (or open `companion/` in Android Studio) and get
   `./gradlew :app:assembleDebug` green; fix any compile errors that surface.
2. Run the Mock Device path on a phone; confirm session `STARTED` → stream `STREAMING` → two JPEGs
   in `stills/` and a well-formed manifest (the §5 acceptance test in
   `docs/dat-bridge-contract.md`).
3. Swap the tap for the onset picker (`src/capture.ts` picker logic, ported to Kotlin) and measure
   `audio_snr_db` on the glasses mic.
4. Register a Wearables Developer Center project, fill `local.properties`, pair real glasses, and
   compare granted stream config/latency against the 20–40s between-balls budget.
