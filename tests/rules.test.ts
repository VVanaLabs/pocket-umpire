import { describe, expect, it } from "vitest";
import { checkFrontFoot, checkWide, needsArbiter } from "../src/rules.js";
import { applyBall, freshScore } from "../src/score.js";
import { applyHomography, dltHomography } from "../src/geometry.js";

describe("Law 21.5.2 front foot (back edge, doubt favors batter)", () => {
  it("toe on the line is legal", () => {
    expect(checkFrontFoot(0).status).toBe("pass");
  });
  it("6cm over is no-ball", () => {
    const r = checkFrontFoot(0.06);
    expect(r.status).toBe("fail");
    expect(r.margin_cm).toBeCloseTo(6);
  });
  it("within 3cm margin stays legal", () => {
    expect(checkFrontFoot(0.02).status).toBe("pass");
  });
  it("raised foot behind the line is legal", () => {
    expect(checkFrontFoot(-0.01).status).toBe("pass");
  });
  it("occluded foot is unclear, never fabricated", () => {
    expect(checkFrontFoot(0.2, true).status).toBe("unclear");
  });
  it("null geometry is unclear", () => {
    expect(checkFrontFoot(null).status).toBe("unclear");
  });
});

describe("Law 22 wide + 21.13 ordering", () => {
  it("beyond line + margin is wide", () => {
    expect(checkWide(1.0).status).toBe("fail");
  });
  it("inside the line is legal", () => {
    expect(checkWide(0.5).status).toBe("pass");
  });
  it("no-ball overrides wide", () => {
    const r = checkWide(1.2, { noBall: true });
    expect(r.status).not.toBe("fail");
  });
  it("bat contact cancels wide", () => {
    expect(checkWide(1.2, { batContact: true }).status).toBe("pass");
  });
  it("lost track is unclear", () => {
    expect(checkWide(null).status).toBe("unclear");
  });
});

describe("arbiter trigger", () => {
  it("marginal foot goes to Spark", () => {
    expect(
      needsArbiter(checkFrontFoot(0.04), checkWide(0.5), 0.9),
    ).toBe(true);
  });
  it("clear legal skips the arbiter", () => {
    expect(
      needsArbiter(checkFrontFoot(-0.3), checkWide(0.2), 0.9),
    ).toBe(false);
  });
  it("low confidence always arbitrates", () => {
    expect(
      needsArbiter(checkFrontFoot(-0.3), checkWide(0.2), 0.4),
    ).toBe(true);
  });
});

describe("score state machine", () => {
  it("legal ball increments the ball count", () => {
    const s = applyBall(freshScore(), "O1B1", "legal", 1);
    expect(s.runs).toBe(1);
    expect(s.legalBalls).toBe(1);
  });
  it("wide adds a run and rebowls", () => {
    const s = applyBall(freshScore(), "O1B1", "wide");
    expect(s.runs).toBe(1);
    expect(s.legalBalls).toBe(0);
  });
  it("no-ball adds a run and rebowls", () => {
    const s = applyBall(freshScore(), "O1B1", "no_ball");
    expect(s.runs).toBe(1);
    expect(s.legalBalls).toBe(0);
  });
  it("six legal balls complete the over", () => {
    let s = freshScore();
    for (let i = 1; i <= 6; i++) s = applyBall(s, `O1B${i}`, "legal");
    expect(s.over).toBe(1);
    expect(s.legalBalls).toBe(0);
  });
});

describe("homography round-trip", () => {
  it("synthetic pitches map back to <1cm", () => {
    const src = [
      { x: 100, y: 800 },
      { x: 1180, y: 800 },
      { x: 200, y: 100 },
      { x: 1080, y: 100 },
    ];
    const dst = [
      { x: -1.525, y: 1.22 },
      { x: 1.525, y: 1.22 },
      { x: -1.525, y: 18.9 },
      { x: 1.525, y: 18.9 },
    ];
    const H = dltHomography(src, dst);
    for (let i = 0; i < 4; i++) {
      const p = applyHomography(H, src[i]);
      expect(Math.hypot(p.x - dst[i].x, p.y - dst[i].y)).toBeLessThan(0.01);
    }
  });
});
