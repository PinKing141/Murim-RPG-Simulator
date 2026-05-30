import { STATE } from './state.js';

/*
  Chronicle compression. After many decades the scroll becomes unreadable in
  full, so we fold the deep past into "era" blocks: each spans a run of years,
  carries a generated title, and a compressed paragraph that counts what the
  age actually contained — wars, Heavenly Demons, foundings, falls.

  Pure read of STATE.log. Era boundaries fall at natural epoch markers
  (a Heavenly Demon's rise or fall) and otherwise at a maximum span, so no
  single era grows unwieldy.
*/

const MAX_SPAN = 30;   // years before an era is forced to close

/* names drawn from what dominated the age */
function titleFor(stats, idx) {
  if (stats.demons > 0)          return ["the Age of the Heavenly Demon", "천마의 시대"];
  if (stats.wars >= 3)           return ["the Age of Blood", "혈겁의 시대"];
  if (stats.falls >= 3 && stats.foundings <= 1) return ["the Withering Years", "쇠퇴기"];
  if (stats.foundings >= 3)      return ["the Age of Rising Banners", "흥기의 시대"];
  if (stats.tourneys >= 2 && stats.wars === 0)  return ["the Years of Contest", "비무의 시대"];
  if (stats.wars === 0 && stats.falls === 0)    return ["the Long Quiet", "태평성대"];
  const generic = [
    ["the Iron Pact","철맹기"],["the Drifting Years","표류기"],["the Age of Whispers","밀계의 시대"],
    ["the Gathering Storm","폭풍전야"],["the Tempered Age","연마의 시대"],["the Restless Years","불안의 시대"]
  ];
  return generic[idx % generic.length];
}

/* compressed prose for one era block */
function summarize(stats) {
  const parts = [];
  if (stats.wars)      parts.push(`${stats.wars} war${stats.wars > 1 ? 's' : ''}`);
  if (stats.demons)    parts.push(`${stats.demons} Heavenly Demon${stats.demons > 1 ? 's' : ''}`);
  if (stats.foundings) parts.push(`${stats.foundings} house${stats.foundings > 1 ? 's' : ''} founded`);
  if (stats.falls)     parts.push(`${stats.falls} fallen`);
  if (stats.tourneys)  parts.push(`${stats.tourneys} grand tournament${stats.tourneys > 1 ? 's' : ''}`);
  if (stats.assassins) parts.push(`${stats.assassins} struck from the shadows`);
  if (stats.relics)    parts.push(`${stats.relics} legend${stats.relics > 1 ? 's' : ''} of steel`);
  if (stats.ascends)   parts.push(`${stats.ascends} reached the higher realms`);
  if (!parts.length)   parts.push("little of note the brush chose to keep");
  return parts.join(" · ");
}

const CLASS_BUCKET = {
  "c-war": "wars", "c-threat": "demons", "c-found": "foundings", "c-fall": "falls",
  "c-tourney": "tourneys", "c-assassin": "assassins", "c-relic": "relics", "c-break": "ascends"
};

/*
  Group every log entry strictly before `cutoffYear` into era blocks.
  Returns { eras: [{from, to, title, kr, summary, highlights, firstId}], rest }
  where `rest` is the entries at/after cutoffYear (rendered in full).
*/
export function compressLog(log, cutoffYear) {
  const past = log.filter(e => e.year < cutoffYear);
  const rest = log.filter(e => e.year >= cutoffYear);
  if (!past.length) return { eras: [], rest };

  const eras = [];
  let cur = null;
  let idx = 0;

  const close = () => { if (cur) { cur.title = titleFor(cur.stats, idx)[0]; cur.kr = titleFor(cur.stats, idx)[1]; cur.summary = summarize(cur.stats); eras.push(cur); idx++; cur = null; } };

  for (const e of past) {
    if (!cur) {
      cur = { from: e.year, to: e.year, firstId: e.id, stats: {}, highlights: [] };
    }
    cur.to = e.year;
    const bucket = CLASS_BUCKET[e.cls];
    if (bucket) cur.stats[bucket] = (cur.stats[bucket] || 0) + 1;
    /* keep a few epic moments as clickable highlights */
    if (e.level === "epic" && cur.highlights.length < 3) cur.highlights.push(e.id);

    /* close the era on an epoch marker (a demon rises/falls) or when it grows too long */
    const isEpoch = e.cls === "c-threat" || (e.cls === "c-peace" && e.level === "major");
    if (isEpoch || (cur.to - cur.from) >= MAX_SPAN) close();
  }
  close();
  /* normalize stat keys so summarize() can read them */
  for (const er of eras) {
    er.stats = Object.assign(
      { wars:0, demons:0, foundings:0, falls:0, tourneys:0, assassins:0, relics:0, ascends:0 },
      er.stats);
  }
  return { eras, rest };
}
