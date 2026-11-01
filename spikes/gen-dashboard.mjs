// Dashboard generator: single-file HTML, stills inlined as base64 (never committed),
// contenteditable annotation fields + export-corrections button.
import { readFileSync, writeFileSync } from "node:fs";
const log = JSON.parse(readFileSync("/tmp/m2clips/match2.json", "utf8"));
const DUR = 560.6;
let runs = 0, wkts = 0;
const balls = log.map((e, i) => {
  runs += e.verdict.runs; wkts += e.verdict.wicket ? 1 : 0;
  const img = readFileSync(`/tmp/m2clips/${e.id}.jpg`).toString("base64");
  const cls = e.verdict.wicket ? "w" : e.verdict.runs === 6 ? "six" : e.verdict.runs > 0 ? "r" : "d";
  return { ...e, img, cls, cum: `${runs}/${wkts}`, n: i + 1, yt: `https://www.youtube.com/watch?v=zO2ztbJ3bI8&t=${Math.floor(e.t)}s` };
});
const sixes = balls.filter((b) => b.verdict.runs === 6).length;
const cards = balls.map((b) => `
<details class="card ${b.cls}" id="c-${b.id}" open>
<summary><b>#${b.n} ${b.id}</b> · t=${b.t}s · <span class="v" data-f="runs">${b.verdict.runs}${b.verdict.wicket ? "+W" : ""}</span> · cum ${b.cum} · <a href="${b.yt}" target="_blank">▶ watch</a></summary>
<img src="data:image/jpeg;base64,${b.img}">
<div class="row"><label>decision <span class="ed" contenteditable data-f="decision">${b.verdict.decision}</span></label>
<label>runs <span class="ed" contenteditable data-f="runsN">${b.verdict.runs}</span></label>
<label>wicket <span class="ed" contenteditable data-f="wicket">${b.verdict.wicket}</span></label></div>
<div class="row"><label>note <span class="ed wide" contenteditable data-f="one_line">${b.verdict.one_line}</span></label></div>
<div class="meta">board-stumps boxes: ${b.board_boxes} · ${b.t}s</div>
</details>`).join("\n");
const ticks = balls.map((b) => `<a class="tick ${b.cls}" style="left:${(b.t / DUR * 100).toFixed(1)}%" href="#c-${b.id}" title="${b.id} ${b.verdict.runs}${b.verdict.wicket ? "+W" : ""}">${b.verdict.wicket ? "W" : b.verdict.runs}</a>`).join("\n");
const html = `<!DOCTYPE html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Match2 annotation dashboard — 30/1</title><style>
body{background:#0a0f0a;color:#e8f0e8;font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px}
h1{font-size:24px}.sub{color:#8aa08a}.tl{position:relative;height:56px;background:#111811;border:1px solid #223322;border-radius:10px;margin:16px 0}
.tick{position:absolute;top:8px;width:26px;height:26px;border-radius:50%;text-align:center;font-size:12px;line-height:26px;text-decoration:none;color:#061206;font-weight:800}
.six{background:#ffd75d}.w{background:#ff6b6b}.r{background:#7dff8a}.d{background:#3a4a3a;color:#cfe0cf}
.card{border:1px solid #223322;border-radius:10px;margin:10px 0;padding:10px;background:#111811}
.card summary{cursor:pointer}.card img{width:100%;border-radius:6px;margin:8px 0}
.row{display:flex;gap:16px;margin:6px 0;flex-wrap:wrap}.ed{background:#0a0f0a;border:1px solid #7dff8a;border-radius:6px;padding:2px 8px;min-width:40px;display:inline-block}
.ed.wide{min-width:300px}.meta{font-size:12px;color:#8aa08a}
#exp{position:fixed;bottom:16px;right:16px;background:#7dff8a;color:#061206;font-weight:800;border:0;border-radius:999px;padding:12px 24px;cursor:pointer}
</style></head><body>
<h1>Match 2 — 30/1 (12 balls) · ${sixes} sixes · 1 wicket</h1>
<p class="sub">Daylight tape-ball, board-stumps, handheld cam · <a href="https://www.youtube.com/watch?v=zO2ztbJ3bI8" target="_blank" style="color:#7dff8a">source (credited)</a> · signboard surrogate tracked 9/12 · click any field to correct, Export saves JSON</p>
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
writeFileSync("/tmp/m2clips/dashboard.html", html);
console.log("dashboard bytes:", html.length);
