// scene.js — 地盤断面のCanvas描画（基礎・沈下・すべり面・地表隆起）
import { GEOM, MODES } from './constants.js';
import { geometry } from './model.js';

// 1つの断面を1キャンバスに描く
export function drawScene(canvas, mode, phiDeg, t) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const { halfDomain, depth } = GEOM;
  const padX = 12, padTop = 28, padBot = 10;
  const groundY = padTop + 0.16 * (cssH - padTop - padBot); // 地表の画面y
  const sx = (x) => cssW / 2 + (x / halfDomain) * (cssW / 2 - padX);
  const sy = (y) => groundY + (y / depth) * (cssH - groundY - padBot);

  const g = geometry(mode, phiDeg, t);
  const color = MODES[mode].color;

  // --- 地盤本体 ---
  ctx.fillStyle = '#f3efe7';
  ctx.fillRect(0, groundY, cssW, cssH - groundY);
  // 地表線
  ctx.strokeStyle = '#9a8f7a';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(cssW, groundY); ctx.stroke();

  // --- すべり面の塗り（発達域）---
  drawZones(ctx, g, sx, sy, color);

  // --- 地表隆起 ---
  if (g.heave) {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    g.heave.forEach((p, i) => { const X = sx(p.x), Y = sy(p.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
    // 反対側
    ctx.beginPath();
    g.heave.forEach((p, i) => { const X = sx(-p.x), Y = sy(p.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
  }

  // --- すべり線（右と左対称）---
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  drawSlipLines(ctx, g, sx, sy, +1);
  drawSlipLines(ctx, g, sx, sy, -1);

  // --- 基礎 ---
  drawFooting(ctx, g, sx, sy);

  // --- 荷重矢印 ---
  drawLoadArrow(ctx, g, sx, sy, t);

  // --- ラベル ---
  ctx.fillStyle = '#1f1f1f';
  ctx.font = '600 13px -apple-system, "Hiragino Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${MODES[mode].jp}  (φ'≈${phiDeg.toFixed(0)}°)`, 10, 18);
}

function drawZones(ctx, g, sx, sy, color) {
  // 主働くさび（基礎と一体で沈下）— 半透明塗り
  if (g.mode !== 'punching') {
    ctx.fillStyle = hexA(color, 0.10);
    ctx.beginPath();
    ctx.moveTo(sx(-g.corner.x), sy(g.corner.y - g.settle));
    ctx.lineTo(sx(0), sy(g.apex.y - g.settle));
    ctx.lineTo(sx(g.corner.x), sy(g.corner.y - g.settle));
    ctx.closePath();
    ctx.fill();
  }
}

function drawSlipLines(ctx, g, sx, sy, sgn) {
  const m = (p) => ({ x: sgn * p.x, y: p.y });
  if (g.mode === 'punching') {
    const a = m(g.shear[0]), b = m(g.shear[1]);
    ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke();
    return;
  }
  // 主働くさび側面（沈下込み）
  const c = m(g.corner), apex = { x: 0, y: g.apex.y };
  ctx.beginPath();
  ctx.moveTo(sx(c.x), sy(c.y - g.settle));
  ctx.lineTo(sx(apex.x), sy(apex.y - g.settle));
  ctx.stroke();
  // 対数らせん
  if (g.spiral) {
    ctx.beginPath();
    g.spiral.forEach((p, i) => { const q = m(p); const X = sx(q.x), Y = sy(q.y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
  }
  // 受働直線
  if (g.passive) {
    const p0 = m(g.passive[0]), p1 = m(g.passive[1]);
    ctx.beginPath(); ctx.moveTo(sx(p0.x), sy(p0.y)); ctx.lineTo(sx(p1.x), sy(p1.y)); ctx.stroke();
  }
}

function drawFooting(ctx, g, sx, sy) {
  const x0 = sx(-g.corner.x), x1 = sx(g.corner.x);
  const yTop = sy(0 - g.settle); // 基礎上面 = 地表 - 沈下（沈下で下がる）
  const yBot = sy(g.Df - g.settle);
  ctx.fillStyle = '#444';
  ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2;
  ctx.strokeRect(x0, yTop, x1 - x0, yBot - yTop);
}

function drawLoadArrow(ctx, g, sx, sy, t) {
  const xc = sx(0);
  const yBase = sy(0 - g.settle) - 4;
  const len = 14 + 26 * t;
  ctx.strokeStyle = '#c0392b'; ctx.fillStyle = '#c0392b'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(xc, yBase - len); ctx.lineTo(xc, yBase); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xc, yBase); ctx.lineTo(xc - 5, yBase - 8); ctx.lineTo(xc + 5, yBase - 8);
  ctx.closePath(); ctx.fill();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
