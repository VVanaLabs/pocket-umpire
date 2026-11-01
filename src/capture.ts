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

// LivePhoneSource / GlassesSource: same interface, transport TBD (roadmap).
// Sync across devices: clap at record start per device → audio cross-correlation
// gives clockOffsetS to ~1 frame. shortcut: manual offset entry until auto-sync
// is built; audio stays the master clock on every device.
