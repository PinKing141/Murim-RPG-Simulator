import { tick } from './systems.js';
import { genesis } from './genesis.js';
import { renderLog, renderPanels, setAutoScroll } from './render.js';
import { FOLLOW, setFollow, clearFollow, buildFigDossier, buildSectDossier, buildBlocDossier } from './follow.js';
import { buildChainView } from './chain.js';
import { buildTreeView } from './tree.js';
import { loc } from './i18n.js';
import { STATE, figById } from './state.js';
import { blocById } from './factions.js';
import { icon } from './icons.js';
import {
  saveToStorage, loadFromStorage, hasStoredSave, storedSaveMeta,
  exportToFile, importFromFile, saveSettings, loadSettings
} from './persist.js';

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

/* ---- profile modal: the character / sect / bloc page ----
   Replaces the old auto-follow-on-click behaviour. A click anywhere in a card
   opens this modal; the Follow button inside is the only way to start
   filtering the chronicle. */
let lastProfile = null; // { kind: 'fig'|'sect'|'bloc', id }

function openProfile(kind, id) {
  id = +id;
  let entity, html, headLabel, headIco;
  if (kind === 'fig') {
    entity = figById(id);
    if (!entity) return;
    html = buildFigDossier(entity);
    headLabel = 'Character'; headIco = icon('user', { size: 16 });
  } else if (kind === 'sect') {
    entity = STATE.sects.find(s => s.id === id);
    if (!entity) return;
    html = buildSectDossier(entity);
    headLabel = 'Sect'; headIco = icon('temple', { size: 16 });
  } else if (kind === 'bloc') {
    entity = blocById(id);
    if (!entity) return;
    html = buildBlocDossier(entity);
    headLabel = 'Power Bloc'; headIco = icon('banner', { size: 16 });
  } else return;

  lastProfile = { kind, id };
  $("profile-head-icon").innerHTML = `${headIco}<span>${headLabel}</span>`;
  $("profile-body").innerHTML = loc(html);
  $("profile-body").scrollTop = 0;
  syncFollowBtn();
  $("profile-overlay").style.display = 'flex';
}
function closeProfile() {
  $("profile-overlay").style.display = 'none';
  lastProfile = null;
}

function syncFollowBtn() {
  if (!lastProfile) return;
  const btn = $("profile-follow");
  const label = btn.querySelector('.pf-btn-label');
  const isFollowing = FOLLOW.kind === lastProfile.kind && FOLLOW.id === lastProfile.id;
  btn.classList.toggle('is-following', isFollowing);
  label.textContent = isFollowing ? 'Unfollow' : 'Follow';
}

/* ---- playback ---- */
let timer = null, speed = 600, paused = false;

function loop() {
  if (!paused) { tick(); renderLog(); renderPanels(); }
  timer = setTimeout(loop, speed);
}

function start(seed) {
  if (timer) clearTimeout(timer);
  clearFollow();
  closeProfile(); closeChain(); closeTree();
  genesis(seed);
  renderLog(); renderPanels();
  loop();
}

/* resume a saved game: world state is already restored by persist.restore(),
   we just need to (re)start the render loop and reset the UI */
function resume() {
  if (timer) clearTimeout(timer);
  clearFollow();
  closeProfile(); closeChain(); closeTree();
  renderLog(); renderPanels();
  loop();
}

/* ---- transient toast for save/load/export confirmations ---- */
let toastTimer = null;
function toast(msg, kind) {
  const t = $("toast");
  if (!t) return;
  t.className = 'toast' + (kind === 'err' ? ' toast-err' : '');
  t.innerHTML = (kind === 'err' ? '' : `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`)
    + `<span>${msg}</span>`;
  t.style.display = 'flex';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.add('toast-fade');
    toastTimer = setTimeout(() => { t.style.display = 'none'; t.classList.remove('toast-fade'); }, 350);
  }, 2200);
}

function flashBtn(id, ok) {
  const b = $(id); if (!b) return;
  const cls = ok ? 'flash-ok' : 'flash-err';
  b.classList.add(cls);
  setTimeout(() => b.classList.remove(cls), 900);
}

/* pause / play — single button toggle with SVG icons */
const PAUSE_SVG = `<svg class="ico ico-pause" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
  <rect x="4.5" y="3" width="2.5" height="10" fill="currentColor"/>
  <rect x="9"   y="3" width="2.5" height="10" fill="currentColor"/>
</svg>`;
const PLAY_SVG = `<svg class="ico ico-play" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
  <path d="M4 3 L13 8 L4 13 Z" fill="currentColor"/>
</svg>`;

$("pause").addEventListener("click", () => {
  paused = !paused;
  const btn = $("pause");
  btn.innerHTML = paused ? PLAY_SVG : PAUSE_SVG;
  btn.title = paused ? "Resume" : "Pause";
  btn.setAttribute('aria-label', paused ? "Resume" : "Pause");
  btn.classList.toggle('is-paused', paused);
});

$("reseed").addEventListener("click", () => {
  start((Math.random() * 0xffffffff) >>> 0);
  /* persist the freshly-seeded world so a refresh within the autosave window
     resumes the new age, not the abandoned one */
  saveToStorage();
});

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
  if ($("profile-overlay").style.display === 'flex' && lastProfile) openProfile(lastProfile.kind, lastProfile.id);
  persistSettings();
});

$("eras").addEventListener("click", e => {
  STATE.eraCompress = !STATE.eraCompress;
  const btn = $("eras");
  btn.classList.toggle("on", STATE.eraCompress);
  const lbl = btn.querySelector('.ctl-label');
  if (lbl) lbl.textContent = STATE.eraCompress ? "Eras: On" : "Eras: Off";
  STATE.dirtyLog = true;
  renderLog();
  persistSettings();
});

$("speed").addEventListener("click", e => {
  const btn = e.target.closest('button[data-s]');
  if (!btn) return;
  speed = +btn.dataset.s;
  [...$("speed").children].forEach(b => b.classList.toggle("on", b === btn));
  persistSettings();
});

/* ---- archive: save / load / export / import ---- */
function persistSettings() {
  saveSettings({
    speed,
    showHangul: STATE.showHangul,
    eraCompress: STATE.eraCompress
  });
}

$("save").addEventListener("click", () => {
  const ok = saveToStorage();
  flashBtn('save', ok);
  toast(ok ? `Chronicle saved · Year ${STATE.year}` : 'Save failed', ok ? 'ok' : 'err');
});

$("load").addEventListener("click", () => {
  if (!hasStoredSave()) { toast('No saved chronicle in this browser', 'err'); flashBtn('load', false); return; }
  const save = loadFromStorage();
  if (save) {
    resume();
    flashBtn('load', true);
    toast(`Chronicle restored · Year ${STATE.year}`);
  } else {
    flashBtn('load', false);
    toast('The saved chronicle is unreadable', 'err');
  }
});

$("export").addEventListener("click", () => {
  try { exportToFile(); flashBtn('export', true); toast(`Chronicle exported · Year ${STATE.year}`); }
  catch (e) { flashBtn('export', false); toast('Export failed', 'err'); }
});

$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    await importFromFile(file);
    resume();
    flashBtn('import', true);
    toast(`Chronicle imported · Year ${STATE.year}`);
  } catch (err) {
    flashBtn('import', false);
    toast('Could not read that chronicle: ' + (err.message || 'invalid file'), 'err');
  } finally {
    e.target.value = ''; // allow re-importing the same file
  }
});

$("chron").addEventListener("scroll", e => {
  const box = e.target;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  setAutoScroll(atBottom);
  $("fnote").lastChild.textContent = atBottom
    ? " The brush records all. Scroll up to read the past."
    : " Reading the past — scroll to the bottom to follow the present.";
});

/* ---- follow banner: clear button ---- */
$("follow-clear").addEventListener("click", () => {
  clearFollow();
  renderLog(); renderPanels();
  syncFollowBtn();
});

/* ---- panel cards now OPEN PROFILES (no longer auto-follow) ---- */
$("bloclist").addEventListener("click", e => {
  const card = e.target.closest(".bloc-card");
  if (card && card.dataset.id) openProfile('bloc', +card.dataset.id);
});
$("sectlist").addEventListener("click", e => {
  const card = e.target.closest(".sect");
  if (card && card.dataset.id) openProfile('sect', +card.dataset.id);
});
$("figlist").addEventListener("click", e => {
  const card = e.target.closest(".figcard");
  if (card && card.dataset.id) openProfile('fig', +card.dataset.id);
});
/* the great-powers readout — clicking a power card also opens the sect profile */
$("right-panel").addEventListener("click", e => {
  const pwr = e.target.closest(".power-card[data-sect-id]");
  if (pwr) openProfile('sect', +pwr.dataset.sectId);
});

/* ---- profile modal interactions ---- */
$("profile-close").addEventListener("click", closeProfile);
$("profile-overlay").addEventListener("click", e => {
  if (e.target === $("profile-overlay")) closeProfile();
});
$("profile-follow").addEventListener("click", () => {
  if (!lastProfile) return;
  const isFollowing = FOLLOW.kind === lastProfile.kind && FOLLOW.id === lastProfile.id;
  if (isFollowing) clearFollow();
  else setFollow(lastProfile.kind, lastProfile.id);
  renderLog(); renderPanels();
  syncFollowBtn();
});

/* in-modal links: cause chains, history explorer, and pivoting to another
   character / sect / bloc profile (the dossier links are reused from the
   right-sidebar era, so we keep the data-attribute names) */
$("profile-body").addEventListener("click", e => {
  const chainBtn = e.target.closest("[data-chain]");
  if (chainBtn) { openChain(chainBtn.dataset.chain); return; }
  const treeBtn = e.target.closest("[data-open-tree]");
  if (treeBtn) { openTree(treeBtn.dataset.openTree); return; }
  const ff = e.target.closest("[data-follow-fig]");
  if (ff) { openProfile('fig', ff.dataset.followFig); return; }
  const fs = e.target.closest("[data-follow-sect]");
  if (fs) { openProfile('sect', fs.dataset.followSect); return; }
  const fb = e.target.closest("[data-follow-bloc]");
  if (fb) { openProfile('bloc', fb.dataset.followBloc); }
});

/* ---- history explorer navigation ---- */
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
  if (fs) { closeTree(); openProfile('sect', +fs.dataset.followSect); return; }
  const ff = e.target.closest("[data-follow-fig]");
  if (ff) { closeTree(); openProfile('fig', +ff.dataset.followFig); }
});
$("tree-close").addEventListener("click", closeTree);
$("tree-overlay").addEventListener("click", e => {
  if (e.target === $("tree-overlay")) closeTree();
});

/* ---- chronicle clicks open the chain reader ---- */
$("chron").addEventListener("click", e => {
  const hlEl = e.target.closest(".era-hl[data-eid]");
  if (hlEl) { openChain(+hlEl.dataset.eid); return; }
  const causeEl = e.target.closest(".entry-cause[data-eid]");
  if (causeEl) { openChain(+causeEl.dataset.eid); return; }
  const entry = e.target.closest(".entry[data-eid]");
  if (entry) openChain(entry.dataset.eid);
});

/* ---- chain navigation, close ---- */
$("chain-body").addEventListener("click", e => {
  const row = e.target.closest("[data-eid]");
  if (row) openChain(row.dataset.eid);
});
$("chain-close").addEventListener("click", closeChain);
$("chain-overlay").addEventListener("click", e => {
  if (e.target === $("chain-overlay")) closeChain();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeChain(); closeTree(); closeProfile(); }
  /* keyboard shortcuts for the archive: Ctrl/Cmd+S saves, Ctrl/Cmd+O loads */
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.shiftKey) {
    e.preventDefault();
    $("save").click();
  }
});

/* ---- boot: restore settings, then either resume the last save or start a new age ---- */

function applySettings(s) {
  if (!s) return;
  if (typeof s.speed === 'number') {
    const candidate = [...$("speed").children].find(b => +b.dataset.s === s.speed);
    if (candidate) {
      speed = s.speed;
      [...$("speed").children].forEach(b => b.classList.toggle("on", b === candidate));
    }
  }
  if (typeof s.showHangul === 'boolean' && s.showHangul !== STATE.showHangul) {
    STATE.showHangul = s.showHangul;
    const hb = $("hangul");
    hb.classList.toggle("on", STATE.showHangul);
    hb.textContent = STATE.showHangul ? "한 Hangul: On" : "한 Hangul: Off";
    document.body.classList.toggle("no-hangul", !STATE.showHangul);
  }
  if (typeof s.eraCompress === 'boolean' && s.eraCompress !== STATE.eraCompress) {
    STATE.eraCompress = s.eraCompress;
    const eb = $("eras");
    eb.classList.toggle("on", STATE.eraCompress);
    const lbl = eb.querySelector('.ctl-label');
    if (lbl) lbl.textContent = STATE.eraCompress ? "Eras: On" : "Eras: Off";
  }
}

applySettings(loadSettings());

/* if there's a save in storage, resume it; otherwise begin a fresh age */
const meta = storedSaveMeta();
if (meta && hasStoredSave() && loadFromStorage()) {
  resume();
  toast(`Resumed chronicle · Year ${STATE.year}`);
} else {
  start((Math.random() * 0xffffffff) >>> 0);
}

/* ---- autosave: every minute and on page hide, so a tab close doesn't kill the run ---- */
const AUTOSAVE_MS = 60 * 1000;
setInterval(() => { if (!paused) saveToStorage(); }, AUTOSAVE_MS);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveToStorage();
});
window.addEventListener('beforeunload', () => { saveToStorage(); });
