import { z } from "zod";
import { LAW } from "./config.js";

// MCC 21.5.2: some part of the foot, grounded or raised, must be behind the
// popping-crease BACK edge. d = foot_rearmost − crease_back_edge (meters, + = over).
export type FootCheck = {
  status: "pass" | "fail" | "unclear";
  margin_cm: number;
  law: "MCC 21.5.2";
};
export function checkFrontFoot(
  dMeters: number | null,
  occluded = false,
): FootCheck {
  if (dMeters === null || occluded)
    return { status: "unclear", margin_cm: NaN, law: "MCC 21.5.2" };
  const margin_cm = dMeters * 100;
  if (dMeters > LAW.NO_BALL_MARGIN_M)
    return { status: "fail", margin_cm, law: "MCC 21.5.2" };
  return { status: "pass", margin_cm, law: "MCC 21.5.2" }; // |d| ≤ margin → legal, doubt favors batter
}

// MCC 22: ball crossing the stump plane beyond the wide plane + margin → wide.
// Order: no-ball first (21.13 overrides wide); bat contact cancels wide (22.4.2).
export type WideCheck = {
  status: "pass" | "fail" | "unclear";
  margin_cm: number;
  law: "MCC 22.1.1";
};
export function checkWide(
  crossingX: number | null,
  opts: { wideLineX?: number; noBall?: boolean; batContact?: boolean } = {},
): WideCheck {
  const lineX = opts.wideLineX ?? LAW.WIDE_OFF_M;
  if (opts.noBall) return { status: "pass", margin_cm: 0, law: "MCC 22.1.1" }; // 21.13: no-ball overrides wide
  if (opts.batContact)
    return { status: "pass", margin_cm: 0, law: "MCC 22.1.1" };
  if (crossingX === null)
    return { status: "unclear", margin_cm: NaN, law: "MCC 22.1.1" };
  const margin_cm = (Math.abs(crossingX) - lineX) * 100;
  if (crossingX > lineX + LAW.WIDE_MARGIN_M)
    return { status: "fail", margin_cm, law: "MCC 22.1.1" };
  return { status: "pass", margin_cm, law: "MCC 22.1.1" };
}

export const VerdictSchema = z.object({
  delivery_id: z.string(),
  decision: z.enum(["legal", "no_ball", "wide"]),
  decision_source: z.enum(["pipeline", "voice", "voice_override"]),
  checks: z.object({
    front_foot: z.object({
      status: z.enum(["pass", "fail", "unclear"]),
      margin_cm: z.number(),
      law: z.literal("MCC 21.5.2"),
    }),
    wide: z.object({
      status: z.enum(["pass", "fail", "unclear"]),
      margin_cm: z.number(),
      law: z.literal("MCC 22.1.1"),
    }),
  }),
  confidence: z.number().min(0).max(1),
});
export type Verdict = z.infer<typeof VerdictSchema>;

/** Arbiter trigger: margin < ε or confidence < 0.6 → ask Spark, else code decides. */
export function needsArbiter(
  foot: FootCheck,
  wide: WideCheck,
  confidence: number,
): boolean {
  if (confidence < LAW.ARBITER_MIN_CONF) return true;
  if (foot.status === "unclear" || wide.status === "unclear") return true;
  if (Math.abs(foot.margin_cm) / 100 < LAW.ARBITER_FOOT_EPS_M) return true;
  if (wide.status !== "pass" || Math.abs(wide.margin_cm) / 100 < LAW.ARBITER_WIDE_EPS_M)
    return wide.status === "fail" || !Number.isNaN(wide.margin_cm);
  return false;
}
