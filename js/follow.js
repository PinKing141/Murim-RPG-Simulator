import { cap } from './rng.js';
import { ALIGN, REALMS, REALM_KR } from './data.js';
import { STATE, figById } from './state.js';
import { bloodGrudges } from './bloodlines.js';

export const FOLLOW = { kind: null, id: null };

export function setFollow(kind, id) {
  FOLLOW.kind = kind; FOLLOW.id = id;
  STATE.dirtyLog = true; STATE.dirtyPanels = true;
}

export function clearFollow() {
  FOLLOW.kind = null; FOLLOW.id = null;
  STATE.dirtyLog = true; STATE.dirtyPanels = true;
}

function stripHtml(h) {
  return h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function buildObituary(f) {
  const entries = STATE.log.filter(e => e.figs && e.figs.includes(f.id));
  const weight = { 'c-threat':6, 'c-death':6, 'c-rise':5, 'c-corrupt':4, 'c-found2':4, 'c-break':3, 'c-lineage':3, 'c-duel':2 };
  const seen = new Set(); const picks = [];
  for (const e of [...entries].sort((a,b) => (weight[b.cls]||1)-(weight[a.cls]||1))) {
    if (picks.length >= 5) break;
    if (!seen.has(e.cls) || picks.length < 2) { picks.push(e); seen.add(e.cls); }
  }
  picks.sort((a,b) => a.year - b.year || a.season - b.season);
  if (!picks.length) return `<div class="obit-empty">No record survives the ages.</div>`;
  return `<div class="obit">${picks.map(e =>
    `<div class="obit-line"><span class="obit-yr">Year ${e.year}</span>${stripHtml(e.html)}</div>`
  ).join('')}</div>`;
}

export function buildFigDossier(f) {
  const al = ALIGN[f.align];
  const named = f.byeolho && f.namedAt != null;
  const master = f.master ? figById(f.master) : null;
  const disciples = STATE.figures.filter(x => x.master === f.id);
  const brothers = (f.brothers || []).map(figById).filter(Boolean);
  const grudges  = (f.grudges  || []).map(figById).filter(Boolean);
  const spouse   = f.spouse ? figById(f.spouse) : null;
  const parents  = (f.parents || []).map(figById).filter(Boolean);
  const children = (f.children || []).map(figById).filter(Boolean);
  const bloodGrudgeIds = bloodGrudges(f);

  const flink = (fig) => {
    const n = fig.byeolho && fig.namedAt != null ? cap(fig.byeolho.en) : fig.name;
    return `<span class="dos-link" data-follow-fig="${fig.id}">${n}</span>`;
  };

  let h = `<div class="dossier" style="--c:${al.c}">`;

  // identity
  h += `<div class="dos-name">${named ? cap(f.byeolho.en) + `<span class="dos-kr"> · ${f.byeolho.kr}</span>` : f.name}</div>`;
  if (named) h += `<div class="dos-aka">${f.name}</div>`;
  h += `<div class="dos-badges">`;
  h += `<span class="dos-badge" style="border-color:${al.c};color:${al.c}">${al.kr} ${al.label}</span>`;
  h += `<span class="dos-badge ${f.alive ? 'dos-alive' : 'dos-dead'}">${f.alive ? '● Alive' : '✦ Deceased'}</span>`;
  if (f.isThreat) h += `<span class="dos-badge" style="border-color:var(--blood);color:var(--blood)">천마 Heavenly Demon</span>`;
  h += `</div>`;
  h += `<div class="dos-meta">`;
  h += `Born Year ${f.born} · Age ${f.age}`;
  if (!f.alive && f.diedYear) h += ` · Died Year ${f.diedYear} · lived ${f.diedYear - f.born} yr`;
  h += ` · Talent ${f.talent}`;
  h += `</div>`;

  // causal "why?" traces for the figure's defining turns
  const traces = [];
  if (f.ascendEvent != null) traces.push(`<button class="why-btn" data-chain="${f.ascendEvent}">⛓ Why the Heavenly Demon?</button>`);
  if (f.originEvent != null) traces.push(`<button class="why-btn" data-chain="${f.originEvent}">⛓ How they found their art</button>`);
  else if (f.fallEvent != null) traces.push(`<button class="why-btn" data-chain="${f.fallEvent}">⛓ Why they fell</button>`);
  if (traces.length) h += `<div class="dos-traces">${traces.join('')}</div>`;

  // cultivation timeline
  h += `<div class="dos-sec">Cultivation Path</div>`;
  h += `<div class="dos-timeline">`;
  if (f.realmHistory && f.realmHistory.length) {
    for (const r of f.realmHistory) {
      h += `<div class="dos-trow"><span class="dos-tyr">Y${r.year}</span><span class="dos-trealm">${REALMS[r.realm]} <span class="dos-tkr">${REALM_KR[r.realm]}</span></span></div>`;
    }
    if (f.alive) {
      const pct = Math.round(f.progress);
      const next = f.realm < REALMS.length - 1 ? REALMS[f.realm + 1] : null;
      h += `<div class="dos-trow dos-tcurrent"><span class="dos-tyr">now</span>`;
      h += `<span class="dos-trealm">${REALMS[f.realm]} <span class="dos-tkr">${REALM_KR[f.realm]}</span>`;
      if (next) h += ` <span class="dos-tprog">${pct}% → ${next}</span>`;
      h += `</span></div>`;
    }
  } else {
    h += `<div class="dos-empty">${REALMS[f.realm]} · ${REALM_KR[f.realm]}${f.alive ? ` · ${Math.round(f.progress)}% to next` : ''}</div>`;
  }
  h += `</div>`;

  // connections
  const hasConnections = f.art || f.sect || master || disciples.length || brothers.length || grudges.length || f.lineage;
  if (hasConnections) {
    h += `<div class="dos-sec">Connections</div>`;
    if (f.art) {
      h += `<div class="dos-conn"><span class="dos-role">Art</span><em class="art">${f.art.name} (${f.art.kr})</em> tier ${f.art.tier}</div>`;
    }
    if (f.sect) {
      h += `<div class="dos-conn"><span class="dos-role">Sect</span><span class="dos-link" data-follow-sect="${f.sect.id}">${f.sect.name} (${f.sect.kr})</span></div>`;
    }
    if (master) {
      h += `<div class="dos-conn"><span class="dos-role">Master</span>${flink(master)}</div>`;
    }
    if (disciples.length) {
      h += `<div class="dos-conn"><span class="dos-role">Disciples</span>${disciples.slice(0,4).map(flink).join(', ')}${disciples.length > 4 ? ` +${disciples.length-4}` : ''}</div>`;
    }
    if (brothers.length) {
      h += `<div class="dos-conn"><span class="dos-role">Brothers</span>${brothers.map(flink).join(', ')}</div>`;
    }
    if (grudges.length) {
      h += `<div class="dos-conn"><span class="dos-role">Grudges</span>${grudges.map(flink).join(', ')}</div>`;
    }
    if (f.lineage) {
      const inner = f.lineageId != null
        ? `<span class="dos-link" data-follow-fig="${f.lineageId}">${f.lineage}</span>`
        : f.lineage;
      h += `<div class="dos-conn"><span class="dos-role">Lineage</span>${inner}</div>`;
    }
  }

  // family
  const hasFam = spouse || parents.length || children.length;
  if (hasFam) {
    h += `<div class="dos-sec">Family</div>`;
    if (parents.length) {
      h += `<div class="dos-conn"><span class="dos-role">Parents</span>${parents.map(flink).join(' · ')}</div>`;
    }
    if (spouse) {
      h += `<div class="dos-conn"><span class="dos-role">Spouse</span>${flink(spouse)}</div>`;
    }
    if (children.length) {
      const taintChild = (c) => {
        const t = c.bloodlineTaint >= 80 ? ' ☯' : c.bloodlineTaint >= 40 ? ' ·' : '';
        const n = c.byeolho && c.namedAt != null ? cap(c.byeolho.en) : c.name;
        return `<span class="dos-link" data-follow-fig="${c.id}">${n}${t}</span>`;
      };
      h += `<div class="dos-conn"><span class="dos-role">Children</span>${children.slice(0, 6).map(taintChild).join(', ')}${children.length > 6 ? ` +${children.length - 6}` : ''}</div>`;
    }
    if (f.bloodlineTaint >= 30) {
      const lvl = f.bloodlineTaint >= 80 ? 'high' : f.bloodlineTaint >= 50 ? 'mid' : 'low';
      h += `<div class="dos-conn taint-${lvl}"><span class="dos-role">Taint</span>Bloodline taint ${f.bloodlineTaint} — the old power stirs within the blood</div>`;
    }
    if (f.awakened) {
      h += `<div class="dos-conn taint-high"><span class="dos-role">Awakened</span>The dormant power of the Heavenly Demon has erupted</div>`;
    }
  }

  // bloodline tree button
  if (parents.length || children.length || f.children?.length) {
    h += `<button class="why-btn tree-btn" data-open-tree="${f.id}">🌳 View Bloodline Tree</button>`;
  }

  // blood grudges callout
  if (bloodGrudgeIds.length) {
    const targets = bloodGrudgeIds.map(tid => {
      const t = figById(tid);
      return t ? flink(t) : '(unknown)';
    });
    h += `<div class="dos-sec">Blood Debt</div>`;
    h += `<div class="dos-conn taint-high"><span class="dos-role">Vendetta</span>${targets.join(', ')}</div>`;
  }

  // obituary for dead figures
  if (!f.alive) {
    h += `<div class="dos-sec">Chronicle of a Life</div>`;
    h += buildObituary(f);
  }

  h += `</div>`;
  return h;
}

export function buildBlocDossier(b) {
  const al = ALIGN[b.align];
  const leader = b.leaderId != null ? figById(b.leaderId) : null;
  const title = b.type === "alliance" ? "맹주 (Alliance Leader)" : "교주 (Cult Master)";
  const flink = (f) => {
    const n = f.byeolho && f.namedAt != null ? cap(f.byeolho.en) : f.name;
    return `<span class="dos-link" data-follow-fig="${f.id}">${n}</span>`;
  };
  const sects = b.memberSects
    .map(sid => STATE.sects.find(s => s.id === sid))
    .filter(s => s && s.alive);

  let h = `<div class="dossier" style="--c:${al.c}">`;
  h += `<div class="dos-name">${b.kr}<span class="dos-kr"> · ${b.name}</span></div>`;
  h += `<div class="dos-badges">`;
  h += `<span class="dos-badge" style="border-color:${al.c};color:${al.c}">${b.type === "alliance" ? "正 Righteous Bloc" : "魔 Demonic Bloc"}</span>`;
  h += `<span class="dos-badge ${b.alive ? 'dos-alive' : 'dos-dead'}">${b.alive ? '● Standing' : '✦ Dissolved'}</span>`;
  if (b.threatLed) h += `<span class="dos-badge" style="border-color:var(--blood);color:var(--blood)">천마 Demon-Led</span>`;
  h += `</div>`;
  h += `<div class="dos-meta">Forged Year ${b.founded}${!b.alive && b.dissolvedYear ? ` · Dissolved Year ${b.dissolvedYear}` : ''} · ${b.memberSects.length} member sects (peak ${b.peakMembers})</div>`;
  if (b.alive) {
    h += `<div class="dos-conn"><span class="dos-role">Cohesion</span>${Math.round(b.cohesion)} / 100${b.cohesion < 35 ? ' — the bonds are fraying' : ''}</div>`;
  }
  if (leader) {
    h += `<div class="dos-conn"><span class="dos-role">${title}</span>${flink(leader)}</div>`;
  }

  // causal traces
  const traces = [];
  if (b.formEvent != null) traces.push(`<button class="why-btn" data-chain="${b.formEvent}">⛓ Why it formed</button>`);
  if (b.wonEvent != null) traces.push(`<button class="why-btn" data-chain="${b.wonEvent}">⛓ Its victory</button>`);
  if (b.dissolveEvent != null) traces.push(`<button class="why-btn" data-chain="${b.dissolveEvent}">⛓ Why it ${b.type === "alliance" ? "fractured" : "fell"}</button>`);
  if (traces.length) h += `<div class="dos-traces">${traces.join('')}</div>`;

  // member sects
  if (sects.length) {
    h += `<div class="dos-sec">Member Houses</div>`;
    h += `<div class="dos-timeline">`;
    const sorted = [...sects].sort((a, c) => c.prestige - a.prestige);
    for (const s of sorted.slice(0, 12)) {
      h += `<div class="dos-trow"><span class="dos-link" data-follow-sect="${s.id}">${s.kr} <span class="dos-tkr">${s.name}</span></span></div>`;
    }
    if (sorted.length > 12) h += `<div class="dos-empty">+${sorted.length - 12} more</div>`;
    h += `</div>`;
  } else if (!b.alive) {
    h += `<div class="dos-empty">Its banners are scattered to the wind.</div>`;
  }

  h += `</div>`;
  return h;
}

export function buildSectDossier(s) {
  const al = ALIGN[s.align];
  const living = s.members.map(figById).filter(x => x && x.alive);
  const flink = (f) => {
    const n = f.byeolho && f.namedAt != null ? cap(f.byeolho.en) : f.name;
    return `<span class="dos-link" data-follow-fig="${f.id}">${n} <span class="dos-tkr">${REALM_KR[f.realm]}</span></span>`;
  };

  let h = `<div class="dossier" style="--c:${al.c}">`;
  h += `<div class="dos-name">${s.kr}<span class="dos-kr"> · ${s.name}</span></div>`;
  h += `<div class="dos-badges">`;
  h += `<span class="dos-badge" style="border-color:${al.c};color:${al.c}">${al.kr} ${al.label}</span>`;
  h += `<span class="dos-badge ${s.alive ? 'dos-alive' : 'dos-dead'}">${s.alive ? '● Active' : '✦ Dissolved'}</span>`;
  h += `</div>`;
  h += `<div class="dos-meta">Founded Year ${s.founded}${!s.alive && s.deadYear ? ` · Dissolved Year ${s.deadYear}` : ''} · ${s.region}</div>`;
  h += `<div class="dos-meta">Prestige ${Math.round(s.prestige)} · ${living.length} living disciples · ${s.allMembers.length} total</div>`;

  if (!s.alive && s.fallEvent != null) {
    h += `<button class="why-btn" data-chain="${s.fallEvent}">⛓ Why did this house fall?</button>`;
  }

  if (s.signatureArt) {
    h += `<div class="dos-conn" style="margin-top:8px"><span class="dos-role">Art</span><em class="art">${s.signatureArt.name} (${s.signatureArt.kr})</em></div>`;
  }

  if (living.length) {
    h += `<div class="dos-sec">Living Members</div>`;
    h += `<div class="dos-timeline">`;
    const sorted = [...living].sort((a,b) => b.power - a.power);
    for (const f of sorted.slice(0, 10)) {
      h += `<div class="dos-trow">${flink(f)}</div>`;
    }
    if (sorted.length > 10) h += `<div class="dos-empty">+${sorted.length-10} more</div>`;
    h += `</div>`;
  }

  h += `</div>`;
  return h;
}
