import { tick } from './systems.js';
import { genesis } from './genesis.js';
import { renderLog, renderPanels, setAutoScroll } from './render.js';

const $ = id => document.getElementById(id);

let timer = null, speed = 420, paused = false;

function loop() {
  if (!paused) { tick(); renderLog(); renderPanels(); }
  timer = setTimeout(loop, speed);
}

function start(seed) {
  if (timer) clearTimeout(timer);
  genesis(seed);
  renderLog(); renderPanels();
  loop();
}

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

start((Math.random() * 0xffffffff) >>> 0);
