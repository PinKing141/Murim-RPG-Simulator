import { cap } from './rng.js';
import { ALIGN, REALMS, REALM_KR, DOCTRINES } from './data.js';
import { STATE, figById } from './state.js';
import { bloodlineRoot, childrenOf, genDistance, bloodGrudges } from './bloodlines.js';

/*
  The History Explorer. Clicking any figure answers four questions instantly:
    Blood   — what bloodline do they carry?      (family tree)
    Art     — what martial lineage do they carry? (master→disciple, art descent)
    Burdens — what do they owe or suffer?         (grudges, taint, curses)
    Legacy  — what did they leave behind?         (disciples, descendants, milestones)
  Two tree overlays — Bloodline mode and Lineage mode — make the difference between
  who someone is descended from and who they learned from legible.
*/

const MAX_GEN = 7;

function figLabel(f) {
  if (!f) return '?';
  return f.byeolho && f.namedAt != null ? cap(f.byeolho.en) : f.name;
}

/* ---------- shared node helpers ---------- */

function taintBadge(f) {
  if (!f.bloodlineTaint) return '';
  const lvl = f.bloodlineTaint >= 80 ? 'high' : f.bloodlineTaint >= 40 ? 'mid' : 'low';
  return `<span class="tree-taint tree-taint-${lvl}" title="Bloodline taint ${f.bloodlineTaint}">☯</span>`;
}
function realmTag(f) {
  const kr = REALM_KR[f.realm] || '';
  return kr ? `<span class="tree-realm">${kr}</span>` : '';
}

/* ---------- BLOOD tree ---------- */

function renderBloodNode(f, depth, rootId, focusId) {
  if (!f || depth > MAX_GEN) return '';
  const al = ALIGN[f.align];
  const isDemon = f.isThreat || f.bloodlineTaint >= 90;
  const children = childrenOf(f);

  let cls = 'tree-node';
  if (f.id === focusId) cls += ' tree-focus';
  if (f.id === rootId) cls += ' tree-root';
  if (isDemon) cls += ' tree-demon';
  if (f.awakened) cls += ' tree-awakened';
  if (!f.alive) cls += ' tree-dead';

  const artTag = f.art ? `<span class="tree-art" title="${f.art.name}">${f.art.kr}</span>` : '';
  let spouseTag = '';
  if (f.spouse) {
    const sp = figById(f.spouse);
    if (sp) spouseTag = `<span class="tree-spouse" data-explore="${sp.id}" title="${figLabel(sp)}">⚭ ${figLabel(sp)}</span>`;
  }

  const nodeHtml = `
<div class="${cls}" style="--nc:${al.c}" data-explore="${f.id}">
  <div class="tree-card">
    <span class="tree-name">${figLabel(f)}</span>
    ${taintBadge(f)}${realmTag(f)}${artTag}
    <span class="tree-dates">${f.born}${!f.alive && f.diedYear ? `–${f.diedYear}` : ''}</span>
  </div>
  ${spouseTag}
</div>`;

  if (!children.length) return nodeHtml;
  const childrenHtml = children.map(c => renderBloodNode(c, depth + 1, rootId, focusId)).join('');
  return `<div class="tree-branch">${nodeHtml}<div class="tree-children">${childrenHtml}</div></div>`;
}

/* ---------- LINEAGE tree (master → disciple) ---------- */

const disciplesOf = id => STATE.figures.filter(x => x.master === id);

/* climb the master chain to the founding teacher of this martial line */
function lineageRoot(f) {
  let cur = f, guard = 0;
  const seen = new Set();
  while (cur && cur.master != null && guard++ < 24) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    const m = figById(cur.master);
    if (!m) break;
    cur = m;
  }
  return cur;
}

function renderLineageNode(f, depth, rootId, focusId) {
  if (!f || depth > MAX_GEN) return '';
  const al = ALIGN[f.align];
  const kids = disciplesOf(f.id);

  let cls = 'tree-node';
  if (f.id === focusId) cls += ' tree-focus';
  if (f.id === rootId) cls += ' tree-root';
  if (!f.alive) cls += ' tree-dead';

  const artTag = f.art ? `<span class="tree-art" title="${f.art.name}">${f.art.kr}</span>` : '';
  const nodeHtml = `
<div class="${cls}" style="--nc:${al.c}" data-explore="${f.id}">
  <div class="tree-card">
    <span class="tree-name">${figLabel(f)}</span>
    ${realmTag(f)}${artTag}
    <span class="tree-dates">${f.born}${!f.alive && f.diedYear ? `–${f.diedYear}` : ''}</span>
  </div>
</div>`;

  if (!kids.length) return nodeHtml;
  const kidsHtml = kids.map(c => renderLineageNode(c, depth + 1, rootId, focusId)).join('');
  return `<div class="tree-branch">${nodeHtml}<div class="tree-children">${kidsHtml}</div></div>`;
}

/* ---------- the four-question detail header ---------- */

const yr = () => STATE.year;

/* feud strength bucket from a blood grudge's age */
function feudBand(age) {
  if (age < 10) return ['Fresh', 'feud-fresh'];
  if (age < 40) return ['Active', 'feud-active'];
  if (age < 80) return ['Ancient', 'feud-ancient'];
  return ['Generational', 'feud-old'];
}

/* gather the focus figure's significant chronicle moments */
function milestonesFor(f) {
  const out = [];
  const seen = new Set();
  const push = (eid, fallbackText) => {
    if (eid == null) return;
    const ev = STATE.eventIndex.get(eid);
    if (!ev || seen.has(ev.id)) return;
    seen.add(ev.id);
    out.push({ id: ev.id, year: ev.year, text: stripTags(ev.html) });
  };
  push(f.originEvent);
  push(f.ascendEvent);
  push(f.fallEvent);
  /* scan the log for other notable entries naming this figure */
  for (const ev of STATE.log) {
    if (seen.has(ev.id)) continue;
    if (!ev.figs || !ev.figs.includes(f.id)) continue;
    if (ev.level === 'epic' || ev.level === 'major' ||
        ['c-threat','c-found','c-faction','c-schism','c-relic','c-art-breakthrough','c-duel','c-vengeance'].includes(ev.cls)) {
      seen.add(ev.id);
      out.push({ id: ev.id, year: ev.year, text: stripTags(ev.html) });
    }
  }
  out.sort((a, b) => a.year - b.year);
  return out.slice(0, 8);
}

function stripTags(h) { return (h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
function shorten(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

/* the family-art thread: walk the art's variant chain from root to this art */
function artThread(art) {
  if (!art) return '';
  const chain = [];
  let cur = art, guard = 0;
  const seen = new Set();
  while (cur && guard++ < 16) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId != null ? STATE.arts.find(a => a.id === cur.parentId) : null;
  }
  if (!chain.length) return '';
  let h = `<div class="he-thread">`;
  chain.forEach((a, i) => {
    const al = ALIGN[a.align];
    const label = i === 0 ? 'Origin' : `Branch ${i}`;
    const dev = a.deviationScore || 0;
    const tags = [];
    if (a.isFragment) tags.push('fragment');
    if (a.isRestoration) tags.push('restored');
    if (a.cursed) tags.push('cursed');
    h += `<div class="he-thread-row ${a.id === art.id ? 'he-thread-cur' : ''}">`;
    h += `<span class="he-thread-gen">${label}</span>`;
    h += `<span class="he-thread-art">${a.name} <span class="he-kr">${a.kr}</span></span>`;
    h += `<span class="he-thread-align" style="color:${al.c}">${al.label}</span>`;
    if (dev >= 12) h += `<span class="he-thread-dev">deviation ${dev}</span>`;
    if (tags.length) h += `<span class="he-thread-tags">${tags.join(' · ')}</span>`;
    h += `</div>`;
  });
  h += `</div>`;
  return h;
}

/* branch vitality: how each top-level branch of a bloodline is faring */
function branchVitality(root) {
  const branches = childrenOf(root);
  if (!branches.length) return '';
  let h = `<div class="he-vitality">`;
  for (const b of branches) {
    /* count this branch's living descendants and their stature */
    let masters = 0, elders = 0, living = 0, taintMax = 0, demon = false;
    const stack = [b];
    const seen = new Set();
    while (stack.length) {
      const n = stack.pop();
      if (!n || seen.has(n.id)) continue;
      seen.add(n.id);
      if (n.alive) {
        living++;
        if (n.realm >= 6) masters++;
        else if (n.realm >= 3) elders++;
      }
      if (n.isThreat) demon = true;
      taintMax = Math.max(taintMax, n.bloodlineTaint || 0);
      for (const c of childrenOf(n)) stack.push(c);
    }
    let state = 'Thriving', cls = 'bv-thrive';
    if (living === 0) { state = 'Extinct'; cls = 'bv-dead'; }
    else if (demon || taintMax >= 70) { state = 'Corrupted'; cls = 'bv-corrupt'; }
    else if (masters === 0 && elders === 0) { state = 'Declining'; cls = 'bv-decline'; }
    else if (masters >= 2) { state = 'Ascendant'; cls = 'bv-thrive'; }
    h += `<div class="he-branch ${cls}" data-explore="${b.id}">`;
    h += `<span class="he-branch-name">${figLabel(b)}'s line</span>`;
    h += `<span class="he-branch-state">${state}</span>`;
    h += `<span class="he-branch-stat">${living} living · ${masters} master${masters===1?'':'s'} · ${elders} adept${elders===1?'':'s'}</span>`;
    h += `</div>`;
  }
  h += `</div>`;
  return h;
}

function buildDetail(f) {
  const al = ALIGN[f.align];
  const pers = DOCTRINES[f.personality];
  let h = `<div class="he-detail">`;

  /* identity strip */
  h += `<div class="he-id" style="--nc:${al.c}">`;
  h += `<div class="he-id-main"><span class="he-id-name">${figLabel(f)}</span>`;
  if (f.byeolho && f.namedAt != null) h += ` <span class="he-id-real">${f.name}</span>`;
  h += `</div>`;
  h += `<div class="he-id-sub">${al.label}${pers ? ` · ${pers.label}` : ''} · ${REALMS[f.realm]} (${REALM_KR[f.realm]}) · ${f.born}${!f.alive && f.diedYear ? `–${f.diedYear}` : ' (living)'}${f.isThreat ? ' · <span class="he-demon">Heavenly Demon</span>' : ''}</div>`;
  h += `</div>`;

  h += `<div class="he-quads">`;

  /* ---- BLOOD ---- */
  h += `<div class="he-quad"><div class="he-quad-t">Blood</div>`;
  const parents = (f.parents || []).map(figById).filter(Boolean);
  const kids = (f.children || []).map(figById).filter(Boolean);
  if (parents.length) h += `<div class="he-line">Born of ${parents.map(p => `<a data-explore="${p.id}">${figLabel(p)}</a>`).join(' & ')}</div>`;
  h += `<div class="he-line">Generation ${f.gen}${f.clan ? ` · House ${f.clan}` : ''}</div>`;
  if (kids.length) {
    const alive = kids.filter(k => k.alive).length;
    h += `<div class="he-line">${kids.length} child${kids.length===1?'':'ren'} (${alive} living)</div>`;
  } else h += `<div class="he-line he-dim">No recorded descendants</div>`;
  h += `</div>`;

  /* ---- ART ---- */
  h += `<div class="he-quad"><div class="he-quad-t">Art</div>`;
  if (f.art) {
    h += `<div class="he-line">Carries <em class="art">${f.art.name} (${f.art.kr})</em></div>`;
    if (f.master != null) { const m = figById(f.master); if (m) h += `<div class="he-line">Learned from <a data-explore="${m.id}">${figLabel(m)}</a></div>`; }
    const disc = disciplesOf(f.id);
    if (disc.length) h += `<div class="he-line">Taught ${disc.length} disciple${disc.length===1?'':'s'}</div>`;
  } else h += `<div class="he-line he-dim">Carries no formal art</div>`;
  if (f.lineage) h += `<div class="he-line he-dim">Of ${f.lineage}</div>`;
  h += `</div>`;

  /* ---- BURDENS ---- */
  h += `<div class="he-quad"><div class="he-quad-t">Burdens</div>`;
  if (f.bloodlineTaint) {
    const src = f.taintSource != null ? figById(f.taintSource) : null;
    h += `<div class="he-line">Bloodline taint ${taintBar(f.bloodlineTaint)}`;
    if (src && src.id === f.id) h += ` <span class="he-dim">— the wellspring of the line's taint</span>`;
    else if (src) h += ` <span class="he-dim">from <a data-explore="${src.id}">${figLabel(src)}</a></span>`;
    h += `</div>`;
  }
  const blood = bloodGrudges(f);
  if (blood.length) h += `<div class="he-line he-blood">${blood.length} blood debt${blood.length===1?'':'s'} carried</div>`;
  const ordinary = (f.grudges || []).filter(t => !(f.grudgeMeta[t] && f.grudgeMeta[t].blood));
  if (ordinary.length) h += `<div class="he-line">${ordinary.length} unsettled grudge${ordinary.length===1?'':'s'}</div>`;
  if (!f.bloodlineTaint && !blood.length && !ordinary.length) h += `<div class="he-line he-dim">Carries no debts</div>`;
  h += `</div>`;

  /* ---- LEGACY ---- */
  h += `<div class="he-quad"><div class="he-quad-t">Legacy</div>`;
  if (f.byeolho && f.namedAt != null) h += `<div class="he-line">Known as <span class="nm">${cap(f.byeolho.en)} (${f.byeolho.kr})</span></div>`;
  h += `<div class="he-line">Fame ${Math.round(f.fame)} · ${REALMS[f.realm]}</div>`;
  if (f.sect) h += `<div class="he-line">Of <a data-follow-sect="${f.sect.id}">${f.sect.name} (${f.sect.kr})</a></div>`;
  const slain = STATE.figures.filter(x => x.killedBy === f.id).length;
  if (slain) h += `<div class="he-line he-blood">Slew ${slain} of note</div>`;
  h += `</div>`;

  h += `</div>`; // he-quads

  /* ---- feuds (blood grudges as historical institutions) ---- */
  if (blood.length) {
    h += `<div class="he-section"><div class="he-section-t">Feuds & Vendettas</div>`;
    for (const tid of blood.slice(0, 6)) {
      const target = figById(tid);
      const meta = f.grudgeMeta[tid] || {};
      const age = meta.born != null ? yr() - meta.born : null;
      const [band, bcls] = age != null ? feudBand(age) : ['', ''];
      const originEid = meta.event != null ? meta.event : f.grudgeCause[tid];
      h += `<div class="he-feud ${bcls}">`;
      h += `<span class="he-feud-target">against ${target ? `<a data-explore="${target.id}">${figLabel(target)}</a>` : 'a fallen enemy'}${target && !target.alive ? ' <span class="he-dim">(slain)</span>' : ''}</span>`;
      if (age != null) h += `<span class="he-feud-age">${band} · ${age}y unresolved</span>`;
      if (originEid != null) h += `<button class="he-jump" data-chain="${originEid}">⛓ origin</button>`;
      h += `</div>`;
    }
    h += `</div>`;
  }

  /* ---- art thread ---- */
  if (f.art && (f.art.parentId != null || (f.art.commentaries && f.art.commentaries.length))) {
    h += `<div class="he-section"><div class="he-section-t">Martial Lineage of the Art</div>`;
    h += artThread(f.art);
    h += `</div>`;
  }

  /* ---- milestones ---- */
  const ms = milestonesFor(f);
  if (ms.length) {
    h += `<div class="he-section"><div class="he-section-t">Significant Events</div>`;
    for (const m of ms) {
      h += `<div class="he-ms" data-chain="${m.id}"><span class="he-ms-yr">Year ${m.year}</span> ${shorten(m.text, 96)}</div>`;
    }
    h += `</div>`;
  }

  return h + `</div>`;
}

function taintBar(t) {
  const blocks = Math.round((t / 100) * 10);
  return `<span class="he-taintbar" title="${t}/100">${'█'.repeat(blocks)}${'░'.repeat(10 - blocks)}</span>`;
}

/* ---------- entry point ---------- */

export function buildTreeView(figId, mode = 'blood') {
  const f = figById(figId);
  if (!f) return '<div class="tree-empty">Figure not found.</div>';

  const isLineage = mode === 'lineage';
  const root = isLineage ? lineageRoot(f) : bloodlineRoot(f);
  const dist = isLineage ? 0 : genDistance(f, root.id);

  let h = `<div class="he-modebar">`;
  h += `<button class="he-mode ${!isLineage ? 'on' : ''}" data-mode="blood" data-fig="${f.id}">⚮ Bloodline</button>`;
  h += `<button class="he-mode ${isLineage ? 'on' : ''}" data-mode="lineage" data-fig="${f.id}">⚔ Martial Lineage</button>`;
  h += `</div>`;

  /* the four-question detail for the focused figure */
  h += buildDetail(f);

  /* the tree */
  h += `<div class="tree-header">`;
  if (isLineage) {
    h += `<div class="tree-title">Martial Lineage of ${figLabel(root)}</div>`;
    h += `<div class="tree-subtitle">Master → disciple, the art's true bloodline</div>`;
  } else {
    h += `<div class="tree-title">Bloodline of ${figLabel(root)}</div>`;
    if (dist > 0) h += `<div class="tree-subtitle">${figLabel(f)} · ${dist} generation${dist !== 1 ? 's' : ''} removed</div>`;
  }
  h += `</div>`;

  /* branch vitality (blood mode only — dynastic rise and fall) */
  if (!isLineage) {
    const bv = branchVitality(root);
    if (bv) h += `<div class="he-section"><div class="he-section-t">Branch Vitality</div>${bv}</div>`;
  }

  const body = isLineage
    ? renderLineageNode(root, 0, root.id, f.id)
    : renderBloodNode(root, 0, root.id, f.id);
  h += `<div class="tree-wrap">${body}</div>`;

  return h;
}
