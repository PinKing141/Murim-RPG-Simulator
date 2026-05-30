import { clamp, cap } from './rng.js';
import { ALIGN, REALMS, REALM_KR, DOCTRINES } from './data.js';
import { STATE, aliveFigs, aliveSects, figById } from './state.js';
import { sectMight, topMember } from './systems.js';
import { aliveBlocs, blocById, sectBloc, stanceLabel } from './factions.js';
import { FOLLOW, buildFigDossier, buildSectDossier, buildBlocDossier } from './follow.js';
import { loc } from './i18n.js';
import { vitals } from './metrics.js';
import { compressLog } from './eras.js';

/* how many recent years are always shown in full when era compression is on */
const FULL_WINDOW = 40;

const $ = id => document.getElementById(id);
export let autoScroll = true;
export function setAutoScroll(v) { autoScroll = v; }

function bar(v, max, color) {
  return `<div class="mini"><i style="width:${clamp(v/max*100,0,100)}%;background:${color}"></i></div>`;
}

/* strip HTML tags for plain-text snippets */
function plainText(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/* one-line "why" reason for a great-power sect */
function powerReason(s) {
  const b = sectBloc(s.id);
  if (s.patron) return "holds Imperial Court patronage";
  if (b) {
    const lead = b.leaderId != null ? figById(b.leaderId) : null;
    if (lead && lead.sect && lead.sect.id === s.id)
      return b.type === "alliance" ? "leads the Murim Alliance" : "commands the Demonic Cult";
  }
  if (s.legitimacy > 70) return "deepest claim to authority in the Murim";
  if (s.signatureArt && !s.signatureArt.lost && s.signatureArt.tier >= 5)
    return `sole master of ${s.signatureArt.name}`;
  if (s.prestige > 70 && s.atWarWith.length === 0) return "unbroken record of victories";
  return "dominant by sheer force of arms";
}

/* ---- log rendering ---- */

export function renderLog() {
  if (!STATE.dirtyLog) return;
  STATE.dirtyLog = false;
  const box = $("chron");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;

  const banner = $("follow-banner");

  /* determine filter */
  let entries;
  const setBanner = (text) => {
    banner.querySelector('.fb-text').innerHTML = loc(text);
    banner.style.display = 'flex';
  };

  if (FOLLOW.kind === 'fig') {
    const f = figById(FOLLOW.id);
    entries = STATE.log.filter(e => e.figs && e.figs.includes(FOLLOW.id));
    if (f) {
      const name = f.byeolho && f.namedAt != null ? cap(f.byeolho.en) : f.name;
      setBanner(`<span class="fb-label">Following</span> <span class="fb-name">${name}</span><span class="fb-dim"> · ${entries.length} entries</span>`);
    }
  } else if (FOLLOW.kind === 'sect') {
    const s = STATE.sects.find(x => x.id === FOLLOW.id);
    if (s) {
      const memberSet = new Set(s.allMembers);
      entries = STATE.log.filter(e =>
        (e.sects && e.sects.includes(FOLLOW.id)) ||
        (e.figs && e.figs.some(id => memberSet.has(id)))
      );
      setBanner(`<span class="fb-label">Following</span> <span class="fb-name">${s.name} (${s.kr})</span><span class="fb-dim"> · ${entries.length} entries</span>`);
    } else { entries = STATE.log.slice(-260); banner.style.display = 'none'; }
  } else if (FOLLOW.kind === 'bloc') {
    const b = blocById(FOLLOW.id);
    if (b) {
      const memberSet = new Set(b.memberSects);
      entries = STATE.log.filter(e =>
        (e.sects && e.sects.some(id => memberSet.has(id))) ||
        (b.leaderId != null && e.figs && e.figs.includes(b.leaderId)) ||
        e.id === b.formEvent || e.id === b.dissolveEvent || e.id === b.wonEvent
      );
      setBanner(`<span class="fb-label">Following</span> <span class="fb-name">${b.name} (${b.kr})</span><span class="fb-dim"> · ${entries.length} entries</span>`);
    } else { entries = STATE.log.slice(-260); banner.style.display = 'none'; }
  } else {
    entries = STATE.eraCompress ? STATE.log : STATE.log.slice(-260);
    banner.style.display = 'none';
  }

  const frag = document.createDocumentFragment();
  box.innerHTML = "";

  /* fold the deep past into era summaries when enabled and not following anything */
  let eraBlocks = [];
  if (STATE.eraCompress && FOLLOW.kind == null) {
    const cutoff = STATE.year - FULL_WINDOW;
    const { eras, rest } = compressLog(entries, cutoff);
    eraBlocks = eras;
    entries = rest;
    for (const er of eraBlocks) {
      const block = document.createElement("div");
      block.className = "era-block";
      const span = er.from === er.to ? `Year ${er.from}` : `Years ${er.from}–${er.to}`;
      let hl = '';
      if (er.highlights.length) {
        hl = `<div class="era-highlights">` + er.highlights.map(id =>
          `<button class="era-hl" data-eid="${id}">⛓ a defining moment</button>`).join('') + `</div>`;
      }
      block.innerHTML = loc(`
        <div class="era-title">${er.title} <span class="era-kr">${er.kr}</span></div>
        <div class="era-span">${span}</div>
        <div class="era-summary">${er.summary}</div>
        ${hl}`);
      frag.appendChild(block);
    }
  }

  let lastYear = null;
  for (const e of entries) {
    if (e.year !== lastYear) {
      lastYear = e.year;
      const ym = document.createElement("div");
      ym.className = "yearmark";
      ym.innerHTML = `<span class="y">Year ${e.year}</span><span class="ystat">${aliveSects().length} sects · ${aliveFigs().length} martial artists${STATE.threatActive ? ` · <span style="color:var(--blood)">a Heavenly Demon walks</span>` : ""}</span>`;
      frag.appendChild(ym);
    }
    const hasChain = (e.causes && e.causes.length) || (e.effects && e.effects.length);
    const d = document.createElement("div");
    d.className = `entry ${e.cls} ${e.level === "major" ? "major" : ""} ${e.level === "epic" ? "epic major" : ""}${hasChain ? " has-chain" : ""}`;
    d.dataset.eid = e.id;

    /* inline cause surfacing: show a brief trace for major/epic events */
    let causeHint = '';
    if (e.level !== 'normal' && e.causes && e.causes.length) {
      const causeEv = STATE.eventIndex.get(e.causes[0]);
      if (causeEv && causeEv.year !== e.year) {
        const snippet = plainText(loc(causeEv.html) || causeEv.html);
        const short = snippet.length > 72 ? snippet.slice(0, 72) + '…' : snippet;
        causeHint = `<div class="entry-cause" data-eid="${causeEv.id}">↳ Year ${causeEv.year} — <em>${short}</em></div>`;
      }
    }

    d.innerHTML = `<span class="txt"><span class="tag">${STATE.seasonNames[e.season]}</span>${loc(e.html)}${hasChain ? `<span class="chain-mark" title="Trace cause &amp; consequence">⛓</span>` : ""}</span>${causeHint}`;
    frag.appendChild(d);
  }
  box.appendChild(frag);
  if (autoScroll && atBottom) box.scrollTop = box.scrollHeight;
}

/* ---- panel rendering ---- */

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

  /* ---- vital signs: the shape of the age ---- */
  const v = vitals();
  const eb = $("erab");
  eb.textContent = STATE.showHangul ? `${v.era.label} · ${v.era.kr}` : v.era.label;
  eb.style.color = v.era.c;
  eb.style.borderColor = v.era.c;
  const vbar = (val, color) => `<div class="mini"><i style="width:${clamp(val,0,100)}%;background:${color}"></i></div>`;
  $("vitals").innerHTML = `
    <div class="vitals-title">Vital Signs of the Age</div>
    <div class="vrow"><span>Polarisation</span>${vbar(v.polarisation*100, "var(--magyo)")}<b>${Math.round(v.polarisation*100)}</b></div>
    <div class="vrow"><span>Legitimacy Gap</span>${vbar(v.legitimacySpread, "var(--sapa)")}<b>${Math.round(v.legitimacySpread)}</b></div>
    <div class="vrow"><span>Authority</span>${vbar(v.legitimacy, "var(--gold)")}<b>${Math.round(v.legitimacy)}</b></div>
    <div class="vrow"><span>Realm Health</span>${vbar(v.regionHealth, "var(--jeongpa)")}<b>${Math.round(v.regionHealth)}</b></div>`;

  /* ---- great powers readout ---- */
  const powersEl = $("powers-panel");
  if (powersEl) {
    const liveSects = aliveSects().filter(s => s.alive);
    const top = [...liveSects].sort((a, b) => sectMight(b) - sectMight(a)).slice(0, 3);
    if (top.length) {
      let html = `<div class="panel-title">Great Powers <span class="ct">${top.length}</span></div>`;
      for (const s of top) {
        const al = ALIGN[s.align];
        const lead = topMember(s);
        const lName = lead ? (lead.byeolho && lead.namedAt != null ? cap(lead.byeolho.en) : lead.name) : "—";
        const lRealm = lead ? (STATE.showHangul ? REALM_KR[lead.realm] : REALMS[lead.realm]) : "";
        const reason = powerReason(s);
        html += loc(`<div class="power-card" style="--c:${al.c}">
          <div class="power-name">${s.kr}<span class="en">${s.name}</span></div>
          <div class="power-head">${lName}${lRealm ? ' · ' + lRealm : ''}</div>
          <div class="power-reason">↳ ${reason}</div>
        </div>`);
      }
      powersEl.innerHTML = html;
    } else {
      powersEl.innerHTML = '';
    }
  }

  /* ---- left: power blocs ---- */
  const bl = $("bloclist");
  const blocs = aliveBlocs();
  bl.innerHTML = "";
  if (blocs.length) {
    bl.innerHTML = `<div class="panel-title">Powers of the Age</div>`;
    for (const b of blocs) {
      const al = ALIGN[b.align];
      const leader = b.leaderId != null ? figById(b.leaderId) : null;
      const ln = leader ? (leader.byeolho && leader.namedAt != null ? cap(leader.byeolho.en) : leader.name) : "—";
      const title = STATE.showHangul ? (b.type === "alliance" ? "맹주" : "교주")
                                     : (b.type === "alliance" ? "Leader" : "Master");
      const cohLabel = STATE.showHangul ? "결속" : "Cohesion";
      const isF = FOLLOW.kind === "bloc" && FOLLOW.id === b.id;
      const card = document.createElement("div");
      card.className = "bloc-card" + (isF ? " followed" : "");
      card.dataset.id = b.id;
      card.style.setProperty("--c", al.c);
      card.innerHTML = loc(`
        <div class="bloc-name">${b.kr}<span class="en">${b.name.replace(/^the /, "")}</span></div>
        <div class="bloc-meta"><span>${title}: <b>${ln}</b></span><span>${b.memberSects.length} sects</span></div>
        <div class="bloc-coh"><span>${cohLabel}</span><div class="mini"><i style="width:${clamp(b.cohesion,0,100)}%;background:${al.c}"></i></div></div>
      `);
      bl.appendChild(card);
    }
  }

  /* ---- left: sects ---- */
  const sl = $("sectlist");
  const sects = [...STATE.sects].sort((a,b) => (b.alive - a.alive) || (sectMight(b) - sectMight(a)));
  $("sectct").textContent = aliveSects().length;
  sl.innerHTML = "";
  for (const s of sects.slice(0, 16)) {
    const al = ALIGN[s.align];
    const living = s.members.map(figById).filter(x => x && x.alive);
    const lead = topMember(s);
    const div = document.createElement("div");
    const isFollowed = FOLLOW.kind === 'sect' && FOLLOW.id === s.id;
    div.className = "sect" + (s.alive ? "" : " dead") + (isFollowed ? " followed" : "");
    div.dataset.id = s.id;
    div.style.setProperty("--c", al.c);
    const leadName = lead ? (lead.byeolho && lead.namedAt != null ? cap(lead.byeolho.en) : lead.name) : "";
    const sb = s.alive ? sectBloc(s.id) : null;
    const tier = STATE.showHangul ? al.kr : al.label;
    const blocTag = sb ? (STATE.showHangul ? `${sb.type === "alliance" ? "盟" : "敎"} ${sb.kr}`
                                            : `${sb.type === "alliance" ? "盟" : "敎"} ${sb.name.replace(/^the /, "")}`) : "";
    div.innerHTML = loc(`
      <div class="sect-head">
        <div class="sect-name">${s.kr}<span class="en">${s.name}</span></div>
        <div class="sect-tier">${tier}</div>
      </div>
      <div class="sect-meta">
        <span><b>${living.length}</b> disciples</span>
        <span>${s.region.replace("the ","").replace(/\s*\(.*\)/,"")}</span>
      </div>
      ${lead ? `<div class="sect-meta"><span>Head: <b>${leadName}</b> · ${STATE.showHangul ? REALM_KR[lead.realm] : REALMS[lead.realm]}</span></div>` : ""}
      ${sb ? `<div class="sect-bloc" style="--bc:${ALIGN[sb.align].c}">${blocTag}</div>` : ""}
      ${s.alive && s.align === "unorthodox" ? `<div class="sect-stance">↔ ${stanceLabel(s.stance)}</div>` : ""}
      ${(() => {
        const fd = s.doctrine && DOCTRINES[s.doctrine];
        const headFig = s.headId ? figById(s.headId) : null;
        const hp = headFig && headFig.alive && headFig.personality ? DOCTRINES[headFig.personality] : null;
        let out = '';
        if (fd) out += `<div class="doctrine-badge" style="color:${fd.c};border-color:${fd.c}" title="Founding doctrine">${fd.label}</div>`;
        if (hp && hp !== fd) out += `<div class="doctrine-badge doctrine-badge-head" style="color:${hp.c};border-color:${hp.c}" title="Head personality">⚔ ${hp.label}</div>`;
        return out;
      })()}
      <div class="pbar"><i style="width:${clamp(s.prestige,0,100)}%"></i></div>
    `);
    sl.appendChild(div);
  }

  /* ---- right panel: dossier or figure list ---- */
  const dossierWrap = $("dossier-wrap");
  const figPanel    = $("fig-panel");

  if (FOLLOW.kind === 'fig') {
    const f = figById(FOLLOW.id);
    figPanel.style.display = 'none';
    dossierWrap.style.display = 'block';
    dossierWrap.innerHTML = f ? loc(buildFigDossier(f)) : '<div class="dos-empty">Figure not found.</div>';
  } else if (FOLLOW.kind === 'sect') {
    const s = STATE.sects.find(x => x.id === FOLLOW.id);
    figPanel.style.display = 'none';
    dossierWrap.style.display = 'block';
    dossierWrap.innerHTML = s ? loc(buildSectDossier(s)) : '<div class="dos-empty">Sect not found.</div>';
  } else if (FOLLOW.kind === 'bloc') {
    const b = blocById(FOLLOW.id);
    figPanel.style.display = 'none';
    dossierWrap.style.display = 'block';
    dossierWrap.innerHTML = b ? loc(buildBlocDossier(b)) : '<div class="dos-empty">Bloc not found.</div>';
  } else {
    figPanel.style.display = '';
    dossierWrap.style.display = 'none';

    const fl = $("figlist");
    const figs = aliveFigs().sort((a,b) => (b.isThreat - a.isThreat) || (b.power - a.power)).slice(0, 12);
    $("figct").textContent = aliveFigs().length;
    fl.innerHTML = "";
    for (const f of figs) {
      const al = ALIGN[f.align];
      const div = document.createElement("div");
      div.className = "figcard";
      div.dataset.id = f.id;
      div.style.setProperty("--c", al.c);
      const named = f.byeolho && f.namedAt != null;
      const lbl = STATE.showHangul
        ? { pw: "내공", fm: "명성", ki: "마기" }
        : { pw: "Power", fm: "Fame", ki: "Ki" };
      div.innerHTML = loc(`
        <div class="fig-name">${named ? `<span class="fig-alias">${cap(f.byeolho.en)} · ${f.byeolho.kr}</span>` : f.name}</div>
        <div class="fig-sub">${named ? f.name + " · " : ""}${al.label}${f.isThreat ? ` · <span style="color:var(--blood)">천마 HEAVENLY DEMON</span>` : ""}${f.sect ? " · " + f.sect.name : " · wanderer"}</div>
        <span class="fig-realm">${REALMS[f.realm]} · ${REALM_KR[f.realm]}</span>
        <div class="fig-bars">
          <span>${lbl.pw}</span>${bar(f.power, 1100, al.c)}
          <span>${lbl.fm}</span>${bar(f.fame, 60, "var(--gold)")}
          <span>${lbl.ki}</span>${bar(f.alignmentDrift, 100, "var(--magyo)")}
        </div>
        ${f.art ? `<div class="fig-sub" style="margin-top:6px">${f.art.name} (${f.art.kr}) · tier ${f.art.tier}</div>` : ""}
        ${(() => { const p = f.personality && DOCTRINES[f.personality]; return p ? `<div class="doctrine-badge doctrine-badge-fig" style="color:${p.c};border-color:${p.c}">${p.label}</div>` : ''; })()}
      `);
      fl.appendChild(div);
    }
  }
}
