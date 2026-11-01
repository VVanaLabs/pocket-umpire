import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.jetbrains.kotlin.android)
}

// DAT credentials from the Wearables Developer Center live in local.properties (git-ignored).
// Copy local.properties.example and fill it in. Empty values = Developer Mode, where DAT
// attestation is skipped, so the app still registers against the Meta AI app.
val localProperties =
    Properties().apply {
      val file = rootDir.resolve("local.properties")
      if (file.exists()) file.inputStream().use { load(it) }
    }

android {
  namespace = "dev.pocketumpire.companion"
  compileSdk = 36

  buildFeatures { buildConfig = true }

  defaultConfig {
    applicationId = "dev.pocketumpire.companion"
    minSdk = 31
    targetSdk = 36
    versionCode = 1
    versionName = "0.1"

    // Injected into AndroidManifest.xml meta-data (com.meta.wearable.mwdat.APPLICATION_ID /
    // CLIENT_TOKEN). "0" is the Developer Mode value: no real project credentials yet.
    manifestPlaceholders["mwdat_application_id"] =
        localProperties.getProperty("mwdat_application_id", "0")
    manifestPlaceholders["mwdat_client_token"] =
        localProperties.getProperty("mwdat_client_token", "0")
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
}

kotlin { compilerOptions { jvmTarget = JvmTarget.JVM_17 } }

dependencies {
  implementation(libs.androidx.activity)
  implementation(libs.androidx.lifecycle.runtime)
  implementation(libs.mwdat.core)
  implementation(libs.mwdat.camera)
  // MockDeviceKit: simulated glasses for development without hardware (debug + release builds here
  // so the mock path can be exercised on a plain phone; drop it from release when hardware ships).
  implementation(libs.mwdat.mockdevice)
}
