import { tick } from './systems.js';
import { genesis } from './genesis.js';
import { renderLog, renderPanels, setAutoScroll } from './render.js';
import { setFollow, clearFollow } from './follow.js';

const $ = id => document.getElementById(id);

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

/* ---- follow: links inside dossier ---- */
$("dossier-wrap").addEventListener("click", e => {
  const ff = e.target.closest("[data-follow-fig]");
  if (ff) { setFollow('fig', +ff.dataset.followFig); renderLog(); renderPanels(); return; }
  const fs = e.target.closest("[data-follow-sect]");
  if (fs) { setFollow('sect', +fs.dataset.followSect); renderLog(); renderPanels(); }
});

start((Math.random() * 0xffffffff) >>> 0);
