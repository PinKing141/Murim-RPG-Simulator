import { STATE } from './state.js';

/*
  Hangul toggle. The chronicle is written bilingually — English with the
  original Korean (and the occasional decorative CJK glyph) alongside it,
  usually as a parenthetical: "the Murim Alliance (무림맹)", "Form Realm (화경)".

  When STATE.showHangul is false, loc() strips the native script from any
  rendered HTML fragment and tidies up the punctuation it leaves behind, so a
  reader who can't parse Hangul sees clean English. It runs on already-built
  HTML strings at render time; ids and class names are ASCII, so attributes
  are never touched.
*/

const KR  = '\\u3130-\\u318F\\uAC00-\\uD7A3';   // Hangul Jamo + syllables
const CJK = '\\u4E00-\\u9FFF\\u3400-\\u4DBF';   // CJK ideographs (盟 敎 正 魔 …)
const NATIVE = `${KR}${CJK}`;

/* " (무림맹)" / " · 화경" parentheticals and middot-led native tails */
const PARENS = new RegExp(`\\s*[·]?\\s*\\(\\s*[${NATIVE}·\\s]+\\)`, 'g');
const ALL    = new RegExp(`[${NATIVE}]+`, 'g');

export function loc(html) {
  if (STATE.showHangul || html == null) return html;
  return String(html)
    .replace(PARENS, '')          // drop bilingual parentheticals wholesale
    .replace(ALL, '')             // strip any native script left inline
    .replace(/>\s*·\s*/g, '>')    // dangling middot just inside a tag
    .replace(/\s*·\s*(?=<|$)/g, '')   // dangling middot before a tag / end
    .replace(/·\s*·/g, '·')           // collapsed double middots
    .replace(/\(\s*\)/g, '')          // emptied parentheses
    .replace(/\s+([.,;)])/g, '$1')    // space before punctuation
    .replace(/\s{2,}/g, ' ')
    .trim();
}
