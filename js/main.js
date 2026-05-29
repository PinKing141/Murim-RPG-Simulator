import { tick } from './systems.js';
import { genesis } from './genesis.js';
import { renderLog, renderPanels, setAutoScroll } from './render.js';
import { setFollow, clearFollow } from './follow.js';
import { buildChainView } from './chain.js';
import { buildTreeView } from './tree.js';
import { loc } from './i18n.js';
import { STATE, figById } from './state.js';
import { REALMS, REALM_KR } from './data.js';
import { cap } from './rng.js';
import { livePlayer, endPlayer, playerFig, maybeDecision, applyChoice, playerSummary, PLAYER } from './play.js';

const $ = id => document.getElementById(id);

let lastChainId = null;

/* ---- chain reader ---- */
function openChain(eid) {
  lastChainId = +eid;
  $("chain-body").innerHTML = loc(buildChainView(+eid));
  $("chain-overlay").style.display = 'flex';
}
function closeChain() { $("chain-overlay").style.display = 'none'; }

/* ---- tree viewer ---- */
let lastTreeId = null;
function openTree(figId) {
  lastTreeId = +figId;
  $("tree-body").innerHTML = loc(buildTreeView(+figId));
  $("tree-overlay").style.display = 'flex';
}
function closeTree() { $("tree-overlay").style.display = 'none'; }

let timer = null, speed = 420, paused = false;
let pendingDecision = null;   // set while a player choice is on screen — the world holds its breath
let lifeSummaryShown = false; // set while the end-of-life reckoning is up

function loop() {
  if (!paused && !pendingDecision && !lifeSummaryShown) {
    tick();
    if (PLAYER.active) {
      const f = playerFig();
      if (!f || !f.alive) { showSummary(); }    // life ended — freezes via lifeSummaryShown
      else if (STATE.season === 0) {            // a year has turned — fate may knock
        const d = maybeDecision();
        if (d) presentDecision(d);
      }
    }
    renderLog(); renderPanels(); updateHud();
  }
  timer = setTimeout(loop, speed);
}

function start(seed) {
  if (timer) clearTimeout(timer);
  clearFollow(); endPlayer(); pendingDecision = null;
  $("play-overlay").style.display = 'none';
  genesis(seed);
  renderLog(); renderPanels(); updateHud();
  loop();
}

/* ---- living a life ---- */
function startLife() {
  if (PLAYER.active && playerFig() && playerFig().alive) return;   // already living
  $("play-overlay").style.display = 'none';
  pendingDecision = null; lifeSummaryShown = false;
  const f = livePlayer();
  setFollow('fig', f.id);
  renderLog(); renderPanels(); updateHud();
}

function updateHud() {
  const hud = $("player-hud");
  const f = playerFig();
  if (!PLAYER.active || !f) { hud.style.display = 'none'; return; }
  hud.style.display = 'flex';
  const name = f.byeolho && f.namedAt != null ? cap(f.byeolho.en) : f.name;
  const realm = STATE.showHangul ? `${REALMS[f.realm]} (${REALM_KR[f.realm]})` : REALMS[f.realm];
  const goal = PLAYER.goal ? PLAYER.goal.text : "—";
  hud.innerHTML = loc(
    `<span class="ph-tag">YOU</span>` +
    `<span class="ph-name">${name}</span>` +
    `<span class="ph-stat">${realm} · Age ${f.age}${f.alive ? '' : ' · 卒'}</span>` +
    `<span class="ph-goal">Ambition: ${goal}</span>`
  );
}

/* ---- decision modal ---- */
function presentDecision(d) {
  pendingDecision = d;
  const opts = d.options.map((o, i) =>
    `<button class="play-opt" data-idx="${i}"><span class="po-label">${o.label}</span><span class="po-desc">${o.desc}</span></button>`
  ).join('');
  $("play-body").innerHTML = loc(
    `<div class="play-kind">A Crossroads</div>` +
    `<div class="play-title">${d.title}</div>` +
    `<div class="play-text">${d.text}</div>` +
    `<div class="play-opts">${opts}</div>`
  );
  $("play-overlay").style.display = 'flex';
}
function resolveDecision(idx) {
  if (!pendingDecision) return;
  applyChoice(pendingDecision, idx);
  pendingDecision = null;
  $("play-overlay").style.display = 'none';
  renderLog(); renderPanels(); updateHud();
  const f = playerFig();
  if (PLAYER.active && (!f || !f.alive)) showSummary();
}

/* ---- life summary ---- */
function showSummary() {
  lifeSummaryShown = true;
  const s = playerSummary();
  $("play-body").innerHTML = loc(
    `<div class="play-kind">A Life Concluded</div>` +
    `<div class="play-title" style="color:${s.alignColor}">${s.name}</div>` +
    `<div class="play-summary">${s.lines.map(l => `<div>${l}</div>`).join('')}</div>` +
    `<div class="play-score">Legend Score <b>${s.score}</b></div>` +
    `<div class="play-opts">` +
      `<button class="play-opt" data-life="again"><span class="po-label">Live Another Life</span><span class="po-desc">Be born anew into this same age.</span></button>` +
      `<button class="play-opt" data-life="watch"><span class="po-label">Return to Watching</span><span class="po-desc">Let the chronicle run on without you.</span></button>` +
    `</div>`
  );
  $("play-overlay").style.display = 'flex';
}

/* ---- playback controls ---- */
$("pause").addEventListener("click", e => {
  paused = !paused;
  e.target.textContent = paused ? "▶ Resume" : "❚❚ Pause";
});
$("reseed").addEventListener("click", () => start((Math.random() * 0xffffffff) >>> 0));
$("live").addEventListener("click", startLife);

/* ---- player decision / summary modal ---- */
$("play-body").addEventListener("click", e => {
  const opt = e.target.closest(".play-opt");
  if (!opt) return;
  if (opt.dataset.life === "again") {
    lifeSummaryShown = false; endPlayer();
    $("play-overlay").style.display = 'none';
    startLife();
    return;
  }
  if (opt.dataset.life === "watch") {
    lifeSummaryShown = false; endPlayer();
    $("play-overlay").style.display = 'none';
    renderLog(); renderPanels(); updateHud();
    return;
  }
  if (opt.dataset.idx != null) resolveDecision(+opt.dataset.idx);
});

$("hangul").addEventListener("click", e => {
  STATE.showHangul = !STATE.showHangul;
  e.target.classList.toggle("on", STATE.showHangul);
  e.target.textContent = STATE.showHangul ? "한 Hangul: On" : "한 Hangul: Off";
  document.body.classList.toggle("no-hangul", !STATE.showHangul);
  STATE.dirtyLog = true; STATE.dirtyPanels = true;
  renderLog(); renderPanels(); updateHud();
  /* refresh whichever reader overlay is open so it re-localises too */
  if ($("chain-overlay").style.display === 'flex' && lastChainId != null) openChain(lastChainId);
  if ($("tree-overlay").style.display === 'flex' && lastTreeId != null) openTree(lastTreeId);
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
