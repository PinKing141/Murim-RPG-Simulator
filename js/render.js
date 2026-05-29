import { clamp, cap } from './rng.js';
import { ALIGN, REALMS, REALM_KR } from './data.js';
import { STATE, aliveFigs, aliveSects, figById } from './state.js';
import { sectMight, topMember } from './systems.js';

const $ = id => document.getElementById(id);
export let autoScroll = true;

export function setAutoScroll(v) { autoScroll = v; }

function bar(v, max, color) {
  return `<div class="mini"><i style="width:${clamp(v / max * 100, 0, 100)}%;background:${color}"></i></div>`;
}

export function renderLog() {
  if (!STATE.dirtyLog) return;
  STATE.dirtyLog = false;
  const box = $("chron");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const frag = document.createDocumentFragment();
  box.innerHTML = "";
  const entries = STATE.log.slice(-260);
  let lastYear = null;
  for (const e of entries) {
    if (e.year !== lastYear) {
      lastYear = e.year;
      const ym = document.createElement("div");
      ym.className = "yearmark";
      ym.innerHTML = `<span class="y">Year ${e.year}</span><span class="ystat">${aliveSects().length} sects · ${aliveFigs().length} martial artists${STATE.threatActive ? ` · <span style="color:var(--blood)">a Heavenly Demon walks</span>` : ""}</span>`;
      frag.appendChild(ym);
    }
    const d = document.createElement("div");
    d.className = `entry ${e.cls} ${e.level === "major" ? "major" : ""} ${e.level === "epic" ? "epic major" : ""}`;
    d.innerHTML = `<span class="txt"><span class="tag">${STATE.seasonNames[e.season]}</span>${e.html}</span>`;
    frag.appendChild(d);
  }
  box.appendChild(frag);
  if (autoScroll && atBottom) box.scrollTop = box.scrollHeight;
}

export function renderPanels() {
  if (!STATE.dirtyPanels) return;
  STATE.dirtyPanels = false;

  $("yr").textContent = STATE.year;
  $("season").textContent = STATE.seasonNames[STATE.season];
  $("alive").textContent = aliveFigs().length;

  $("s-fig").textContent = aliveFigs().length;
  $("s-war").textContent = STATE.activeWars.length;
  $("s-art").textContent = STATE.arts.filter(a => !a.lost && !a.dormant).length;
  $("s-lost").textContent = STATE.arts.filter(a => a.lost || a.dormant).length;

  const sl = $("sectlist");
  const sects = [...STATE.sects].sort((a, b) => (b.alive - a.alive) || (sectMight(b) - sectMight(a)));
  $("sectct").textContent = aliveSects().length;
  sl.innerHTML = "";
  for (const s of sects.slice(0, 16)) {
    const al = ALIGN[s.align];
    const living = s.members.map(figById).filter(x => x && x.alive);
    const lead = topMember(s);
    const div = document.createElement("div");
    div.className = "sect" + (s.alive ? "" : " dead");
    div.style.setProperty("--c", al.c);
    const leadName = lead ? (lead.byeolho && lead.namedAt != null ? cap(lead.byeolho.en) : lead.name) : "";
    div.innerHTML = `
      <div class="sect-head">
        <div class="sect-name">${s.kr}<span class="en">${s.name}</span></div>
        <div class="sect-tier">${al.kr}</div>
      </div>
      <div class="sect-meta">
        <span><b>${living.length}</b> disciples</span>
        <span>${s.region.replace("the ","").replace(/\s*\(.*\)/,"")}</span>
      </div>
      ${lead ? `<div class="sect-meta"><span>Head: <b>${leadName}</b> · ${REALM_KR[lead.realm]}</span></div>` : ""}
      <div class="pbar"><i style="width:${clamp(s.prestige,0,100)}%"></i></div>
    `;
    sl.appendChild(div);
  }

  const fl = $("figlist");
  const figs = aliveFigs().sort((a, b) => (b.isThreat - a.isThreat) || (b.power - a.power)).slice(0, 12);
  $("figct").textContent = aliveFigs().length;
  fl.innerHTML = "";
  for (const f of figs) {
    const al = ALIGN[f.align];
    const div = document.createElement("div");
    div.className = "figcard";
    div.style.setProperty("--c", al.c);
    const named = f.byeolho && f.namedAt != null;
    div.innerHTML = `
      <div class="fig-name">${named ? `<span class="fig-alias">${cap(f.byeolho.en)} · ${f.byeolho.kr}</span>` : f.name}</div>
      <div class="fig-sub">${named ? f.name + " · " : ""}${al.label}${f.isThreat ? ` · <span style="color:var(--blood)">천마 HEAVENLY DEMON</span>` : ""}${f.sect ? " · " + f.sect.name : " · wanderer"}</div>
      <span class="fig-realm">${REALMS[f.realm]} · ${REALM_KR[f.realm]}</span>
      <div class="fig-bars">
        <span>내공</span>${bar(f.power, 1100, al.c)}
        <span>명성</span>${bar(f.fame, 60, "var(--gold)")}
        <span>마기</span>${bar(f.alignmentDrift, 100, "var(--magyo)")}
      </div>
      ${f.art ? `<div class="fig-sub" style="margin-top:6px">${f.art.name} (${f.art.kr}) · tier ${f.art.tier}</div>` : ""}
    `;
    fl.appendChild(div);
  }
}
