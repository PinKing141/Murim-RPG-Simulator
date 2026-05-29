import { rand, ri, pick, chance, clamp, cap } from './rng.js';
import { REALMS, REALM_KR, APEX, ALIGN } from './data.js';
import { STATE, figById, makeFigure, makeSect, addToSect, aliveSects, aliveFigs, recomputePower, recomputeLife } from './state.js';
import { chron, ref, plainRef, sref } from './chronicle.js';
import { alignShift, maybeName, killFigure } from './systems.js';
import { addGrudge } from './bloodlines.js';
import { allianceBloc, cultBloc, sectBloc } from './factions.js';

/*
  The player layer. The chronicle has always run itself; this lets you step
  inside it as one martial artist and live a life — training, choosing masters,
  resisting or embracing the demonic, dueling rivals — while the autonomous
  world carries on around you. Your choices steer your figure; everything else
  (aging, war, vengeance, the Heavenly Demon) can still find you.
*/

export const PLAYER = {
  id: null, active: false,
  goal: null, titles: [], decisions: 0, bornYear: 0
};

const GOALS = [
  { key:"apex",   text:"Touch the Nature Realm (자연경)",         done:f => f.realm >= APEX },
  { key:"named",  text:"Win a name spoken across the Murim",      done:f => f.namedAt != null },
  { key:"master", text:"Found a house of your own",               done:f => !!(f.sect && f.sect.headId === f.id && f.sect.founded >= PLAYER.bornYear) },
  { key:"maeng",  text:"Be raised as 맹주 of the Murim Alliance", done:f => { const b = allianceBloc(); return b && b.leaderId === f.id; } }
];

export function livePlayer() {
  /* born into the world as a youth of promise — placed in a living house if one will have them */
  const host = pick(aliveSects().filter(s => s.align !== "demonic")) || null;
  const f = makeFigure({
    align: host ? host.align : pick(["orthodox","unorthodox","recluse"]),
    sect: host, realm: 0, age: ri(14, 17),
    talent: ri(45, 78), charisma: ri(35, 70)
  });
  f.isPlayer = true;
  if (host) { addToSect(host, f); if (host.signatureArt) { f.art = host.signatureArt; host.signatureArt.holders++; recomputePower(f); } }
  STATE.figures.push(f);

  PLAYER.id = f.id; PLAYER.active = true; PLAYER.titles = []; PLAYER.decisions = 0;
  PLAYER.bornYear = STATE.year;
  PLAYER.goal = pick(GOALS);
  lastDecisionYear = -99;

  chron("c-rise",
    `A new life enters the Gangho: ${plainRef(f)}${host ? ` of ${sref(host)}` : ", a wanderer of no house"}, young and untested, takes up the martial path.`,
    "major", [f.id], host ? [host.id] : []);
  return f;
}

export function endPlayer() { PLAYER.active = false; }
export const playerFig = () => PLAYER.active ? figById(PLAYER.id) : null;

/* check the player's goal each year; a fulfilled goal is a triumph, not an end */
export function checkGoals(f) {
  if (PLAYER.goal && !PLAYER.goal.achieved && PLAYER.goal.done(f)) {
    PLAYER.goal.achieved = true;
    PLAYER.titles.push(PLAYER.goal.text);
    chron("c-rise",
      `${ref(f)} has fulfilled a life's ambition — ${PLAYER.goal.text.toLowerCase()}. The chronicle will remember it.`,
      "epic", [f.id]);
    const next = GOALS.filter(g => !g.done(f));
    PLAYER.goal = next.length ? { ...pick(next), achieved: false } : null;
  }
}

/* ---- decisions ---- */

let lastDecisionYear = -99;

const otherFig = (f, pred) => {
  const c = aliveFigs().filter(x => x !== f && pred(x));
  return c.length ? pick(c) : null;
};

const DECISIONS = [
  {
    id: "master", w: 3,
    when: f => f.realm <= 1 && !f.master && f.age <= 24,
    make: f => {
      const mentor = otherFig(f, x => x.realm >= 5 && x.align !== "demonic");
      return {
        title: "A Hand Extended",
        text: mentor
          ? `${ref(mentor)}, a master of the ${REALMS[mentor.realm]} realm, sees something in you and offers to take you as a disciple.`
          : `An elder of the wandering world offers to teach you the fundamentals of cultivation.`,
        options: [
          { label: "Accept the teaching", desc: "Faster cultivation, but you owe a master.", apply: f => {
              f.master = mentor ? mentor.id : null;
              f.progress += ri(20, 40); f.talent = clamp(f.talent + ri(2, 6), 0, 99);
              if (mentor && mentor.sect && mentor.sect.alive && !f.sect) { f.sect = mentor.sect; addToSect(mentor.sect, f); }
              recomputePower(f);
              chron("c-lineage", `${ref(f)} kneels and takes ${mentor ? ref(mentor) : "a wandering elder"} as master.`, "normal", [f.id]);
          }},
          { label: "Walk your own road", desc: "No master, no debt — but a harder climb.", apply: f => {
              f.charisma = clamp(f.charisma + ri(3, 7), 0, 100); f.fame += 2;
              chron("c-rise", `${ref(f)} refuses all masters, resolved to forge their own path.`, "normal", [f.id]);
          }}
        ]
      };
    }
  },
  {
    id: "manual", w: 2,
    when: f => f.realm >= 1 && f.realm <= 6,
    make: f => ({
      title: "A Manual of Dubious Origin",
      text: `You come upon a profound but forbidden manual, its techniques swift and ravenous. Power is offered — at a price to the spirit.`,
      options: [
        { label: "Study it in secret", desc: "Real power now; the demonic stirs in you.", apply: f => {
            f.progress += ri(30, 55); recomputePower(f);
            alignShift(f, ri(12, 24), "delving into a forbidden manual");
            chron("c-corrupt", `${ref(f)} pores over the forbidden manual; the meridians burn cold with new strength.`, "normal", [f.id]);
        }},
        { label: "Hand it to your elders", desc: "Spurn the shortcut; your name grows cleaner.", apply: f => {
            f.fame += 6; if (f.sect) f.sect.legitimacy = clamp(f.sect.legitimacy + ri(2, 5), 0, 100);
            chron("c-rise", `${ref(f)} surrenders the forbidden manual to be sealed away — a choice the righteous note well.`, "normal", [f.id]);
            maybeName(f);
        }}
      ]
    })
  },
  {
    id: "duel", w: 2,
    when: f => f.realm >= 2,
    make: f => {
      const rival = otherFig(f, x => x.realm >= f.realm - 1 && x.realm <= f.realm + 2);
      return {
        title: "A Challenge Issued",
        text: rival
          ? `${ref(rival)} blocks your path and calls you out before onlookers. Steel or shame.`
          : `A masked challenger calls you out before a teahouse crowd.`,
        options: [
          { label: "Cross blades", desc: "Win renown — or be cut down.", apply: f => {
              const rp = rival ? rival.power : f.power * (0.7 + rand() * 0.7);
              const edge = f.power + f.talent * 2 - rp;
              if (edge + ri(-120, 120) >= 0) {
                f.fame += ri(6, 12); f.progress += ri(8, 18); recomputePower(f);
                chron("c-duel", `${ref(f)} defeats ${rival ? ref(rival) : "the masked challenger"} in open combat, and the crowd remembers the name.`, "normal", [f.id], [], []);
                maybeName(f);
              } else {
                f.progress = Math.max(0, f.progress - ri(10, 25));
                if (rival) addGrudge(f, rival.id, {});
                if (chance(.12)) { killFigure(f, "is slain in a duel that went a step too far", [], rival ? rival.id : null, { level:"major" }); }
                else chron("c-duel", `${ref(f)} is bested${rival ? ` by ${ref(rival)}` : ""} and carried off bloodied — a humiliation that will be answered.`, "normal", [f.id]);
              }
          }},
          { label: "Refuse the duel", desc: "Keep your skin; lose a little face.", apply: f => {
              f.fame = Math.max(0, f.fame - 2);
              chron("c-duel", `${ref(f)} declines the challenge and walks away to muttering — wise, perhaps, or craven.`, "normal", [f.id]);
          }}
        ]
      };
    }
  },
  {
    id: "seclusion", w: 2,
    when: f => f.realm >= 2 && f.progress >= 55,
    make: f => ({
      title: "The Wall Before the Next Realm",
      text: `You sense the bottleneck to the ${REALMS[Math.min(f.realm + 1, APEX)]} (${REALM_KR[Math.min(f.realm + 1, APEX)]}) realm. You could seclude yourself and hurl everything at it.`,
      options: [
        { label: "Enter deep seclusion", desc: "All-or-nothing: a leap, or wasted years.", apply: f => {
            if (chance(.55)) {
              f.progress = 100; chron("c-break", `${ref(f)} emerges from seclusion having shattered the bottleneck — the next realm is within grasp.`, "normal", [f.id]);
            } else {
              f.age += ri(2, 4); f.progress = Math.max(0, f.progress - ri(5, 20));
              chron("c-duel", `${ref(f)} emerges from seclusion gaunt and empty-handed; years spent for nothing.`, "normal", [f.id]);
            }
        }},
        { label: "Advance steadily", desc: "A small, certain gain. No risk.", apply: f => {
            f.progress = clamp(f.progress + ri(12, 22), 0, 100);
            chron("c-break", `${ref(f)} tempers the foundation patiently, gaining ground inch by inch.`, "normal", [f.id]);
        }}
      ]
    })
  },
  {
    id: "war", w: 2,
    when: f => f.sect && f.sect.alive && f.sect.atWarWith && f.sect.atWarWith.length > 0 && f.realm >= 2,
    make: f => ({
      title: "Your House Calls to War",
      text: `${sref(f.sect)} marches to war and your name is on the muster roll. Glory and danger ride together.`,
      options: [
        { label: "Ride to the front", desc: "Fame and progress — at mortal risk.", apply: f => {
            if (chance(.78)) {
              f.fame += ri(7, 14); f.progress += ri(10, 22); f.sect.legitimacy = clamp(f.sect.legitimacy + 2, 0, 100); recomputePower(f);
              chron("c-war", `${ref(f)} distinguishes themselves on the battlefield, blade wet and name rising.`, "normal", [f.id], [f.sect.id]);
              maybeName(f);
            } else {
              killFigure(f, `falls in the front line fighting for ${f.sect.name}`, [], null, { level:"major" });
            }
        }},
        { label: "Stay from the slaughter", desc: "Survive; your standing slips.", apply: f => {
            f.fame = Math.max(0, f.fame - 3); if (f.sect) f.sect.legitimacy = clamp(f.sect.legitimacy - 1, 0, 100);
            chron("c-duel", `${ref(f)} holds back from the fighting; the elders mark the absence.`, "normal", [f.id]);
        }}
      ]
    })
  },
  {
    id: "temptation", w: 3,
    when: f => f.alignmentDrift >= 55 && f.align !== "demonic" && f.realm >= 4,
    make: f => ({
      title: "The Demon at the Threshold",
      text: `The cold power you have courted now offers everything — if you will only let go of the last of your restraint. The Demonic Path opens before you.`,
      options: [
        { label: "Embrace the Demonic Path", desc: "Tremendous power; you become 마도.", apply: f => {
            alignShift(f, 40, "casting off the last restraint"); f.progress += ri(25, 45); recomputePower(f);
            chron("c-corrupt", `${ref(f)} surrenders to the demonic at last; the world will learn to fear the name.`, "major", [f.id]);
        }},
        { label: "Master yourself", desc: "Pull back from the brink; the drift recedes.", apply: f => {
            alignShift(f, -ri(20, 35), "wrenching back from the brink"); f.fame += 4;
            chron("c-rise", `${ref(f)} stares into the abyss and turns away — the hardest victory is over oneself.`, "major", [f.id]);
            maybeName(f);
        }}
      ]
    })
  },
  {
    id: "found", w: 3,
    when: f => f.realm >= 5 && f.fame >= 14 && (!f.sect || f.sect.headId !== f.id),
    make: f => ({
      title: "Raise Your Own Banner",
      text: `Your name now carries weight enough to gather disciples. You could found a house of your own and write your name into the map of the Murim.`,
      options: [
        { label: "Found your own house", desc: "Become a 장문인; build a legacy.", apply: f => {
            foundPlayerSect(f);
        }},
        { label: "Remain unbound", desc: "Keep your freedom; found nothing.", apply: f => {
            f.charisma = clamp(f.charisma + 2, 0, 100);
            chron("c-rise", `${ref(f)} declines to be tied to any hall, content to roam as a free blade.`, "normal", [f.id]);
        }}
      ]
    })
  },
  {
    id: "creed", w: 1,
    when: f => { const b = allianceBloc() || cultBloc(); return f.realm >= 3 && b && !sectBloc(f.sect ? f.sect.id : -1); },
    make: f => {
      const A = allianceBloc(), C = cultBloc();
      return {
        title: "The Banners Are Raised",
        text: `The great blocs vie for the age. ${A ? `${A.name} swears the orthodox oath. ` : ""}${C ? `${C.name} gathers the demonic host. ` : ""}Where will you stand?`,
        options: [
          ...(A ? [{ label: `Stand with ${A.name}`, desc: "Lend your strength to the orthodox cause.", apply: f => {
              f.fame += 4; if (f.sect && !A.memberSects.includes(f.sect.id)) A.memberSects.push(f.sect.id);
              chron("c-faction", `${ref(f)} pledges to ${sref(f.sect) || "the alliance"} and the orthodox oath.`, "normal", [f.id]);
          }}] : []),
          ...(C ? [{ label: `Throw in with ${C.name}`, desc: "Cast your lot with the demonic host.", apply: f => {
              alignShift(f, ri(10, 20), "casting in with the cult"); f.fame += 3;
              chron("c-corrupt", `${ref(f)} is seen among the banners of ${C.name}.`, "normal", [f.id]);
          }}] : []),
          { label: "Bow to no banner", desc: "Stay your own master.", apply: f => {
              f.charisma = clamp(f.charisma + 2, 0, 100);
              chron("c-duel", `${ref(f)} refuses every banner, trusting only their own blade.`, "normal", [f.id]);
          }}
        ]
      };
    }
  }
];

/* found a sect for the player — they leave their old house to raise their own */
function foundPlayerSect(f) {
  if (f.sect) f.sect.members = f.sect.members.filter(id => id !== f.id);
  const s = makeSect({ align: f.align === "demonic" ? "unorthodox" : f.align, prestige: ri(35, 55), legitimacy: ri(45, 62) });
  s.signatureArt = f.art || null;
  s.headId = f.id; s.founded = STATE.year;
  f.sect = s; addToSect(s, f);
  STATE.sects.push(s);
  chron("c-found",
    `${ref(f)} raises a banner of their own, founding ${sref(s)} — a new name upon the map of the Murim.`,
    "major", [f.id], [s.id]);
}

export function maybeDecision() {
  const f = playerFig();
  if (!f || !f.alive) return null;
  if (STATE.year - lastDecisionYear < 3) return null;
  const elig = DECISIONS.filter(d => { try { return d.when(f); } catch { return false; } });
  if (!elig.length || !chance(0.55)) return null;
  let total = elig.reduce((t, d) => t + d.w, 0), r = rand() * total, chosen = elig[0];
  for (const d of elig) { r -= d.w; if (r <= 0) { chosen = d; break; } }
  lastDecisionYear = STATE.year;
  const built = chosen.make(f);
  built.options = built.options.filter(Boolean);
  return built;
}

export function applyChoice(decision, idx) {
  const f = playerFig();
  if (!f || !f.alive) return;
  const opt = decision.options[idx];
  if (opt) opt.apply(f);
  PLAYER.decisions++;
  if (f.alive) { recomputeLife(f); recomputePower(f); checkGoals(f); }
}

/* a closing reckoning when the player's life ends */
export function playerSummary() {
  const f = figById(PLAYER.id);
  if (!f) return { name: "—", lines: [], score: 0 };
  const named = f.byeolho && f.namedAt != null;
  const lived = (f.diedYear || STATE.year) - PLAYER.bornYear;
  const score = Math.round(
    f.realm * 100 + f.fame * 2 + (named ? 150 : 0) +
    PLAYER.titles.length * 200 + (f.children ? f.children.length * 40 : 0) +
    f.charisma + f.talent
  );
  const lines = [
    `Lived ${lived} years, reaching the ${REALMS[f.realm]} (${REALM_KR[f.realm]}) realm.`,
    named ? `Known to the world as ${cap(f.byeolho.en)} (${f.byeolho.kr}).` : `Never won a name spoken across the Murim.`,
    f.align === "demonic" ? `Walked the Demonic Path to the end.` : `Held to the ${ALIGN[f.align].label.toLowerCase()} road.`,
    f.children && f.children.length ? `Left ${f.children.length} of their blood behind.` : `Left no heirs.`,
  ];
  if (PLAYER.titles.length) lines.push(`Achieved: ${PLAYER.titles.join("; ")}.`);
  return { name: named ? `${cap(f.byeolho.en)} · ${f.byeolho.kr}` : f.name, lines, score, alignColor: ALIGN[f.align].c };
}
