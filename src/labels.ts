// Corrections intake: dashboard corrections JSON -> human labels in the
// match labels CSV. Only rows the dashboard marked as touched (a human
// edited/confirmed them) become ground truth; model columns never change.

export interface Correction {
  id: string;
  runs?: string;
  wicket?: string;
}

export interface IngestResult {
  csv: string;
  labeled: string[];
  skipped: string[];
  agree: number;
  disagree: string[];
}

// CSV columns: id,t_s,model_runs,model_wicket,agent_strip_read,label_runs,label_wicket,status
// agent_strip_read may contain commas, so anchor from both ends.
function parseRow(line: string): string[] | null {
  const p = line.split(",");
  if (p.length < 8) return null;
  return [p[0], p[1], p[2], p[3], p.slice(4, p.length - 3).join(","), p[p.length - 3], p[p.length - 2], p[p.length - 1]];
}

export function ingestCorrections(csvText: string, corrections: Correction[]): IngestResult {
  const byId = new Map(corrections.map((c) => [c.id, c]));
  const labeled: string[] = [];
  const skipped: string[] = [];
  const disagree: string[] = [];
  let agree = 0;
  const lines = csvText.trimEnd().split("\n");
  const out = lines.map((line, i) => {
    if (i === 0) return line;
    const row = parseRow(line);
    if (!row) return line;
    const c = byId.get(row[0]);
    if (!c || c.runs === undefined || c.runs === "") {
      if (c) skipped.push(row[0]);
      return line;
    }
    const runs = Number(c.runs);
    if (!Number.isInteger(runs) || runs < 0) throw new Error(`bad runs for ${row[0]}: ${c.runs}`);
    const wicket = c.wicket === "true" ? "true" : "false";
    row[5] = String(runs);
    row[6] = wicket;
    row[7] = "human_labeled";
    labeled.push(row[0]);
    if (Number(row[2]) === runs && row[3] === wicket) agree++;
    else disagree.push(`${row[0]}: model ${row[2]}/${row[3]} vs human ${runs}/${wicket}`);
    return row.join(",");
  });
  for (const c of corrections) if (!labeled.includes(c.id) && !skipped.includes(c.id)) skipped.push(c.id);
  return { csv: out.join("\n") + "\n", labeled, skipped, agree, disagree };
}
