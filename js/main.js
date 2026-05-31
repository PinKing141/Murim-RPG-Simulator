import { tick } from './systems.js';
import { genesis } from './genesis.js';
import { renderLog, renderPanels, setAutoScroll } from './render.js';
import { setFollow, clearFollow } from './follow.js';
import { buildChainView } from './chain.js';
import { buildTreeView } from './tree.js';
import { loc } from './i18n.js';
import { STATE } from './state.js';

const $ = id => document.getElementById(id);

let lastChainId = null;

/* ---- chain reader ---- */
function openChain(eid) {
  lastChainId = +eid;
  $("chain-body").innerHTML = loc(buildChainView(+eid));
  $("chain-overlay").style.display = 'flex';
}
function closeChain() { $("chain-overlay").style.display = 'none'; }

/* ---- history explorer ---- */
let lastTreeId = null, lastTreeMode = 'blood';
function openTree(figId, mode = lastTreeMode) {
  lastTreeId = +figId; lastTreeMode = mode;
  $("tree-body").innerHTML = loc(buildTreeView(+figId, mode));
  $("tree-overlay").style.display = 'flex';
  $("tree-body").scrollTop = 0;
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
$("hangul").addEventListener("click", e => {
  STATE.showHangul = !STATE.showHangul;
  e.target.classList.toggle("on", STATE.showHangul);
  e.target.textContent = STATE.showHangul ? "한 Hangul: On" : "한 Hangul: Off";
  document.body.classList.toggle("no-hangul", !STATE.showHangul);
  STATE.dirtyLog = true; STATE.dirtyPanels = true;
  renderLog(); renderPanels();
  /* refresh whichever reader overlay is open so it re-localises too */
  if ($("chain-overlay").style.display === 'flex' && lastChainId != null) openChain(lastChainId);
  if ($("tree-overlay").style.display === 'flex' && lastTreeId != null) openTree(lastTreeId, lastTreeMode);
});
$("eras").addEventListener("click", e => {
  STATE.eraCompress = !STATE.eraCompress;
  e.target.classList.toggle("on", STATE.eraCompress);
  e.target.textContent = STATE.eraCompress ? "📜 Eras: On" : "📜 Eras: Off";
  STATE.dirtyLog = true;
  renderLog();
});
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

/* ---- explorer: navigate within the history explorer ---- */
$("tree-body").addEventListener("click", e => {
  const modeBtn = e.target.closest("[data-mode]");
  if (modeBtn) { openTree(+modeBtn.dataset.fig, modeBtn.dataset.mode); return; }
  const chainBtn = e.target.closest("[data-chain]");
  if (chainBtn) { openChain(+chainBtn.dataset.chain); return; }
  const explore = e.target.closest("[data-explore]");
  if (explore) { openTree(+explore.dataset.explore); return; }
  const treeBtn = e.target.closest("[data-open-tree]");
  if (treeBtn) { openTree(+treeBtn.dataset.openTree); return; }
  const fs = e.target.closest("[data-follow-sect]");
  if (fs) { closeTree(); setFollow('sect', +fs.dataset.followSect); renderLog(); renderPanels(); return; }
  const ff = e.target.closest("[data-follow-fig]");
  if (ff) { closeTree(); setFollow('fig', +ff.dataset.followFig); renderLog(); renderPanels(); }
});
$("tree-close").addEventListener("click", closeTree);
$("tree-overlay").addEventListener("click", e => {
  if (e.target === $("tree-overlay")) closeTree();
});

/* ---- chain: click an event in the chronicle, or its inline cause hint ---- */
$("chron").addEventListener("click", e => {
  const hlEl = e.target.closest(".era-hl[data-eid]");
  if (hlEl) { openChain(+hlEl.dataset.eid); return; }
  const causeEl = e.target.closest(".entry-cause[data-eid]");
  if (causeEl) { openChain(+causeEl.dataset.eid); return; }
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
