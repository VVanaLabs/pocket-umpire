// Score state machine: pure code, unit-tested. Illegal balls never increment ball count.
export type VerdictDecision = "legal" | "no_ball" | "wide";
export type MatchScore = {
  runs: number;
  wickets: number;
  legalBalls: number; // balls in current over
  over: number;
  ballLog: { delivery_id: string; decision: string; runs: number }[];
};

export function freshScore(): MatchScore {
  return { runs: 0, wickets: 0, legalBalls: 0, over: 0, ballLog: [] };
}

/** Wide/no-ball = 1 run penalty + rebowl (Laws 22.6/21.13). Boundary/bowled applied via extraRuns/wicket. */
export function applyBall(
  s: MatchScore,
  delivery_id: string,
  decision: VerdictDecision,
  extraRuns = 0,
  wicket = false,
): MatchScore {
  const runs = decision === "legal" ? extraRuns : 1 + extraRuns;
  const legal = decision === "legal";
  const legalBalls = s.legalBalls + (legal ? 1 : 0);
  const overDone = legalBalls >= 6;
  return {
    runs: s.runs + runs,
    wickets: s.wickets + (wicket ? 1 : 0),
    legalBalls: overDone ? 0 : legalBalls,
    over: overDone ? s.over + 1 : s.over,
    ballLog: [...s.ballLog, { delivery_id, decision, runs }],
  };
}

export function oversBowled(s: MatchScore): string {
  return `${s.over}.${s.legalBalls}`;
}
