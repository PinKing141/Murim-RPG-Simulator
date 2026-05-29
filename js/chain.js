import { evById } from './chronicle.js';

const MAX_NODES = 14;

/*
  Walk the causal DAG outward from a focus event.
  - roots: every transitive cause (what led here), oldest first
  - consequences: every transitive effect (what flowed from it), oldest first
  Cycles can't occur (edges always point forward in time), but we guard
  with a visited set and a node cap so a dense hub stays readable.
*/
export function collectChain(focusId) {
  const focus = evById(focusId);
  if (!focus) return null;

  const walk = (startIds, dir) => {
    const found = new Map();
    const stack = [...startIds];
    while (stack.length && found.size < MAX_NODES) {
      const id = stack.pop();
      const ev = evById(id);
      if (!ev || found.has(id) || id === focusId) continue;
      found.set(id, ev);
      const next = dir === 'up' ? ev.causes : ev.effects;
      for (const nid of next) if (!found.has(nid)) stack.push(nid);
    }
    return [...found.values()].sort((a, b) => a.year - b.year || a.season - b.season || a.id - b.id);
  };

  return {
    focus,
    roots: walk(focus.causes, 'up'),
    consequences: walk(focus.effects, 'down')
  };
}

const SEASONS = ["Spring","Summer","Autumn","Winter"];

function row(ev, focusId, role) {
  const cls = ev.id === focusId ? 'chain-row chain-focus' : `chain-row ${ev.cls}`;
  const click = ev.id === focusId ? '' : ` data-eid="${ev.id}"`;
  return `<div class="${cls}"${click}>
    <span class="chain-when">Y${ev.year} <span class="chain-season">${SEASONS[ev.season]}</span></span>
    <span class="chain-text">${ev.html}</span>
  </div>`;
}

export function buildChainView(focusId) {
  const chain = collectChain(focusId);
  if (!chain) return `<div class="chain-empty">This event has faded from memory.</div>`;

  const { focus, roots, consequences } = chain;
  let h = '';

  if (roots.length) {
    h += `<div class="chain-sec">What led here · 원인</div>`;
    h += roots.map(e => row(e, focusId)).join('<div class="chain-link">↓</div>');
    h += `<div class="chain-link">↓</div>`;
  }

  h += `<div class="chain-sec chain-sec-focus">This moment</div>`;
  h += row(focus, focusId);

  if (consequences.length) {
    h += `<div class="chain-link">↓</div>`;
    h += `<div class="chain-sec">What flowed from it · 결과</div>`;
    h += consequences.map(e => row(e, focusId)).join('<div class="chain-link">↓</div>');
  }

  if (!roots.length && !consequences.length) {
    h += `<div class="chain-empty">This moment stands alone — no recorded cause, no traced consequence.</div>`;
  }

  return h;
}
