import { ri, pick, chance, clamp } from './rng.js';
import { GIVEN } from './data.js';
import { STATE, figById, makeFigure, addToSect, recomputePower } from './state.js';

/* How long a non-blood grudge (a duel, a slight) lingers before it fades.
   Blood grudges — a slain master, a murdered kin — never fade; they pass
   down the bloodline instead. This is the long-run memory window: ordinary
   resentment dies with a generation, vendettas outlive their owners. */
export const GRUDGE_FADE_YEARS = 35;
const TAINT_DECAY = 0.82;      // fraction of taint carried to each child
const TAINT_FLOOR = 30;        // below this, the blood sleeps quietly

/* ---------------- grudges ---------------- */

export function addGrudge(f, targetId, { event = null, blood = false } = {}) {
  if (targetId == null || targetId === f.id) return;
  if (!f.grudges.includes(targetId)) f.grudges.push(targetId);
  if (event != null && f.grudgeCause[targetId] == null) f.grudgeCause[targetId] = event;
  const prev = f.grudgeMeta[targetId];
  f.grudgeMeta[targetId] = {
    event: event != null ? event : (prev ? prev.event : null),
    born: prev ? prev.born : STATE.year,
    blood: blood || (prev ? prev.blood : false)
  };
}

export function dropGrudge(f, targetId) {
  f.grudges = f.grudges.filter(id => id !== targetId);
  delete f.grudgeCause[targetId];
  delete f.grudgeMeta[targetId];
}

/* fade ordinary grudges once they age past the memory window */
export function decayGrudges(f) {
  for (const tid of [...f.grudges]) {
    const m = f.grudgeMeta[tid];
    if (!m || m.blood) continue;
    if (STATE.year - m.born > GRUDGE_FADE_YEARS) dropGrudge(f, tid);
  }
}

export function bloodGrudges(f) {
  return f.grudges.filter(tid => f.grudgeMeta[tid] && f.grudgeMeta[tid].blood);
}

/* when a notable figure is slain, their heirs (children + senior disciple)
   inherit the unsettled blood debt: both the killer, and any vendetta the
   dead carried unfulfilled. A redirected debt falls on the killer's own
   living heir if the killer is already gone — the sins of the father. */
export function inheritGrudgesOnDeath(dead, killerId, deathEventId) {
  const heirs = livingChildren(dead);
  const disc = STATE.figures
    .filter(x => x.alive && x.master === dead.id)
    .sort((a, b) => b.power - a.power)[0];
  if (disc) heirs.push(disc);
  if (!heirs.length) return;

  let target = null;
  if (killerId != null && killerId !== dead.id) {
    const killer = figById(killerId);
    if (killer && killer.alive) target = killerId;
    else if (killer) { const h = livingChildren(killer)[0]; if (h) target = h.id; }
  }
  const carried = bloodGrudges(dead);

  for (const heir of heirs) {
    if (target != null && target !== heir.id) addGrudge(heir, target, { event: deathEventId, blood: true });
    for (const tid of carried) if (tid !== heir.id) addGrudge(heir, tid, { event: dead.grudgeMeta[tid].event, blood: true });
  }
}

/* ---------------- lineage traversal ---------------- */

export const livingChildren = f => (f.children || []).map(figById).filter(x => x && x.alive);
export const childrenOf     = f => (f.children || []).map(figById).filter(Boolean);
export const parentsOf      = f => (f.parents  || []).map(figById).filter(Boolean);

/* climb the primary-parent chain to the founder of the bloodline */
export function bloodlineRoot(f) {
  let cur = f, guard = 0;
  while (cur.parents && cur.parents.length && guard++ < 24) {
    const p = figById(cur.parents[0]);
    if (!p) break;
    cur = p;
  }
  return cur;
}

/* generations between a descendant and a known ancestor (or -1 if unrelated) */
export function genDistance(descendant, ancestorId) {
  let cur = descendant, d = 0, guard = 0;
  const seen = new Set();
  while (cur && guard++ < 24) {
    if (cur.id === ancestorId) return d;
    if (seen.has(cur.id) || !cur.parents || !cur.parents.length) break;
    seen.add(cur.id);
    cur = figById(cur.parents[0]);
    d++;
  }
  return -1;
}

/* ---------------- taint propagation ---------------- */

/* push a Heavenly Demon's taint down to every living descendant already born;
   future children inherit it through makeChild. */
export function propagateTaintFrom(demon) {
  const stack = [...livingChildren(demon).map(c => [c, 1])];
  const seen = new Set();
  while (stack.length) {
    const [f, dist] = stack.pop();
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    const t = Math.round(100 * Math.pow(TAINT_DECAY, dist));
    if (t > f.bloodlineTaint) f.bloodlineTaint = t;
    if (f.taintSource == null) f.taintSource = demon.id;
    for (const c of livingChildren(f)) stack.push([c, dist + 1]);
  }
}

/* ---------------- children ---------------- */

export function makeChild(pA, pB) {
  /* the bloodline carrier (clan / higher realm parent) shapes surname & sect */
  const carrier = pB.clan && !pA.clan ? pB
    : pA.clan && !pB.clan ? pA
    : (pA.realm >= pB.realm ? pA : pB);
  const other = carrier === pA ? pB : pA;

  const clan = carrier.clan || null;
  const surname = clan || carrier.surname;
  const name = surname + " " + pick(GIVEN);

  /* talent is partly inherited; a great master's blood lifts the floor */
  const heritage = (pA.talent + pB.talent) / 2;
  const masterBonus = Math.floor(Math.max(pA.realm, pB.realm) * 2.2);
  const talent = clamp(Math.round(heritage + masterBonus + ri(-12, 10)), 12, 99);

  /* alignment leans to the carrier, but a tainted line breeds shadows */
  let align = chance(.6) ? carrier.align : other.align;
  if (align === "recluse" && chance(.5)) align = "orthodox";

  const taint = Math.max(
    Math.round(Math.max(pA.bloodlineTaint, pB.bloodlineTaint) * TAINT_DECAY),
    pA.isThreat || pB.isThreat ? Math.round(100 * TAINT_DECAY) : 0
  );
  const taintSource = pA.taintSource || pB.taintSource ||
    (pA.isThreat ? pA.id : pB.isThreat ? pB.id : null);

  const sect = (carrier.sect && carrier.sect.alive) ? carrier.sect
    : (other.sect && other.sect.alive) ? other.sect : null;

  const child = makeFigure({
    name, clan, align,
    talent, realm: 0, age: 0,
    sect,
    parents: [pA.id, pB.id],
    gen: Math.max(pA.gen, pB.gen) + 1,
    bloodlineTaint: taint,
    taintSource
  });

  /* the family manual passes down the blood */
  const famArt = carrier.art || other.art || (sect && sect.signatureArt) || null;
  if (famArt && !famArt.lost) { child.art = famArt; famArt.holders++; recomputePower(child); }

  if (sect) addToSect(sect, child);
  pA.children.push(child.id);
  pB.children.push(child.id);

  /* a blood debt is inherited, not chosen */
  for (const tid of bloodGrudges(pA)) addGrudge(child, tid, { event: pA.grudgeMeta[tid].event, blood: true });
  for (const tid of bloodGrudges(pB)) addGrudge(child, tid, { event: pB.grudgeMeta[tid].event, blood: true });

  STATE.figures.push(child);
  return child;
}

/* count living members who share a clan surname */
export function clanCount(clan) {
  if (!clan) return 0;
  return STATE.figures.filter(f => f.alive && f.clan === clan).length;
}
