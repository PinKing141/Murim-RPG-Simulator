import { rand, ri, pick, chance, clamp, cap } from './rng.js';
import { REGIONS, REALMS, REALM_KR, APEX, PATH_FLAVOR, WAR_NAMES, ALIGN } from './data.js';
import { STATE, aliveFigs, aliveSects, figById, makeFigure, makeSect, recomputeLife, recomputePower, makeByeolho } from './state.js';
import { chron, ref, plainRef, sref, aref } from './chronicle.js';

export function maybeName(f, force, causes = []) {
  if (f.namedAt != null) return null;
  if (force || (f.realm >= 3 && f.fame >= 14)) {
    f.byeolho = makeByeolho();
    f.namedAt = STATE.year;
    return chron("c-rise",
      `${plainRef(f)}${f.sect ? " of " + f.sect.name + " (" + f.sect.kr + ")" : ""} has won renown across the land, now spoken of as <span class="nm">${cap(f.byeolho.en)} (${f.byeolho.kr})</span>.`,
      "major", [f.id], [], causes);
  }
  return null;
}

export function alignShift(f, amount, reason, causes = []) {
  const before = f.align;
  f.alignmentDrift = clamp(f.alignmentDrift + amount, 0, 100);
  let na;
  if (f.alignmentDrift >= 72) na = "demonic";
  else if (f.alignmentDrift >= 42) na = "unorthodox";
  else if (f.alignmentDrift <= 10 && f.align !== "recluse") na = "orthodox";
  else na = f.align;
  if (na !== before && f.align !== "recluse") {
    f.align = na;
    if (na === "demonic") {
      const ev = chron("c-corrupt",
        `${ref(f)} has fallen to the Demonic Path (마도)${reason ? " — " + reason : ""}. The energy about them turns cold and ravenous.`,
        "major", [f.id], [], causes);
      f.fallEvent = ev.id;
    } else if (na === "unorthodox" && before === "orthodox") {
      chron("c-corrupt",
        `${ref(f)} forsakes the orthodox canon for unorthodox methods${reason ? " after " + reason : ""}.`,
        "normal", [f.id], [], causes);
    }
    recomputeLife(f);
  }
}

export function killFigure(f, why, causes = []) {
  f.alive = false; f.diedYear = STATE.year;
  if (f.sect) { f.sect.members = f.sect.members.filter(id => id !== f.id); }
  if (f.art) f.art.holders = Math.max(0, f.art.holders - 1);
  let deathEv = null;
  if (f.namedAt != null || f.realm >= 4) {
    const lvl = f.realm >= 6 ? "major" : "normal";
    deathEv = chron("c-death",
      `${ref(f)}${f.sect ? " of " + f.sect.name : ""} ${why}. ${f.realm >= 6 ? "An age ends with them." : ""}`,
      lvl, [f.id], [], causes);
    if (f.isThreat) {
      STATE.threatActive = false;
      const peace = chron("c-peace",
        `With the fall of the Heavenly Demon, the Murim exhales. Yet ${aref(f.art)} was never recovered...`,
        "major", [f.id], [], [deathEv.id]);
      if (f.art) {
        f.art.dormant = true; f.art.lostHolder = f.name; f.art.lostHolderId = f.id;
        f.art.lostEvent = peace.id;
      }
    }
  }
  return deathEv;
}

export function loseArt(a, why, causes = []) {
  a.lost = true; a.lostYear = STATE.year; a.holders = 0;
  const ev = chron("c-lost", `${aref(a)} is lost to time — ${why}.`, "normal", [], [], causes);
  a.lostEvent = ev.id;
  return ev;
}

export function dissolveSect(s, why, causes = []) {
  if (!s.alive) return null;
  s.alive = false; s.deadYear = STATE.year;
  const surv = s.members.map(figById).filter(x => x && x.alive);
  for (const f of surv) { f.sect = null; if (chance(.3) && f.align === "orthodox") f.align = "unorthodox"; }
  const ev = chron("c-fall",
    `${sref(s)} is ${why}; its disciples scatter into the Gangho, its halls left to the crows.`,
    "major", [], [s.id], causes);
  s.fallEvent = ev.id;
  if (s.signatureArt && s.signatureArt.holders <= 1 && chance(.5)) {
    loseArt(s.signatureArt, `buried in the ruin of ${s.name}`, [ev.id]);
  }
  return ev;
}

export function sectMight(s) { return s.members.map(figById).filter(x => x && x.alive).reduce((t, f) => t + f.power, 0) + s.prestige * 5; }
export function topMember(s) { const m = s.members.map(figById).filter(x => x && x.alive).sort((a, b) => b.power - a.power); return m[0] || null; }
function warExists(a, b) { return STATE.activeWars.some(w => (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id)); }

/* find the event behind a grudge that links any living member of A to any of B */
function grudgeCauseBetween(A, B) {
  const ma = A.members.map(figById).filter(x => x && x.alive);
  const mb = B.members.map(figById).filter(x => x && x.alive);
  const bSet = new Set(mb.map(f => f.id));
  const aSet = new Set(ma.map(f => f.id));
  for (const f of ma) {
    for (const tid of f.grudges) {
      if (bSet.has(tid) && f.grudgeCause[tid] != null) return f.grudgeCause[tid];
    }
  }
  for (const f of mb) {
    for (const tid of f.grudges) {
      if (aSet.has(tid) && f.grudgeCause[tid] != null) return f.grudgeCause[tid];
    }
  }
  return null;
}

function battle(A, B, pa, pb, w) {
  const winner = pa >= pb ? A : B, loser = pa >= pb ? B : A;
  const victims = loser.members.map(figById).filter(x => x && x.alive);
  if (victims.length > 1 && chance(.6)) {
    const v = pick(victims.sort((x, y) => x.power - y.power).slice(0, Math.ceil(victims.length / 2)));
    if (v) killFigure(v, `falls in battle during ${w.name} (${w.kr})`, w.startEvent != null ? [w.startEvent] : []);
  }
  const cA = topMember(winner), cB = topMember(loser);
  if (cA && cB && chance(.25)) {
    chron("c-duel",
      `At the height of ${w.name}, ${ref(cA)} crosses blades with ${ref(cB)} — ${pick(["a clash that splits the very air","three hundred exchanges beneath a bleeding moon","steel and naegong until the river ran red"])}.`,
      "normal", [cA.id, cB.id], [], w.startEvent != null ? [w.startEvent] : []);
  }
}

function endWar(w, A, B, winner, loser) {
  STATE.activeWars = STATE.activeWars.filter(x => x !== w);
  if (A) A.atWarWith = A.atWarWith.filter(id => !B || id !== B.id);
  if (B) B.atWarWith = B.atWarWith.filter(id => !A || id !== A.id);
  if (winner && loser) {
    winner.prestige += ri(8, 18); loser.prestige -= ri(15, 30);
    const ev = chron("c-war",
      `${w.name} (${w.kr}) ends. ${sref(winner)} stands victorious; ${sref(loser)} is broken and humbled.`,
      "major", [], [winner.id, loser.id], w.startEvent != null ? [w.startEvent] : []);
    if (loser.prestige <= 8 || chance(.4)) dissolveSect(loser, `shattered in ${w.name}`, [ev.id]);
  }
}

/* ---- tick systems ---- */

export function sysCultivation() {
  for (const f of aliveFigs()) {
    if (f.realm >= APEX) { f.progress = 100; continue; }
    let gain = (f.talent / 30) + rand() * 4;
    if (f.align === "demonic") gain *= 1.25;
    if (f.align === "recluse") gain *= 0.8;
    if (f.sect) gain *= 1.1;
    f.progress += gain;
    if (f.progress >= 100) {
      f.progress = 0; f.realm++;
      f.realmHistory.push({ year: STATE.year, realm: f.realm });
      recomputeLife(f); recomputePower(f);
      f.fame += 3 + f.realm;
      const fl = PATH_FLAVOR[f.align];
      if (f.realm >= 3) {
        const lvl = f.realm >= 6 ? "major" : "normal";
        chron("c-break",
          `${ref(f)} ${fl.verb} the realm of <b style="color:var(--gold)">${REALMS[f.realm]} (${REALM_KR[f.realm]})</b>, ${pick(fl.via)}.`,
          lvl, [f.id]);
      }
      maybeName(f);
      if (f.realm === APEX) {
        chron("c-break",
          `Heaven itself takes notice: ${ref(f)} has touched the <b style="color:var(--gold-bright)">Nature Realm (자연경)</b>, the apex no mortal is meant to reach.`,
          "epic", [f.id]);
      }
    }
  }
}

export function sysFame() {
  for (const f of aliveFigs()) {
    if (chance(.04)) { f.fame += rand() * 2; maybeName(f); }
  }
}

export function sysAging() {
  for (const f of aliveFigs()) {
    f.age++;
    const over = f.age - f.lifespan;
    let deathP = over > 0 ? 0.18 + over * 0.05 : (f.age > f.lifespan - 10 ? 0.02 : 0.004);
    if (f.align === "demonic") deathP += 0.01;
    if (chance(deathP)) killFigure(f, "passes from the world, their naegong returning to heaven and earth");
  }
}

function addToSect(s, f) {
  s.members.push(f.id);
  if (!s.allMembers.includes(f.id)) s.allMembers.push(f.id);
}

export function sysRecruitment() {
  for (const s of aliveSects()) {
    const living = s.members.map(figById).filter(x => x && x.alive);
    if (living.length < 3) {
      for (let i = 0; i < ri(1, 2); i++) {
        const f = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: 0, age: ri(13,18), talent: ri(15,70) });
        addToSect(s, f); STATE.figures.push(f);
        if (s.signatureArt) s.signatureArt.holders++;
      }
    } else if (chance(.35) && living.length < 14) {
      const master = pick(living.filter(x => x.realm >= 3)) || pick(living);
      const f = makeFigure({ align: s.align, sect: s, art: s.signatureArt, realm: 0, age: ri(12,17), talent: ri(15,75), master: master ? master.id : null });
      addToSect(s, f); STATE.figures.push(f);
      if (s.signatureArt) s.signatureArt.holders++;
      if (f.talent >= 68) {
        chron("c-lineage",
          `A prodigy named ${plainRef(f)} is taken in by ${sref(s)}; the elders whisper of a rare innate root.`,
          "normal", [f.id], [s.id]);
      }
    }
  }
}

export function sysArtRefinement() {
  for (const a of STATE.arts) {
    if (a.lost || a.dormant) continue;
    const masters = aliveFigs().filter(f => f.art === a && f.realm >= 5);
    if (masters.length && chance(.12) && a.tier < 9) {
      a.tier++;
      const m = pick(masters);
      const ord = ["","first","second","third","fourth","fifth","sixth","seventh","eighth","ninth"][a.tier];
      chron("c-art",
        `${ref(m)} comprehends a higher layer of ${aref(a)}, refining it to its ${ord} stratum.`,
        a.tier >= 7 ? "major" : "normal", [m.id]);
    }
  }
}

export function sysRivalryAndWar() {
  const sects = aliveSects();
  for (const w of [...STATE.activeWars]) {
    w.years++;
    const A = STATE.sects.find(s => s.id === w.a), B = STATE.sects.find(s => s.id === w.b);
    if (!A || !B || !A.alive || !B.alive) { endWar(w, A, B); continue; }
    const pa = sectMight(A), pb = sectMight(B);
    if (chance(.5)) battle(A, B, pa, pb, w);
    if (w.years >= 2 && (chance(.3) || Math.abs(pa - pb) > pa * 0.6)) {
      const winner = pa >= pb ? A : B, loser = pa >= pb ? B : A;
      endWar(w, A, B, winner, loser);
    }
  }
  if (sects.length >= 2 && STATE.activeWars.length < 2 && chance(.22)) {
    const a = pick(sects); let b = pick(sects); let g = 0; while (b === a && g++ < 5) b = pick(sects);
    if (a !== b && !warExists(a, b)) {
      const enemyPaths = (a.align === "demonic" && b.align === "orthodox") || (a.align === "orthodox" && b.align === "demonic");
      if (enemyPaths || chance(.4)) {
        const wn = pick(WAR_NAMES);
        const w = { a: a.id, b: b.id, name: wn[0], kr: wn[1], years: 0, start: STATE.year, startEvent: null };
        STATE.activeWars.push(w);
        a.atWarWith.push(b.id); b.atWarWith.push(a.id);
        /* a feud between members of the two houses is the seed of the war when one exists */
        const grudgeEv = grudgeCauseBetween(a, b);
        const cause = grudgeEv != null ? "a feud long left to fester" :
          enemyPaths ? "the orthodox cannot abide the demonic" :
          pick(["a stolen manual","an assassinated elder","a contested mountain","an old blood-debt","a marriage betrayed","a duel gone wrong"]);
        const ev = chron("c-war",
          `${pick(["Banners rise","War drums sound","Blood is sworn"])}: ${sref(a)} and ${sref(b)} fall into open war — ${w.name} (${w.kr}) — over ${cause}.`,
          "major", [], [a.id, b.id], grudgeEv != null ? [grudgeEv] : []);
        w.startEvent = ev.id;
      }
    }
  }
}

export function sysCorruptionAndThreat() {
  for (const f of aliveFigs()) {
    if (f.align !== "recluse") {
      let drift = 0;
      const causes = [];
      if (f.art && f.art.corruption > 30) {
        drift += rand() * 1.5;
        if (f.originEvent != null) causes.push(f.originEvent);
        else if (f.art.lostEvent != null) causes.push(f.art.lostEvent);
      }
      if (f.grudges.length) {
        drift += rand() * 1.2;
        for (const tid of f.grudges) { if (f.grudgeCause[tid] != null) { causes.push(f.grudgeCause[tid]); break; } }
      }
      if (STATE.activeWars.length) drift += rand() * 0.6;
      if (drift > 0) alignShift(f, drift, null, causes);
    }
    if (!STATE.threatActive && f.align === "demonic" && f.realm >= 7 && f.alignmentDrift >= 85 && chance(.4)) {
      f.isThreat = true; STATE.threatActive = true;
      maybeName(f);
      const ev = chron("c-threat",
        `A shadow falls over all under heaven: ${ref(f)} ascends as the <b style="color:var(--blood)">Heavenly Demon (천마)</b> and declares the old order finished. ${f.lineage ? `Heir to ${f.lineage}, ` : ""}the Murim trembles.`,
        "epic", [f.id], [], f.fallEvent != null ? [f.fallEvent] : []);
      f.ascendEvent = ev.id;
    }
  }
  if (STATE.threatActive) {
    const threat = aliveFigs().find(f => f.isThreat);
    if (threat && chance(.35)) {
      const heroes = aliveFigs().filter(f => f.align !== "demonic" && f.realm >= 5 && f !== threat);
      if (heroes.length >= 2) {
        const champ = heroes.sort((a, b) => b.power - a.power)[0];
        const threatCause = threat.ascendEvent != null ? [threat.ascendEvent] : [];
        if (champ.power > threat.power * 0.85 && chance(.5)) {
          const death = killFigure(threat, `is at last cut down by ${champ.byeolho ? cap(champ.byeolho.en) : champ.name} and the orthodox alliance (무림맹)`, threatCause);
          champ.fame += 20; maybeName(champ);
          chron("c-rise",
            `${ref(champ)} is hailed across the Murim as the hero who slew the Heavenly Demon.`,
            "major", [champ.id], [], death ? [death.id] : []);
        } else {
          killFigure(champ, `is slain confronting the Heavenly Demon`, threatCause);
        }
      }
    }
  }
}

export function sysLostAndFound() {
  for (const a of STATE.arts) {
    if (!a.lost && !a.dormant && a.holders <= 0 && chance(.5)) {
      loseArt(a, "its last practitioner dead, the manual mislaid");
    }
  }
  const lost = STATE.arts.filter(a => a.lost || a.dormant);
  if (lost.length && chance(.14)) {
    const a = pick(lost);
    const arch = pick([
      { n: "a destitute beggar",      t: ri(70,95) },
      { n: "an orphaned woodcutter",  t: ri(65,90) },
      { n: "a disgraced servant",     t: ri(60,88) },
      { n: "a wandering mute child",  t: ri(72,96) },
      { n: "a condemned prisoner",    t: ri(60,85) }
    ]);
    const prevHolderId = a.lostHolderId;
    const lostEv = a.lostEvent;
    const f = makeFigure({ align: a.dormant ? "demonic" : (a.align === "demonic" ? "unorthodox" : a.align), realm: 1, age: ri(15,24), talent: arch.t, art: a });
    a.lost = false; a.dormant = false; a.holders = 1;
    if (a.lostHolder) { f.lineage = a.lostHolder + "'s legacy"; f.lineageId = prevHolderId; }
    STATE.figures.push(f);
    const found = chron("c-found2",
      `In ${pick(REGIONS)}, ${arch.n} named ${plainRef(f)} stumbles upon ${aref(a)}, lost ${STATE.year - (a.lostYear || a.origin)} years. Fate chooses strangely.`,
      "major", [f.id], [], lostEv != null ? [lostEv] : []);
    f.originEvent = found.id;
    if (a.dormant || a.corruption > 50) {
      chron("c-corrupt",
        `The manual is steeped in old malice. Those who hear of it fear what ${plainRef(f)} may become.`,
        "normal", [f.id], [], [found.id]);
    }
  }
}

export function sysSectFortune() {
  for (const s of aliveSects()) {
    s.prestige = clamp(s.prestige + (rand() - 0.45) * 4, 0, 100);
    if (s.prestige <= 4 && chance(.5)) dissolveSect(s, "withered into obscurity, its halls left empty");
  }
  if (aliveSects().length < 7 && chance(.16)) {
    const wanderers = aliveFigs().filter(f => !f.sect && f.realm >= 5);
    if (wanderers.length) {
      const founder = pick(wanderers);
      const s = makeSect({ align: founder.align, prestige: ri(30,50) });
      s.signatureArt = founder.art || pick(STATE.arts.filter(a => !a.lost)) || null;
      founder.sect = s;
      addToSect(s, founder);
      STATE.sects.push(s);
      maybeName(founder, true);
      chron("c-found",
        `From the ashes, ${ref(founder)} establishes ${sref(s)} in ${s.region}. A new power rises where the old fell.`,
        "major", [founder.id], [s.id], founder.originEvent != null ? [founder.originEvent] : []);
    }
  }
}

export function sysHeroicArcs() {
  if (chance(.18)) {
    const figs = aliveFigs().filter(f => f.realm >= 3);
    if (figs.length >= 2) {
      const a = pick(figs); let b = pick(figs); let g = 0; while (b === a && g++ < 4) b = pick(figs);
      if (a !== b) {
        const arc = pick([
          { cls: "c-peace",   kind: "brother",  fn: () => `${ref(a)} and ${ref(b)} swear brotherhood beneath the peach blossoms, vowing to share fortune and ruin alike.` },
          { cls: "c-duel",    kind: "duel",     fn: () => `A bitter duel: ${ref(a)} defeats ${ref(b)} atop ${pick(["Sword-Testing Cliff","the Frozen Pavilion","Lone Goose Peak","the Drunken Bridge"])}, sparing their life — and earning a lifelong grudge.` },
          { cls: "c-lineage", kind: "betray",   fn: () => `${ref(b)} betrays ${ref(a)}, stealing a page of their manual under the new moon.` },
          { cls: "c-lineage", kind: "disciple", fn: () => `${ref(a)} takes ${ref(b)} as a sworn disciple, passing down hard-won insight.` },
          { cls: "c-peace",   kind: "romance",  fn: () => `Rumour spreads that ${ref(a)} has fallen in love with ${ref(b)} — a romance the sects forbid.` }
        ]);
        const html = arc.fn();
        const ev = chron(arc.cls, html, "normal", [a.id, b.id]);
        /* wire relationships, recording the event that birthed each grudge so wars can trace back to it */
        if (arc.kind === "brother") { a.brothers.push(b.id); b.brothers.push(a.id); }
        else if (arc.kind === "betray")  { a.grudges.push(b.id); a.grudgeCause[b.id] = ev.id; }
        else if (arc.kind === "duel")    { b.grudges.push(a.id); b.grudgeCause[a.id] = ev.id; }
      }
    }
  }
}

export function tick() {
  STATE.season++;
  if (STATE.season > 3) { STATE.season = 0; STATE.year++; }
  const yearTurn = STATE.season === 0;

  sysCultivation();
  sysFame();
  if (yearTurn) {
    sysAging();
    sysRecruitment();
    sysArtRefinement();
    sysRivalryAndWar();
    sysCorruptionAndThreat();
    sysLostAndFound();
    sysSectFortune();
    sysHeroicArcs();
  }
  STATE.dirtyPanels = true;
}
