import { cap, clamp } from './rng.js';
import { ALIGN, REALMS, REALM_KR, TERRAIN, DOCTRINES, artAffinity, artCorruptType, ART_PRINCIPLES, SUCCESSION_TRADITIONS, RECRUIT_BIAS } from './data.js';
import { STATE, figById, regionByName } from './state.js';
import { bloodGrudges } from './bloodlines.js';
import { stanceLabel } from './factions.js';
import { icon } from './icons.js';

export const FOLLOW = { kind: null, id: null };

export function setFollow(kind, id) {
  FOLLOW.kind = kind; FOLLOW.id = id;
  STATE.dirtyLog = true; STATE.dirtyPanels = true;
}

export function clearFollow() {
  FOLLOW.kind = null; FOLLOW.id = null;
  STATE.dirtyLog = true; STATE.dirtyPanels = true;
}

/* render the living-tradition panel for an art inside a dossier */
function buildArtTraditionBlock(a) {
  if (!a || !a.founderPrinciples || !a.currentInterpretation) return '';
  const dev = a.deviationScore || 0;
  const devColor = dev >= 55 ? "var(--blood)" : dev >= 30 ? "var(--sapa)" : "var(--ink-dim)";
  const parentArt = a.parentId ? STATE.arts.find(x => x.id === a.parentId) : null;
  let h = `<div class="art-tradition">`;
  /* header */
  h += `<div class="art-trad-hd">`;
  const tradTag = a.isRestoration ? 'Restored' : a.isFragment ? 'Fragment' : 'Living Tradition';
  const tradWarn = (a.isRestoration || a.isFragment)
    ? `<svg class="ico" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M8 2 L14 13 H2 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 6 V10 M8 11.5 V12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> `
    : '';
  h += `<span class="art-trad-label">${tradWarn}${tradTag}</span>`;
  h += ` <span class="art-trad-dev" style="color:${devColor}">Deviation ${dev}</span>`;
  if (parentArt) h += ` <span class="art-trad-parent">· Branch of <em class="art">${parentArt.name}</em></span>`;
  h += `</div>`;
  /* principle bars */
  h += `<div class="art-prin-grid">`;
  for (const k of ART_PRINCIPLES) {
    const cur = a.currentInterpretation[k] || 0;
    const fnd = a.founderPrinciples[k] || 0;
    const delta = cur - fnd;
    const isAggressive = k === "aggression" || k === "sacrifice";
    const fillColor = isAggressive ? "var(--blood)" : "var(--azure)";
    const deltaColor = Math.abs(delta) <= 5 ? "var(--ink-dim)"
                     : delta > 0 ? (isAggressive ? "var(--sapa)" : "var(--jade)")
                     : (isAggressive ? "var(--jade)" : "var(--sapa)");
    const dStr = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0';
    h += `<div class="ap-row">`;
    h += `<span class="ap-key">${k}</span>`;
    h += `<div class="ap-track">`;
    h += `<div class="ap-fill" style="width:${cur}%;background:${fillColor}"></div>`;
    h += `<div class="ap-founder-mark" style="left:${fnd}%"></div>`;
    h += `</div>`;
    h += `<span class="ap-delta" style="color:${deltaColor}">${dStr}</span>`;
    h += `</div>`;
  }
  h += `</div>`;
  /* recent commentaries */
  if (a.commentaries && a.commentaries.length) {
    h += `<div class="art-commentaries">`;
    for (const c of a.commentaries.slice(-3)) {
      h += `<div class="art-comment">`;
      h += `<span class="ac-meta">Year ${c.year} · ${c.authorName || 'Unknown'}</span>`;
      h += ` <em class="ac-text">"${c.text}"</em>`;
      h += `</div>`;
    }
    if (a.commentaries.length > 3) {
      h += `<div class="ac-meta" style="margin-top:3px">${a.commentaries.length - 3} older commentaries exist.</div>`;
    }
    h += `</div>`;
  }
  h += `</div>`;
  return h;
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
  h += `<span class="dos-badge ${f.alive ? 'dos-alive' : 'dos-dead'}">${f.alive ? icon('dotFilled') + '<span>Alive</span>' : icon('starBurst') + '<span>Deceased</span>'}</span>`;
  if (f.gender === "female") h += `<span class="dos-badge dos-gender-f">여 Female</span>`;
  if (f.legendaryTitle) h += `<span class="dos-badge dos-leg-title" style="border-color:var(--gold);color:var(--gold)">${f.legendaryTitle.en} · ${f.legendaryTitle.kr}</span>`;
  else if (f.isThreat) h += `<span class="dos-badge" style="border-color:var(--blood);color:var(--blood)">천마 Heavenly Demon</span>`;
  h += `</div>`;
  h += `<div class="dos-meta">`;
  h += `Born Year ${f.born} · Age ${f.age}`;
  if (!f.alive && f.diedYear) h += ` · Died Year ${f.diedYear} · lived ${f.diedYear - f.born} yr`;
  h += ` · Talent ${f.talent} · Charisma ${f.charisma}`;
  h += `</div>`;

  // causal "why?" traces for the figure's defining turns.
  // originEvent on a figure is only ever set when they recover a lost art (systems.js
  // line ~724), so we phrase it that way rather than the more generic "found their art"
  // which misled readers about figures who learned an art the normal way.
  const traces = [];
  if (f.ascendEvent != null) traces.push(`<button class="why-btn" data-chain="${f.ascendEvent}">${icon('chain')} <span>Why the Heavenly Demon?</span></button>`);
  if (f.originEvent != null) traces.push(`<button class="why-btn" data-chain="${f.originEvent}">${icon('chain')} <span>How they recovered the lost art</span></button>`);
  if (f.fallEvent != null) traces.push(`<button class="why-btn" data-chain="${f.fallEvent}">${icon('chain')} <span>Why they fell</span></button>`);
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
      const aff = artAffinity(f, f.art);
      const ct  = artCorruptType(f.art);
      const affLabel = aff === "natural" ? `${icon('arrowUp')} Natural affinity` : aff === "resistant" ? `${icon('arrowDown')} Resists this art` : "Neutral";
      const corrLabel = ct === "always" ? " · Inherently corruptive" : ct === "conditional" ? " · Corruptive to the resistant" : "";
      const affColor = aff === "natural" ? "var(--jade)" : aff === "resistant" ? "var(--blood)" : "var(--ink-dim)";
      const polLabel = f.art.polarity && f.art.polarity !== "balanced"
        ? ` · Polarity: ${f.art.polarity.charAt(0).toUpperCase() + f.art.polarity.slice(1)}` : "";
      h += `<div class="dos-conn"><span class="dos-role">Art</span><em class="art">${f.art.name} (${f.art.kr})</em> tier ${f.art.tier}`;
      h += ` <span style="font-size:11px;color:${affColor}">${affLabel}${corrLabel}${polLabel}${f.art.cursed ? ' · <span style="color:var(--blood)">CURSED</span>' : ''}</span></div>`;
      /* living tradition: principles, deviation, commentaries */
      h += buildArtTraditionBlock(f.art);
    }
    const heldRelics = STATE.relics.filter(r => !r.lost && r.holderId === f.id);
    for (const r of heldRelics) {
      h += `<div class="dos-conn"><span class="dos-role">Relic</span><span class="rn" style="color:#e0b850">${r.name} (${r.kr})</span>`;
      if (r.history.length > 1) h += ` <span style="font-size:11px;color:var(--ink-faint)">· ${r.history.length} hands across the ages</span>`;
      h += `</div>`;
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
      /* "brothers" array holds all sworn siblings regardless of gender */
      const sibLabel = brothers.every(s => s.gender === "female") ? "Sisters"
        : brothers.every(s => s.gender === "male") ? "Brothers" : "Sworn Siblings";
      h += `<div class="dos-conn"><span class="dos-role">${sibLabel}</span>${brothers.map(flink).join(', ')}</div>`;
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
    if (f.betrothed) {
      const betrothed = figById(f.betrothed);
      if (betrothed) h += `<div class="dos-conn"><span class="dos-role">Betrothed</span>${flink(betrothed)}</div>`;
    }
    if (children.length) {
      const taintChild = (c) => {
        const t = c.bloodlineTaint >= 80 ? ' ' + icon('taegeuk', { cls: 'dos-taint-mark' }) : c.bloodlineTaint >= 40 ? ' ·' : '';
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

  // history explorer — blood, art, burdens, legacy
  h += `<button class="why-btn tree-btn" data-open-tree="${f.id}">${icon('scroll')} <span>Explore Their History</span></button>`;

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
  h += `<span class="dos-badge ${b.alive ? 'dos-alive' : 'dos-dead'}">${b.alive ? icon('dotFilled') + '<span>Standing</span>' : icon('starBurst') + '<span>Dissolved</span>'}</span>`;
  if (b.threatLed) h += `<span class="dos-badge" style="border-color:var(--blood);color:var(--blood)">천마 Demon-Led</span>`;
  h += `</div>`;
  h += `<div class="dos-meta">Forged Year ${b.founded}${!b.alive && b.dissolvedYear ? ` · Dissolved Year ${b.dissolvedYear}` : ''} · ${b.memberSects.length} member sects (peak ${b.peakMembers})</div>`;
  if (b.alive) {
    h += `<div class="dos-conn"><span class="dos-role">Cohesion</span>${Math.round(b.cohesion)} / 100${b.cohesion < 35 ? ' — the bonds are fraying' : ''}</div>`;
    h += `<div class="dos-conn"><span class="dos-role">Legitimacy</span>${Math.round(b.legitimacy)} / 100${b.legitimacy < 35 ? ' — its right to lead is questioned' : ''}</div>`;
  }
  if (leader) {
    h += `<div class="dos-conn"><span class="dos-role">${title}</span>${flink(leader)}</div>`;
  }

  // causal traces
  const traces = [];
  if (b.formEvent != null) traces.push(`<button class="why-btn" data-chain="${b.formEvent}">${icon('chain')} <span>Why it formed</span></button>`);
  if (b.wonEvent != null) traces.push(`<button class="why-btn" data-chain="${b.wonEvent}">${icon('chain')} <span>Its victory</span></button>`);
  if (b.dissolveEvent != null) traces.push(`<button class="why-btn" data-chain="${b.dissolveEvent}">${icon('chain')} <span>Why it ${b.type === "alliance" ? "fractured" : "fell"}</span></button>`);
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
  h += `<span class="dos-badge ${s.alive ? 'dos-alive' : 'dos-dead'}">${s.alive ? icon('dotFilled') + '<span>Active</span>' : icon('starBurst') + '<span>Dissolved</span>'}</span>`;
  h += `</div>`;
  const reg = regionByName(s.region);
  const doc = s.doctrine ? DOCTRINES[s.doctrine] : null;
  const head = s.headId ? figById(s.headId) : null;
  const headPers = (head && head.alive && head.personality) ? DOCTRINES[head.personality] : null;
  if (doc) {
    h += `<div class="dos-doctrine" style="--dc:${doc.c}">`;
    h += `<span class="doctrine-label">Founding Doctrine</span>`;
    h += `<span class="doctrine-name" style="color:${doc.c}">${doc.label} <span class="dos-kr">${doc.kr}</span></span>`;
    h += `<span class="doctrine-tagline">${doc.tagline}</span>`;
    h += `</div>`;
  }
  if (headPers) {
    const clash = headPers !== doc;
    h += `<div class="dos-doctrine dos-head-pers${clash ? ' dos-tension' : ''}" style="--dc:${headPers.c}">`;
    h += `<span class="doctrine-label">Current Head</span>`;
    h += `<span class="doctrine-name" style="color:${headPers.c}">${headPers.label} <span class="dos-kr">${headPers.kr}</span></span>`;
    h += `<span class="doctrine-tagline">${clash ? `Clash with founding soul — tension building.` : `Aligned with the sect's founding nature.`}</span>`;
    h += `</div>`;
  }
  h += `<div class="dos-meta">Founded Year ${s.founded}${!s.alive && s.deadYear ? ` · Dissolved Year ${s.deadYear}` : ''} · ${s.region}${reg ? ` · ${TERRAIN[reg.terrain].label}` : ''}</div>`;
  h += `<div class="dos-meta">Prestige ${Math.round(s.prestige)} · Legitimacy ${Math.round(s.legitimacy)} · ${living.length} living disciples · ${s.allMembers.length} total</div>`;
  /* tradition + recruitment bias */
  if (s.successionTradition || s.recruitBias) {
    const trad = s.successionTradition ? SUCCESSION_TRADITIONS[s.successionTradition] : null;
    const bias = s.recruitBias ? RECRUIT_BIAS[s.recruitBias] : null;
    const parts = [];
    if (trad) parts.push(`${trad.label} <span class="dos-tkr">${trad.kr}</span>`);
    if (bias && bias.key !== "any") parts.push(`${bias.label} <span class="dos-tkr">${bias.kr}</span>`);
    if (parts.length) h += `<div class="dos-meta dos-tradition">${parts.join(' · ')}</div>`;
  }
  if (reg) {
    h += `<div class="dos-meta">Seat: ${TERRAIN[reg.terrain].label} — prosperity ${Math.round(reg.prosperity)}, stability ${Math.round(reg.stability)}, population ${Math.round(reg.population)}</div>`;
  }
  /* succession: a named heir, or an active crisis tearing at the house */
  if (s.succession) {
    const yrs = STATE.year - s.succession.startYear;
    const claimNames = s.succession.claimantIds.map(figById).filter(f => f && f.alive).map(f => f.name);
    h += `<div class="dos-crisis"><span class="dos-role">Crisis</span>`;
    h += `<b>Succession Crisis</b> · ${yrs} year${yrs === 1 ? '' : 's'} unresolved`;
    if (claimNames.length) h += `<div class="dos-crisis-claim">Claimants: ${claimNames.slice(0, 4).join(', ')}</div>`;
    h += `</div>`;
  } else if (s.heirId != null) {
    const heir = figById(s.heirId);
    if (heir && heir.alive) h += `<div class="dos-conn"><span class="dos-role">Heir</span><span class="dos-link" data-follow-fig="${heir.id}">${heir.name}</span> — successor-in-waiting</div>`;
  }
  if (s.patron) h += `<div class="dos-conn"><span class="dos-role">Court</span>Patronised by the Imperial Throne</div>`;
  if (s.doctrinalDebt >= 18) h += `<div class="dos-conn taint-mid"><span class="dos-role">Doctrine</span>Strained — forbidden methods harboured within (${Math.round(s.doctrinalDebt)})</div>`;
  if (s.reformLean >= 15) h += `<div class="dos-conn"><span class="dos-role">Reform</span>Non-conformist currents stir within the house</div>`;

  /* the unorthodox middle: where this house leans, and what it remembers */
  if (s.align === "unorthodox") {
    const pct = (clamp(s.stance, -100, 100) + 100) / 2;
    h += `<div class="dos-stance"><span class="dos-role">Stance</span>`;
    h += `<div class="stance-track"><div class="stance-pin" style="left:${pct}%"></div></div>`;
    h += `<span class="stance-lbl">${stanceLabel(s.stance)}</span></div>`;
  }
  if (s.blocGrudges && s.blocGrudges.length) {
    h += `<div class="dos-sec">Old Wounds</div>`;
    for (const g of s.blocGrudges) {
      const bl = STATE.blocs.find(x => x.id === g.blocId);
      const nm = bl ? `${bl.name} (${bl.kr})` : "a since-broken banner";
      h += `<div class="dos-conn dos-wounds"><span class="dos-role">Y${g.year}</span>${nm} — ${g.reason}${g.event != null ? ` <button class="why-btn" data-chain="${g.event}">${icon('chain')}</button>` : ""}</div>`;
    }
  }

  if (!s.alive && s.fallEvent != null) {
    h += `<button class="why-btn" data-chain="${s.fallEvent}">${icon('chain')} <span>Why did this house fall?</span></button>`;
  }

  if (s.signatureArt) {
    const sa = s.signatureArt;
    const ct = artCorruptType(sa);
    const ctLabel = ct === "always" ? " · Inherently corruptive" : ct === "conditional" ? " · Conditionally corruptive" : "";
    h += `<div class="dos-conn" style="margin-top:8px"><span class="dos-role">Art</span><em class="art">${sa.name} (${sa.kr})</em> tier ${sa.tier}${sa.cursed ? ' · <span style="color:var(--blood)">CURSED</span>' : ''}${ctLabel ? `<span style="font-size:11px;color:var(--ink-dim)">${ctLabel}</span>` : ''}</div>`;
    h += buildArtTraditionBlock(sa);
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
