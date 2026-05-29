import { tick } from './systems.js';
import { genesis } from './genesis.js';
import { renderLog, renderPanels, setAutoScroll } from './render.js';
import { setFollow, clearFollow } from './follow.js';
import { buildChainView } from './chain.js';
import { buildTreeView } from './tree.js';

const $ = id => document.getElementById(id);

/* ---- chain reader ---- */
function openChain(eid) {
  $("chain-body").innerHTML = buildChainView(+eid);
  $("chain-overlay").style.display = 'flex';
}
function closeChain() { $("chain-overlay").style.display = 'none'; }

/* ---- tree viewer ---- */
function openTree(figId) {
  $("tree-body").innerHTML = buildTreeView(+figId);
  $("tree-overlay").style.display = 'flex';
}
function closeTree() { $("tree-overlay").style.display = 'none'; }

let timer = null, speed = 420, paused = false;

function loop() {
  if (!paused) { tick(); renderLog(); renderPanels(); }
  timer = setTimeout(loop, speed);
}

function start(seed) {
  if (timer) clearTimeout(timer);
  clearFollow();
  genesis(seed);
  renderLog(); renderPanels();
  loop();
}

/* ---- playback controls ---- */
$("pause").addEventListener("click", e => {
  paused = !paused;
  e.target.textContent = paused ? "▶ Resume" : "❚❚ Pause";
});
$("reseed").addEventListener("click", () => start((Math.random() * 0xffffffff) >>> 0));
$("speed").addEventListener("click", e => {
  if (e.target.dataset.s) {
    speed = +e.target.dataset.s;
    [...$("speed").children].forEach(b => b.classList.toggle("on", b === e.target));
  }
});
$("chron").addEventListener("scroll", e => {
  const box = e.target;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  setAutoScroll(atBottom);
  $("fnote").textContent = atBottom
    ? "The brush records all. Scroll up to read the past."
    : "Reading the past — scroll to the bottom to follow the present.";
});

/* ---- follow: clear button ---- */
$("follow-clear").addEventListener("click", () => {
  clearFollow();
  renderLog(); renderPanels();
});

/* ---- follow: click a power bloc ---- */
$("bloclist").addEventListener("click", e => {
  const card = e.target.closest(".bloc-card");
  if (card && card.dataset.id) {
    setFollow('bloc', +card.dataset.id);
    renderLog(); renderPanels();
  }
});

/* ---- follow: click a sect card ---- */
$("sectlist").addEventListener("click", e => {
  const card = e.target.closest(".sect");
  if (card && card.dataset.id) {
    setFollow('sect', +card.dataset.id);
    renderLog(); renderPanels();
  }
});

/* ---- follow: click a figure card ---- */
$("figlist").addEventListener("click", e => {
  const card = e.target.closest(".figcard");
  if (card && card.dataset.id) {
    setFollow('fig', +card.dataset.id);
    renderLog(); renderPanels();
  }
});

/* ---- follow + chain: links inside dossier ---- */
$("dossier-wrap").addEventListener("click", e => {
  const chainBtn = e.target.closest("[data-chain]");
  if (chainBtn) { openChain(chainBtn.dataset.chain); return; }
  const treeBtn = e.target.closest("[data-open-tree]");
  if (treeBtn) { openTree(treeBtn.dataset.openTree); return; }
  const ff = e.target.closest("[data-follow-fig]");
  if (ff) { setFollow('fig', +ff.dataset.followFig); renderLog(); renderPanels(); return; }
  const fs = e.target.closest("[data-follow-sect]");
  if (fs) { setFollow('sect', +fs.dataset.followSect); renderLog(); renderPanels(); return; }
  const fb = e.target.closest("[data-follow-bloc]");
  if (fb) { setFollow('bloc', +fb.dataset.followBloc); renderLog(); renderPanels(); }
});

/* ---- tree: navigate within the tree ---- */
$("tree-body").addEventListener("click", e => {
  const treeBtn = e.target.closest("[data-open-tree]");
  if (treeBtn) { openTree(treeBtn.dataset.openTree); return; }
  const ff = e.target.closest("[data-follow-fig]");
  if (ff) { closeTree(); setFollow('fig', +ff.dataset.followFig); renderLog(); renderPanels(); }
});
$("tree-close").addEventListener("click", closeTree);
$("tree-overlay").addEventListener("click", e => {
  if (e.target === $("tree-overlay")) closeTree();
});

/* ---- chain: click an event in the chronicle ---- */
$("chron").addEventListener("click", e => {
  const entry = e.target.closest(".entry[data-eid]");
  if (entry) openChain(entry.dataset.eid);
});

/* ---- chain: navigate within the chain, and close ---- */
$("chain-body").addEventListener("click", e => {
  const row = e.target.closest("[data-eid]");
  if (row) openChain(row.dataset.eid);
});
$("chain-close").addEventListener("click", closeChain);
$("chain-overlay").addEventListener("click", e => {
  if (e.target === $("chain-overlay")) closeChain();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeChain(); closeTree(); }
});

start((Math.random() * 0xffffffff) >>> 0);
