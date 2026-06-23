// main.js — UI 制御とアニメーション
import { MODES, PRESETS } from './constants.js';
import { phiFromDr, modeFromDr, qu, settlementPct } from './model.js';
import { drawScene } from './scene.js';
import { initPlot, updatePlot } from './plot.js';

// 各モードの代表的 Dr（荷重-沈下曲線の標準形を描くため固定）
const REP_DR = { general: 0.85, local: 0.50, punching: 0.20 };
const ALL = ['general', 'local', 'punching'];

const state = {
  view: 'explore', // 'explore' | 'compare'
  Dr: 0.85,
  t: 0,            // 載荷進行 0..1
  playing: false,
  lastTs: null,
};

const el = {};
function $(id) { return document.getElementById(id); }

function init() {
  ['view-explore', 'view-compare', 'dr', 'dr-out', 'mode-badge', 'qu-out',
   'play', 't', 'presets', 'single-wrap', 'compare-wrap', 'plot', 'dr-row',
   'canvas-single', 'canvas-general', 'canvas-local', 'canvas-punching']
    .forEach((id) => { el[id] = document.getElementById(id); });

  // プリセットボタン
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.textContent = p.label; b.className = 'preset';
    b.onclick = () => { state.Dr = p.Dr; el.dr.value = p.Dr; state.t = 0; el.t.value = 0; setPlaying(false); refresh(); };
    el.presets.appendChild(b);
  });

  el['view-explore'].onclick = () => setView('explore');
  el['view-compare'].onclick = () => setView('compare');
  el.dr.oninput = () => { state.Dr = +el.dr.value; refresh(); };
  el.t.oninput = () => { state.t = +el.t.value; setPlaying(false); refresh(); };
  el.play.onclick = () => setPlaying(!state.playing);

  initPlot(el.plot, ALL, REP_DR);
  setView('explore');
  window.addEventListener('resize', () => drawAll());
  requestAnimationFrame(loop);
}

function setView(v) {
  state.view = v;
  el['view-explore'].classList.toggle('active', v === 'explore');
  el['view-compare'].classList.toggle('active', v === 'compare');
  el['single-wrap'].style.display = v === 'explore' ? '' : 'none';
  el['compare-wrap'].style.display = v === 'compare' ? '' : 'none';
  el['dr-row'].style.display = v === 'explore' ? '' : 'none';
  refresh();
}

function setPlaying(p) {
  state.playing = p;
  el.play.textContent = p ? '⏸ 一時停止' : '▶ 載荷アニメーション';
  state.lastTs = null;
  if (p && state.t >= 1) state.t = 0;
}

function refresh() {
  el['dr-out'].textContent = state.Dr.toFixed(2);
  el.t.value = state.t;
  const mode = modeFromDr(state.Dr);
  const m = MODES[mode];
  el['mode-badge'].textContent = m.jp;
  el['mode-badge'].style.background = m.color;
  const q = qu(mode, state.Dr);
  const sNote = settlementPct(state.t).toFixed(1);
  el['qu-out'].innerHTML = q.defined
    ? `極限支持力 q<sub>u</sub> ≈ <b>${q.q.toFixed(0)}</b> kPa相当（明確なピーク）／ 現在 s/B=${sNote}%`
    : `明確なピークなし — 許容沈下で支持力を決定（s/B=10% で q≈${q.q.toFixed(0)} kPa相当）／ 現在 s/B=${sNote}%`;
  updatePlot(el.plot, ALL, REP_DR, state.t);
  drawAll();
}

function drawAll() {
  if (state.view === 'explore') {
    const mode = modeFromDr(state.Dr);
    drawScene(el['canvas-single'], mode, phiFromDr(state.Dr), state.t);
  } else {
    drawScene(el['canvas-general'], 'general', phiFromDr(REP_DR.general), state.t);
    drawScene(el['canvas-local'], 'local', phiFromDr(REP_DR.local), state.t);
    drawScene(el['canvas-punching'], 'punching', phiFromDr(REP_DR.punching), state.t);
  }
}

function loop(ts) {
  if (state.playing) {
    if (state.lastTs != null) {
      const dt = (ts - state.lastTs) / 1000;
      state.t = Math.min(1, state.t + dt / 5.0); // 5秒で 0→1
      refresh();
      if (state.t >= 1) setPlaying(false);
    }
    state.lastTs = ts;
  }
  requestAnimationFrame(loop);
}

init();
