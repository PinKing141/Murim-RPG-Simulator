/*
  Central SVG icon library. All inline ornaments and UI affordances in the
  app pull from here, so the typographic palette stays cohesive and no emoji
  glyphs leak through (different OS fonts render emoji wildly differently,
  which clashes with the ink-wash aesthetic).

  Usage:
    icon('chain')                — default 14×14, currentColor
    icon('scroll', { size: 16 }) — sized
    icon('pause',  { cls: 'sp-ico' }) — extra class
*/

const PATHS = {
  /* chain links — used everywhere we trace cause & consequence */
  chain: `<path d="M5.6 6.4 L4 8 a2.2 2.2 0 0 0 3.1 3.1 L8.5 9.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M10.4 9.6 L12 8 a2.2 2.2 0 0 0 -3.1 -3.1 L7.5 6.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,

  /* scroll — chronicle, eras, history explorer entry */
  scroll: `<path d="M3.5 3.5 h7 a1.5 1.5 0 0 1 1.5 1.5 v8 a1.5 1.5 0 0 1 -1.5 1.5 h-7 a1.5 1.5 0 0 1 -1.5 -1.5 v-8 a1.5 1.5 0 0 1 1.5 -1.5z" fill="none" stroke="currentColor" stroke-width="1.2"/>
           <path d="M5 6 h5 M5 8.5 h5 M5 11 h3" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>`,

  /* crossed swords — succession crisis, head clash, martial lineage */
  swords: `<path d="M3 3 L9 9 M3 5 L4 4 M5 3 L4 4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
           <path d="M13 3 L7 9 M13 5 L12 4 M11 3 L12 4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
           <path d="M6.5 10.5 L9.5 13.5 M6 11 L4 13 M10 11 L12 13" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,

  /* playback */
  pause: `<rect x="4.5" y="3" width="2.5" height="10" fill="currentColor"/>
          <rect x="9"   y="3" width="2.5" height="10" fill="currentColor"/>`,
  play:  `<path d="M4 3 L13 8 L4 13 Z" fill="currentColor"/>`,

  /* circle arrow — new age / reseed */
  restart: `<path d="M13 8 a5 5 0 1 1 -1.5 -3.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            <path d="M13 3 V6 H10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`,

  /* states */
  dotFilled: `<circle cx="8" cy="8" r="3" fill="currentColor"/>`,
  starBurst: `<path d="M8 2 L9 7 L14 8 L9 9 L8 14 L7 9 L2 8 L7 7 Z" fill="currentColor"/>`,

  /* affinity arrows */
  arrowUp:   `<path d="M8 13 V3 M4 7 L8 3 L12 7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  arrowDown: `<path d="M8 3 V13 M4 9 L8 13 L12 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  arrowH:    `<path d="M3 8 H13 M5 5 L2 8 L5 11 M11 5 L14 8 L11 11" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  arrowBend: `<path d="M3 3 V8 a2 2 0 0 0 2 2 H13 M10 7 L13 10 L10 13" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  arrowDownThin: `<path d="M8 2 V14 M4 10 L8 14 L12 10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`,

  /* taegeuk — bloodline taint */
  taegeuk: `<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.1"/>
            <path d="M8 2 a3 3 0 0 0 0 6 a3 3 0 0 1 0 6 a6 6 0 0 1 0 -12 z" fill="currentColor" opacity="0.85"/>
            <circle cx="8" cy="5" r="0.9" fill="var(--paper)"/>
            <circle cx="8" cy="11" r="0.9" fill="currentColor"/>`,

  /* close × */
  close: `<path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,

  /* bloodline (ring-link), used as graph indicator in tree.js mode bar */
  ring: `<circle cx="6" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
         <circle cx="10" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>`,

  /* spouse / marriage */
  marriage: `<circle cx="6" cy="8" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
             <circle cx="10" cy="8" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>`,

  /* follow eye */
  eye: `<path d="M2 8 C 4 4 12 4 14 8 C 12 12 4 12 2 8 Z" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="8" cy="8" r="2" fill="currentColor"/>`,
  eyeOff: `<path d="M2 8 C 4 4 12 4 14 8 C 12 12 4 12 2 8 Z" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.55"/>
           <path d="M3 3 L13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,

  /* simple identity icons for headers */
  user:   `<circle cx="8" cy="6" r="2.6" fill="none" stroke="currentColor" stroke-width="1.2"/>
           <path d="M3 14 C 3 10.5 13 10.5 13 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,
  temple: `<path d="M2 6 L8 2 L14 6 L13 6 L13 13 L3 13 L3 6 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
           <path d="M6 13 V9 H10 V13" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>`,
  banner: `<path d="M4 2 V14 M4 3 H13 L11 5.5 L13 8 H4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>`,

  /* persistence — save / load / export / import */
  save: `<path d="M3 3 h8 l2 2 v8 a0.5 0.5 0 0 1 -0.5 0.5 h-9 a0.5 0.5 0 0 1 -0.5 -0.5 v-9.5 a0.5 0.5 0 0 1 0.5 -0.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
         <path d="M5 3 v3 h5 v-3" fill="none" stroke="currentColor" stroke-width="1.1"/>
         <rect x="5.5" y="9" width="5" height="4" fill="none" stroke="currentColor" stroke-width="1"/>`,
  load: `<path d="M2 5 a1 1 0 0 1 1 -1 h3 l1.5 1.5 h4.5 a1 1 0 0 1 1 1 v5 a1 1 0 0 1 -1 1 h-9 a1 1 0 0 1 -1 -1 z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
         <path d="M8 11 V6.5 M5.8 8.2 L8 6 L10.2 8.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`,
  download: `<path d="M8 2 V10 M5 7.5 L8 10.5 L11 7.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
             <path d="M3 12.5 H13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  upload: `<path d="M8 11 V3 M5 6 L8 3 L11 6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M3 12.5 H13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  check: `<path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
};

export function icon(name, opts = {}) {
  const path = PATHS[name];
  if (!path) return '';
  const size = opts.size || 14;
  const cls = `ico ico-${name}${opts.cls ? ' ' + opts.cls : ''}`;
  return `<svg class="${cls}" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${path}</svg>`;
}
