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
const label = (b) => b.verdict.wicket ? "Wicket" : b.verdict.runs === 6 ? "Six" : b.verdict.runs > 0 ? `${b.verdict.runs} run${b.verdict.runs === 1 ? "" : "s"}` : "Dot";
const cards = balls.map((b) => `
<article class="card ${b.cls}" id="c-${b.id}">
<div class="head"><span class="badge ${b.cls}">${label(b)}</span><b>#${b.n} ${b.id}</b><span class="head-meta">t=${b.t}s · model: ${b.verdict.runs}${b.verdict.wicket ? "+W" : ""} · model cum ${b.cum}</span><a href="${b.yt}" target="_blank" rel="noopener">▶ watch this ball</a></div>
<div class="row"><label>decision <span class="ed" contenteditable spellcheck="false" data-f="decision">${b.verdict.decision}</span></label>
<label>runs <span class="ed" contenteditable spellcheck="false" data-f="runs">${b.verdict.runs}</span></label>
<label>wicket <span class="ed" contenteditable spellcheck="false" data-f="wicket">${b.verdict.wicket}</span></label>
<label class="grow">note <span class="ed wide" contenteditable spellcheck="false" data-f="one_line">${b.verdict.one_line}</span></label></div>
<div class="meta">board-stumps boxes on contact still: ${b.board_boxes}/1 image · label status: see match2-labels.csv</div>
</article>`).join("\n");
const ticks = balls.map((b) => `<a class="tick ${b.cls}" style="left:${(b.t / DUR * 100).toFixed(1)}%" href="#c-${b.id}" title="${b.id} model ${b.verdict.runs}${b.verdict.wicket ? "+W" : ""}">${b.verdict.wicket ? "W" : b.verdict.runs}</a>`).join("\n");
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Match 2 dashboard — model-proposed, human-corrected</title><style>
:root{--bg:#070907;--panel:#0e130e;--panel-2:#111711;--line:#223322;--green:#7dff8a;--amber:#ffd75d;--red:#ff6b6b;--ink:#eef5ee;--dim:#9db09d;--radius:16px;--shadow:0 1px 2px rgba(0,0,0,.4),0 12px 32px -12px rgba(0,0,0,.55);--font:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);font-family:var(--font);line-height:1.6;-webkit-font-smoothing:antialiased;padding:32px 20px 96px}
::selection{background:rgba(125,255,138,.28)}
a{color:var(--green)}
a:focus-visible,.tick:focus-visible,#exp:focus-visible,.ed:focus-visible{outline:2px solid var(--green);outline-offset:2px}
main{max-width:960px;margin:0 auto}
header{position:relative;padding:12px 0 4px}
header::before{content:"";position:absolute;inset:-32px -40px auto;height:300px;pointer-events:none;background:radial-gradient(520px 240px at 30% 0%,rgba(125,255,138,.12),transparent 68%)}
header>*{position:relative}
.kicker{color:var(--amber);font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;margin-bottom:10px}
h1{font-size:clamp(28px,5vw,40px);line-height:1.12;letter-spacing:-.025em;font-weight:800}
h1 .score{color:var(--green)}
.sub{color:var(--dim);font-size:15px;max-width:760px;margin-top:14px}
.sub b{color:var(--ink)}
.sub code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:1px 6px;color:var(--dim)}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin:26px 0 6px}
.stat{background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--line);border-radius:12px;padding:14px 20px;text-align:center;min-width:118px;box-shadow:var(--shadow)}
.stat b{display:block;font-size:25px;line-height:1.15;color:var(--green);font-variant-numeric:tabular-nums}
.stat b.amber{color:var(--amber)}.stat b.red{color:var(--red)}
.stat span{font-size:11px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase}
h2{font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--green);margin:32px 0 4px}
.tl{position:relative;height:64px;background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--line);border-radius:14px;margin:14px 0 8px;box-shadow:var(--shadow)}
.tick{position:absolute;top:50%;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;text-align:center;font-size:12px;line-height:30px;text-decoration:none;color:#061206;font-weight:800;font-variant-numeric:tabular-nums;box-shadow:0 2px 8px rgba(0,0,0,.45);transition:transform .15s ease,box-shadow .15s ease}
.tick:hover{transform:translate(-50%,-50%) scale(1.18);box-shadow:0 4px 14px rgba(0,0,0,.5);z-index:2}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--dim);margin-bottom:6px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.six{background:var(--amber)}.w{background:var(--red)}.r{background:var(--green)}.d{background:#3a4a3a;color:#cfe0cf}
.card{border:1px solid var(--line);border-left:3px solid var(--line);border-radius:var(--radius);margin:12px 0;padding:18px 20px;background:linear-gradient(180deg,var(--panel-2),var(--panel));box-shadow:var(--shadow);scroll-margin-top:20px;transition:border-color .15s ease}
.card:hover{border-color:rgba(125,255,138,.4)}
.card.six{border-left-color:var(--amber)}.card.w{border-left-color:var(--red)}.card.r{border-left-color:var(--green)}
.card:target{border-color:var(--green)}
.head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px}
.head .head-meta{color:var(--dim);font-variant-numeric:tabular-nums}
.head a{margin-left:auto;font-weight:600;text-decoration:none;white-space:nowrap}
.head a:hover{text-decoration:underline}
.badge{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#061206;border-radius:999px;padding:3px 11px}
.badge.d{background:#3a4a3a;color:#cfe0cf}
.row{display:flex;gap:12px 20px;margin:14px 0 10px;flex-wrap:wrap}
.row label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);display:flex;flex-direction:column;gap:6px}
.row label.grow{flex:1 1 260px}
.ed{background:var(--bg);border:1px solid rgba(125,255,138,.4);border-radius:8px;padding:5px 10px;min-width:52px;display:inline-block;font-size:14px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink);transition:border-color .15s ease,background .15s ease}
.ed:hover{border-color:var(--green)}
.ed:focus{background:#0a120a;border-color:var(--green)}
.ed.wide{min-width:0;width:100%}
.meta{font-size:12px;color:var(--dim)}
#exp{position:fixed;bottom:20px;right:20px;background:var(--green);color:#061206;font:inherit;font-weight:700;font-size:15px;border:0;border-radius:999px;padding:13px 26px;cursor:pointer;box-shadow:0 12px 28px -8px rgba(125,255,138,.55);transition:transform .16s ease,box-shadow .16s ease}
#exp:hover{transform:translateY(-1px)}
#exp:active{transform:translateY(0)}
@media (max-width:640px){
  body{padding:24px 14px 96px}
  .stats{display:grid;grid-template-columns:repeat(2,1fr)}
  .stat{min-width:0}
  .head a{margin-left:0}
  #exp{left:14px;right:14px;width:calc(100% - 28px)}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{transition:none!important}}
</style></head><body><main>
<header>
<div class="kicker">Annotation dashboard · Match 2</div>
<h1>Match 2 — model-proposed <span class="score">${runs}/${wkts}</span> (${balls.length} balls)</h1>
<div class="stats">
<div class="stat"><b>${runs}/${wkts}</b><span>model score</span></div>
<div class="stat"><b>${balls.length}</b><span>balls called</span></div>
<div class="stat"><b class="amber">${sixes}</b><span>sixes</span></div>
<div class="stat"><b class="red">${wkts}</b><span>${wkts === 1 ? "wicket" : "wickets"}</span></div>
</div>
<p class="sub">Daylight tape-ball, painted board for stumps, handheld camera · <a href="https://www.youtube.com/watch?v=zO2ztbJ3bI8" target="_blank" rel="noopener">source footage (credited)</a><br>
<b>Disclosure:</b> these are unverified model verdicts — shown as model output, not as an accuracy claim. Click any field to correct it — corrections export as ground-truth JSON. That loop is the product: AI calls it, humans confirm it, every match makes the next call better.</p>
</header>
<h2>Ball-by-ball timeline</h2>
<div class="tl">${ticks}</div>
<div class="legend"><span><i class="six"></i>Six</span><span><i class="r"></i>Runs</span><span><i class="d"></i>Dot</span><span><i class="w"></i>Wicket</span></div>
${cards}
</main>
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
