// Public-safe dashboard generator: committed JSON only, NO third-party stills.
// Balls deep-link to exact YouTube seconds; verdict fields are contenteditable
// and corrections export as JSON (the human-in-the-loop labeling pass).
import { readFileSync, writeFileSync } from "node:fs";
const log = JSON.parse(readFileSync("verdicts/match2.json", "utf8"));
const DUR = 560.6;
let runs = 0, wkts = 0;
const balls = log.map((e, i) => {
  runs += e.verdict.runs; wkts += e.verdict.wicket ? 1 : 0;
  const cls = e.verdict.wicket ? "w" : e.verdict.runs === 6 ? "six" : e.verdict.runs > 0 ? "r" : "d";
  return { ...e, cls, cum: `${runs}/${wkts}`, n: i + 1, yt: `https://www.youtube.com/watch?v=zO2ztbJ3bI8&t=${Math.floor(e.t)}s` };
});
const sixes = balls.filter((b) => b.verdict.runs === 6).length;
const cards = balls.map((b) => `
<div class="card ${b.cls}" id="c-${b.id}">
<div class="head"><b>#${b.n} ${b.id}</b> · t=${b.t}s · model: ${b.verdict.runs}${b.verdict.wicket ? "+W" : ""} · model cum ${b.cum} · <a href="${b.yt}" target="_blank">▶ watch this ball</a></div>
<div class="row"><label>decision <span class="ed" contenteditable data-f="decision">${b.verdict.decision}</span></label>
<label>runs <span class="ed" contenteditable data-f="runs">${b.verdict.runs}</span></label>
<label>wicket <span class="ed" contenteditable data-f="wicket">${b.verdict.wicket}</span></label>
<label>note <span class="ed wide" contenteditable data-f="one_line">${b.verdict.one_line}</span></label></div>
<div class="meta">board-stumps boxes on contact still: ${b.board_boxes}/1 image · label status: see match2-labels.csv</div>
</div>`).join("\n");
const ticks = balls.map((b) => `<a class="tick ${b.cls}" style="left:${(b.t / DUR * 100).toFixed(1)}%" href="#c-${b.id}" title="${b.id} model ${b.verdict.runs}${b.verdict.wicket ? "+W" : ""}">${b.verdict.wicket ? "W" : b.verdict.runs}</a>`).join("\n");
const html = `<!DOCTYPE html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Match 2 dashboard — model-proposed, human-corrected</title><style>
body{background:#0a0f0a;color:#e8f0e8;font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}
h1{font-size:24px}.sub{color:#8aa08a}.sub a{color:#7dff8a}
.tl{position:relative;height:56px;background:#111811;border:1px solid #223322;border-radius:10px;margin:16px 0}
.tick{position:absolute;top:8px;width:26px;height:26px;border-radius:50%;text-align:center;font-size:12px;line-height:26px;text-decoration:none;color:#061206;font-weight:800}
.six{background:#ffd75d}.w{background:#ff6b6b}.r{background:#7dff8a}.d{background:#3a4a3a;color:#cfe0cf}
.card{border:1px solid #223322;border-radius:10px;margin:10px 0;padding:10px;background:#111811}
.row{display:flex;gap:16px;margin:8px 0;flex-wrap:wrap}.ed{background:#0a0f0a;border:1px solid #7dff8a;border-radius:6px;padding:2px 8px;min-width:40px;display:inline-block}
.ed.wide{min-width:280px}.meta{font-size:12px;color:#8aa08a}
#exp{position:fixed;bottom:16px;right:16px;background:#7dff8a;color:#061206;font-weight:800;border:0;border-radius:999px;padding:12px 24px;cursor:pointer}
</style></head><body>
<h1>Match 2 — model-proposed ${runs}/${wkts} (12 balls) · ${sixes} sixes · 1 wicket</h1>
<p class="sub">Daylight tape-ball, painted board for stumps, handheld camera · <a href="https://www.youtube.com/watch?v=zO2ztbJ3bI8" target="_blank">source footage (credited)</a><br>
<b>Disclosure:</b> these are unverified model verdicts. Human video labeling is in progress (<code>verdicts/match2-labels.csv</code>). Click any field to correct it — corrections export as ground-truth JSON. That loop is the product: AI calls it, humans confirm it, every match makes the next call better.</p>
<div class="tl">${ticks}</div>
${cards}
<button id="exp">Export corrections JSON</button>
<script>
document.getElementById('exp').onclick = () => {
  const out = [...document.querySelectorAll('.card')].map(c => {
    const o = {id: c.id.slice(2)};
    c.querySelectorAll('.ed').forEach(el => o[el.dataset.f] = el.innerText.trim());
    return o;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], {type: 'application/json'}));
  a.download = 'match2-corrections.json'; a.click();
};
</script></body></html>`;
writeFileSync("site/dashboard.html", html);
console.log("dashboard bytes:", html.length);
