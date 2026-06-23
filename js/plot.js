// plot.js — 荷重-沈下曲線（Plotly）
import { MODES, S_MAX_PCT } from './constants.js';
import { curve, qAt, settlementPct } from './model.js';

const LAYOUT_BASE = {
  margin: { l: 56, r: 14, t: 28, b: 44 },
  xaxis: { title: '支持応力 q (kPa 相当)', zeroline: false, gridcolor: '#ececec', rangemode: 'tozero' },
  yaxis: { title: '沈下比 s/B (%)', autorange: 'reversed', gridcolor: '#ececec', range: [S_MAX_PCT, 0] },
  showlegend: true,
  legend: { x: 0.98, y: 0.05, xanchor: 'right', yanchor: 'bottom', bgcolor: 'rgba(255,255,255,0.7)' },
  font: { family: '-apple-system, "Hiragino Sans", sans-serif', size: 12 },
  paper_bgcolor: '#fff', plot_bgcolor: '#fff',
};

const CONFIG = { displayModeBar: false, responsive: true };

// 沈下を縦軸（下向き）にとった慣例表示。q を横軸にする。
export function initPlot(el, modes, Dr) {
  const traces = modes.map((mode) => {
    const c = curve(mode, Dr);
    return {
      x: c.q, y: c.s, mode: 'lines', name: MODES[mode].jp,
      line: { color: MODES[mode].color, width: 2.5 },
    };
  });
  // 現在点マーカー（各モード）
  modes.forEach((mode) => {
    traces.push({
      x: [0], y: [0], mode: 'markers', name: '', showlegend: false,
      marker: { color: MODES[mode].color, size: 10, line: { color: '#fff', width: 1.5 } },
    });
  });
  if (typeof Plotly === 'undefined') { showPlotFallback(el); return; }
  Plotly.newPlot(el, traces, structuredClone(LAYOUT_BASE), CONFIG);
}

function showPlotFallback(el) {
  el.innerHTML = '<div style="padding:16px;font-size:.85rem;color:#555;line-height:1.6">'
    + '荷重-沈下曲線の描画ライブラリ (Plotly) を読み込めませんでした。'
    + 'ネットワーク接続を確認してください（CDN: cdn.jsdelivr.net）。'
    + '左側の地盤断面アニメーションはオフラインでも動作します。</div>';
}

export function updatePlot(el, modes, Dr, t) {
  if (typeof Plotly === 'undefined') return;
  const sPct = settlementPct(t);
  const xs = [], ys = [];
  // 曲線再計算（Dr 変化に追従）
  modes.forEach((mode) => { const c = curve(mode, Dr); xs.push(c.q); ys.push(c.s); });
  // マーカー
  const mxs = [], mys = [];
  modes.forEach((mode) => { mxs.push([qAt(mode, Dr, sPct)]); mys.push([sPct]); });
  const idx = [...modes.keys()];
  const markerIdx = modes.map((_, i) => modes.length + i);
  Plotly.restyle(el, { x: xs, y: ys }, idx);
  Plotly.restyle(el, { x: mxs, y: mys }, markerIdx);
}
