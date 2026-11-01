package dev.pocketumpire.companion

import android.Manifest
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.meta.wearable.dat.camera.Camera
import com.meta.wearable.dat.camera.addCamera
import com.meta.wearable.dat.camera.types.PhotoData
import com.meta.wearable.dat.camera.types.StreamConfiguration
import com.meta.wearable.dat.camera.types.VideoQuality
import com.meta.wearable.dat.core.Wearables
import com.meta.wearable.dat.core.selectors.AutoDeviceSelector
import com.meta.wearable.dat.core.session.DeviceSession
import com.meta.wearable.dat.core.session.DeviceSessionState
import com.meta.wearable.dat.core.types.Permission
import com.meta.wearable.dat.core.types.PermissionStatus
import com.meta.wearable.dat.mockdevice.MockDeviceKit
import com.meta.wearable.dat.mockdevice.api.GlassesModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Glasses companion app scaffold for Pocket Umpire (Meta Wearables DAT).
 *
 * Does the DAT plumbing that `GlassesSource` in src/capture.ts assumes:
 * register -> DeviceSession -> camera stream -> contact/end photo capture -> manifest JSON.
 *
 * Not the real product: segmentation is a button press + fixed 2.5s gap, and audio SNR is not
 * measured yet (see the TODOs). See README.md for what is and is not verified.
 */
class MainActivity : ComponentActivity() {

  private companion object {
    const val TAG = "PocketUmpire/DAT"
    // adb shell am start -n dev.pocketumpire.companion/.MainActivity --ez mwdat_mock true
    const val EXTRA_MOCK = "mwdat_mock"
    const val EXTRA_MOCK_VIDEO = "mock_video_uri"
    const val EXTRA_MOCK_IMAGE = "mock_image_uri"
    // Seconds between the contact still and the end still (+~2.5s per docs/dat-integration.md).
    const val END_STILL_DELAY_MS = 2_500L
    val ANDROID_PERMISSIONS =
        arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.INTERNET)
  }

  private lateinit var logView: TextView
  private var session: DeviceSession? = null
  private var camera: Camera? = null
  private var registered = false
  private var ballNumber = 0

  private val runtimePermissions =
      registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        log("android permissions: $granted")
        Wearables.initialize(this)
            .onFailure { error, _ -> log("Wearables.initialize failed: ${error.description}") }
        observeRegistration()
      }

  // DAT device permission (camera) is granted through the Meta AI app, not an Android dialog.
  private val datPermission =
      registerForActivityResult(Wearables.RequestPermissionContract()) { result ->
        result
            .onSuccess { status ->
              if (status == PermissionStatus.Granted) addCameraStream()
              else log("DAT camera permission: $status")
            }
            .onFailure { error, _ -> log("DAT permission request failed: ${error.description}") }
      }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(buildUi())
    maybeEnableMockDeviceKit()
    runtimePermissions.launch(ANDROID_PERMISSIONS)
  }

  // --- DAT session -------------------------------------------------------------------------

  private fun observeRegistration() {
    lifecycleScope.launch {
      Wearables.registrationState.collect { state ->
        log("registration: $state")
        registered = state.isRegistered
        if (registered && session == null) startSession()
      }
    }
  }

  private fun register() {
    log("starting registration — approve in the Meta AI app")
    Wearables.startRegistration(this)
  }

  private fun startSession() {
    if (session != null) return
    Wearables.createSession(AutoDeviceSelector())
        .onSuccess { created ->
          session = created
          lifecycleScope.launch {
            created.errors.collect { error -> log("session error: ${error.description}") }
          }
          // Subscribe before start(): the state flow emits the initial STARTING/STARTED transit.
          lifecycleScope.launch {
            created.state.collect { state ->
              log("session state: $state")
              if (state == DeviceSessionState.STARTED && camera == null) {
                datPermission.launch(Permission.CAMERA)
              }
            }
          }
          // Fire-and-forget: failures surface through created.errors.
          created.start()
        }
        .onFailure { error, _ -> log("createSession failed: ${error.description}") }
  }

  /** Adds the camera capability and starts the stream. Only valid once the session is STARTED. */
  private fun addCameraStream() {
    val activeSession = session ?: return
    val config = StreamConfiguration(videoQuality = VideoQuality.MEDIUM, frameRate = 24)
    activeSession
        .addCamera(config)
        .onSuccess { added ->
          camera = added
          // Log the config we asked for; the granted config is whatever the device negotiates,
          // visible in the stream state/error logs below.
          log("camera added: MEDIUM (504x896) @24fps; watching stream:")
          lifecycleScope.launch {
            added.stream.state.collect { state -> log("stream state: $state") }
          }
          lifecycleScope.launch {
            added.stream.errorStream.collect { error ->
              log("stream error: ${error.description}")
            }
          }
          added.stream.start().onFailure { error, _ ->
            log("stream start failed: ${error.description}")
          }
        }
        .onFailure { error, _ -> log("addCamera failed: ${error.description}") }
  }

  // --- Delivery capture (the seam) ----------------------------------------------------------

  /**
   * TODO(segmentation): this is the seam. Replace the button press with the existing onset picker
   * running on the glasses mic stream: one delivery = bat crack -> contact still -> +2.5s end still.
   * Every delivery captured here becomes one manifest entry, nothing else in the pipeline changes.
   */
  private fun captureDelivery() {
    val activeCamera = camera
    if (activeCamera == null) {
      log("no camera — connect first")
      return
    }
    ballNumber += 1
    val deliveryId = "O1B$ballNumber"
    val contact = DeliveryManifest.stillFile(this, deliveryId, "contact")
    val end = DeliveryManifest.stillFile(this, deliveryId, "end")

    lifecycleScope.launch {
      if (!captureStill(activeCamera, contact)) return@launch
      log("contact still -> ${contact.name}")
      delay(END_STILL_DELAY_MS)
      if (!captureStill(activeCamera, end)) return@launch
      // TODO(mic): audio_snr_db must come from the beamformed glasses mic (snick band vs ambient),
      // measured across the same window the onset picker uses. Null until that lands.
      DeliveryManifest.append(this@MainActivity, deliveryId, contact, end, audioSnrDb = null)
      log("manifest += $deliveryId -> ${DeliveryManifest.manifestFile(this@MainActivity)}")
    }
  }

  private suspend fun captureStill(activeCamera: Camera, target: File): Boolean {
    var saved = false
    activeCamera.stream
        .capturePhoto()
        .onSuccess { photo ->
          val jpeg = withContext(Dispatchers.Default) { toJpeg(photo) }
          if (jpeg == null) {
            log("capture ${target.name}: could not decode photo")
          } else {
            target.writeBytes(jpeg)
            saved = true
          }
        }
        .onFailure { error, _ -> log("capture ${target.name} failed: ${error.description}") }
    return saved
  }

  // shortcut: no EXIF rotation applied (HEIC orientation tag), so stills can be rotated 90 degrees;
  // re-encode through androidx.exifinterface when verdicts/matching starts depending on image rotation.
  private fun toJpeg(photo: PhotoData): ByteArray? {
    val bitmap =
        when (photo) {
          is PhotoData.Bitmap -> photo.bitmap
          is PhotoData.HEIC -> {
            val buffer = photo.data.duplicate()
            buffer.rewind()
            val bytes = ByteArray(buffer.remaining())
            buffer.get(bytes)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
          }
        } ?: return null
    return ByteArrayOutputStream().use { out ->
      if (bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)) out.toByteArray() else null
    }
  }

  // --- MockDeviceKit ------------------------------------------------------------------------

  /** Debug-only: simulated glasses so the flow runs on a phone without hardware. */
  private fun maybeEnableMockDeviceKit() {
    if (!BuildConfig.DEBUG || !intent.getBooleanExtra(EXTRA_MOCK, false)) return
    val kit = MockDeviceKit.getInstance(applicationContext)
    kit.enable()
    kit.pairGlasses(GlassesModel.RAYBAN_META)
        .onSuccess { device ->
          device.powerOn()
          device.unfold()
          device.don()
          intent.getStringExtra(EXTRA_MOCK_VIDEO)?.let {
            device.services.camera.setCameraFeed(Uri.parse(it))
            log("mock camera feed: $it")
          }
          intent.getStringExtra(EXTRA_MOCK_IMAGE)?.let {
            device.services.camera.setCapturedImage(Uri.parse(it))
            log("mock captured image: $it")
          }
          log("mock device paired: RayBan Meta (streaming works without glasses)")
        }
        .onFailure { error, _ -> log("mock pairGlasses failed: ${error.description}") }
  }

  // --- UI (log view only: no display work here, that is site/hud.html) ------------------------

  private fun buildUi(): ScrollView {
    logView =
        TextView(this).apply {
          textSize = 12f
          setPadding(32, 32, 32, 32)
        }
    val layout =
        LinearLayout(this).apply {
          orientation = LinearLayout.VERTICAL
          addView(
              Button(this@MainActivity).apply {
                text = "Connect glasses"
                setOnClickListener { if (registered) startSession() else register() }
              })
          addView(
              Button(this@MainActivity).apply {
                text = "Capture delivery (contact + end)"
                setOnClickListener { captureDelivery() }
              })
          addView(logView)
        }
    return ScrollView(this).apply { addView(layout) }
  }

  private fun log(message: String) {
    Log.i(TAG, message)
    runOnUiThread { logView.append("$message\n") }
  }
}
