// CaptureSource: every camera is one of these. File today, phones + glasses tomorrow.
// Angles are tagged per delivery so geometry knows its viewpoint; the arbiter
// resolves conflicts (e.g. side angle says foot over, end angle unclear → side wins).
export type AngleRole =
  | "behind-stumps" // what the tape-match footage is: bowled/boundary/runs
  | "side-on" // front-foot no-ball gold: crease + landing foot in profile
  | "square-leg" // wide + LBW impact zone support
  | "umpire-pov"; // chest mount / glasses: the product view

export type SourceKind = "file" | "live-phone" | "glasses";

export interface DeliveryClip {
  ballId: string;
  angle: AngleRole;
  source: SourceKind;
  clipPath: string;
  audioPath: string;
  /** Seconds to add to this source's clock to align with match clock (clap-sync). */
  clockOffsetS: number;
}

export interface CaptureSource {
  readonly kind: SourceKind;
  readonly angle: AngleRole;
  /** Yields one clip per delivery, clock-corrected. File impl replays; live/glasses stream. */
  deliveries(): AsyncIterable<DeliveryClip>;
}

/** File replay (the demo). Additional angles = more files with role tags + offsets. */
export class FileCaptureSource implements CaptureSource {
  readonly kind = "file" as const;
  constructor(
    readonly angle: AngleRole,
    private clips: Omit<DeliveryClip, "angle" | "source">[],
  ) {}
  async *deliveries(): AsyncIterable<DeliveryClip> {
    for (const c of this.clips)
      yield { ...c, angle: this.angle, source: "file" };
  }
}

/**
 * Meta AI glasses via the Wearables Device Access Toolkit (DAT).
 * A DAT DeviceSession streams camera frames + mic audio to the companion
 * phone app; this source segments that stream into per-delivery clips
 * (onset-detected on the audio channel) and yields them exactly like a
 * file. Session lifecycle, stream config, and the delivery contract are
 * specified in docs/dat-integration.md. Implementation lands with device
 * access; today it throws without a registered project rather than
 * fabricating clips.
 * shortcut: empty stream until DAT project registration + hardware;
 * the HUD prototype (site/hud.html) exercises the display contract.
 */
export class GlassesSource implements CaptureSource {
  readonly kind = "glasses" as const;
  readonly angle = "umpire-pov" as const;
  constructor(private datProjectId?: string) {}
  async *deliveries(): AsyncIterable<DeliveryClip> {
    if (!this.datProjectId)
      throw new Error(
        "GlassesSource: DAT project not registered (see docs/dat-integration.md)",
      );
    // DAT session frames arrive here once hardware is paired; each detected
    // delivery becomes a DeliveryClip with clockOffsetS = 0 (glasses are the
    // master clock: the umpire's own view defines match time).
    return;
  }
}

// LivePhoneSource: same interface, transport TBD (roadmap).
// Sync across devices: clap at record start per device → audio cross-correlation
// gives clockOffsetS to ~1 frame. shortcut: manual offset entry until auto-sync
// is built; glasses (when present) are the master clock (offset 0),
// phones sync to it, otherwise the first phone's audio clock is master.
