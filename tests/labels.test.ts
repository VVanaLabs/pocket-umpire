import { describe, expect, it } from "vitest";
import { ingestCorrections } from "../src/labels.js";

const CSV = `id,t_s,model_runs,model_wicket,agent_strip_read,label_runs,label_wicket,status
m2b01,18.0,0,false,unclear; late swing,,,needs_human_video_pass
m2b02,74.9,6,false,lofted,6,false,agent_reviewed_plausible
`;

describe("ingestCorrections", () => {
  it("labels touched rows, keeps model columns, reports disagreement", () => {
    const r = ingestCorrections(CSV, [
      { id: "m2b01", runs: "4", wicket: "false" },
      { id: "m2b02", runs: "6", wicket: "false" },
    ]);
    expect(r.labeled).toEqual(["m2b01", "m2b02"]);
    expect(r.agree).toBe(1);
    expect(r.disagree[0]).toContain("m2b01: model 0/false vs human 4/false");
    expect(r.csv).toContain("m2b01,18.0,0,false,unclear; late swing,4,false,human_labeled");
  });
  it("skips corrections without runs and unknown ids", () => {
    const r = ingestCorrections(CSV, [{ id: "m2b01" }, { id: "nope", runs: "1" }]);
    expect(r.labeled).toEqual([]);
    expect(r.skipped.sort()).toEqual(["m2b01", "nope"]);
  });
});
