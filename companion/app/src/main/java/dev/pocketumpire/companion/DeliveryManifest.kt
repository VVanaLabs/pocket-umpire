package dev.pocketumpire.companion

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * The delivery manifest consumed by `pnpm cli analyze`
 * (shape: verdicts/over1-manifest.example.json -> [{delivery_id, contact, end, audio_snr_db}]).
 *
 * Files live in app-specific external storage:
 *   /sdcard/Android/data/dev.pocketumpire.companion/files/glasses/
 * which needs no storage permission on API 30+ and is `adb pull`-able.
 *
 * Paths follow docs/dat-bridge-contract.md §1: stills/<delivery_id>-contact.jpg, paths relative
 * to the manifest directory so a pulled folder stays self-consistent; README.md shows the
 * one-liner that absolutizes them for `pnpm cli analyze`.
 */
object DeliveryManifest {
  private const val DIR = "glasses"

  fun dir(context: Context): File =
      File(context.getExternalFilesDir(null), DIR).apply { mkdirs() }

  fun manifestFile(context: Context): File = File(dir(context), "manifest.json")

  fun stillFile(context: Context, deliveryId: String, role: String): File {
    val stills = File(dir(context), "stills").apply { mkdirs() }
    return File(stills, "$deliveryId-$role.jpg")
  }

  /** Appends one delivery. Rewrites the whole array — fine at ~120 balls an innings. */
  fun append(
      context: Context,
      deliveryId: String,
      contact: File,
      end: File,
      audioSnrDb: Double?,
  ) {
    val file = manifestFile(context)
    val entries =
        if (file.exists()) {
          runCatching { JSONArray(file.readText()) }.getOrElse { JSONArray() }
        } else {
          JSONArray()
        }
    entries.put(
        JSONObject()
            .put("delivery_id", deliveryId)
            .put("contact", "stills/${contact.name}")
            .put("end", "stills/${end.name}")
            .put("audio_snr_db", audioSnrDb ?: JSONObject.NULL))
    file.writeText(entries.toString(2))
  }
}
