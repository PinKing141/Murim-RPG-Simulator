import { cap } from './rng.js';
import { ALIGN, REALM_KR } from './data.js';
import { figById } from './state.js';
import { bloodlineRoot, childrenOf, genDistance } from './bloodlines.js';

const MAX_GEN = 7;

function figLabel(f) {
  if (!f) return '?';
  const nm = f.byeolho && f.namedAt != null ? cap(f.byeolho.en) : f.name;
  return nm;
}

function taintBadge(f) {
  if (!f.bloodlineTaint) return '';
  const lvl = f.bloodlineTaint >= 80 ? 'high' : f.bloodlineTaint >= 40 ? 'mid' : 'low';
  return `<span class="tree-taint tree-taint-${lvl}" title="Bloodline taint ${f.bloodlineTaint}">☯</span>`;
}

function realmTag(f) {
  const kr = REALM_KR[f.realm] || '';
  return kr ? `<span class="tree-realm">${kr}</span>` : '';
}

/* recursively render a subtree rooted at `f`, stopping at MAX_GEN depth */
function renderNode(f, depth, rootId) {
  if (!f || depth > MAX_GEN) return '';
  const al = ALIGN[f.align];
  const isRoot = f.id === rootId;
  const isDemon = f.isThreat || f.bloodlineTaint >= 90;
  const children = childrenOf(f);

  let cls = 'tree-node';
  if (isRoot) cls += ' tree-root';
  if (isDemon) cls += ' tree-demon';
  if (f.awakened) cls += ' tree-awakened';
  if (!f.alive) cls += ' tree-dead';

  let artTag = '';
  if (f.art) artTag = `<span class="tree-art" title="${f.art.name}">${f.art.kr}</span>`;

  let spouseTag = '';
  if (f.spouse) {
    const sp = figById(f.spouse);
    if (sp) spouseTag = `<span class="tree-spouse" data-follow-fig="${sp.id}" title="${figLabel(sp)}">⚭ ${figLabel(sp)}</span>`;
  }

  const nodeHtml = `
<div class="${cls}" style="--nc:${al.c}" data-follow-fig="${f.id}">
  <div class="tree-card">
    <span class="tree-name">${figLabel(f)}</span>
    ${taintBadge(f)}${realmTag(f)}${artTag}
    <span class="tree-dates">${f.born}${!f.alive && f.diedYear ? `–${f.diedYear}` : ''}</span>
  </div>
  ${spouseTag}
</div>`;

  if (!children.length) return nodeHtml;

  const childrenHtml = children
    .map(c => renderNode(c, depth + 1, rootId))
    .join('');

  return `<div class="tree-branch">
  ${nodeHtml}
  <div class="tree-children">${childrenHtml}</div>
</div>`;
}

export function buildTreeView(figId) {
  const f = figById(figId);
  if (!f) return '<div class="tree-empty">Figure not found.</div>';

  const root = bloodlineRoot(f);
  const dist = genDistance(f, root.id);

  let header = `<div class="tree-header">`;
  header += `<div class="tree-title">Bloodline of ${figLabel(root)}</div>`;
  if (dist > 0) header += `<div class="tree-subtitle">${figLabel(f)} · ${dist} generation${dist !== 1 ? 's' : ''} removed</div>`;
  header += `</div>`;

  const body = renderNode(root, 0, root.id);

  return header + `<div class="tree-wrap">${body}</div>`;
}
