// Meta-ecosystem config. Key comes from env only — never committed.
// The v2 analyze path uses the contributor model by default (cheap, disclosed in docs/cost.md); set SPARK_DEV_MODEL=muse-spark-1.3 for Standard (no content training).
export const META_BASE_URL = "https://api.meta.ai/v1";

export function metaApiKey(): string {
  const k = process.env.META_API_KEY;
  if (!k) throw new Error("META_API_KEY is not set (see .env.example)");
  return k;
}

export const SPARK_MODEL = process.env.SPARK_MODEL ?? "muse-spark-1.3";
export const SPARK_DEV_MODEL =
  process.env.SPARK_DEV_MODEL ?? "muse-spark-1.3-contributor";
export const SAM_MODEL = process.env.SAM_MODEL ?? "sam-3.1";

// Tunables from PLAN/docs — all in config, shown in UI.
export const LAW = {
  /** No-ball margin: foot over crease back-edge by more than this (m) → NO-BALL. Doubt favors batter. */
  NO_BALL_MARGIN_M: 0.03,
  /** Wide margin beyond the off-side plane (m). */
  WIDE_MARGIN_M: 0.1,
  /** Off-side wide plane for RH batter (m from middle stump). Sign flips by config. */
  WIDE_OFF_M: 0.84,
  /** Arbiter triggers. */
  ARBITER_FOOT_EPS_M: 0.05,
  ARBITER_WIDE_EPS_M: 0.15,
  ARBITER_MIN_CONF: 0.6,
} as const;
