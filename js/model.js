// model.js — 概念モデル（構成則は解かない）
// 荷重-沈下曲線とすべり面ジオメトリを Dr / φ' から解析的な近似式で生成する。

import { DR_GENERAL, DR_LOCAL, S_MAX_PCT, GEOM, deg2rad } from './constants.js';

// Dr → φ' の経験的対応（例題1 に整合: Dr=0.85→≈40°, 0.20→≈29°）
export function phiFromDr(Dr) {
  return 28 + 14 * Dr;
}

// Dr → 破壊形態
export function modeFromDr(Dr) {
  if (Dr >= DR_GENERAL) return 'general';
  if (Dr >= DR_LOCAL) return 'local';
  return 'punching';
}

// 載荷の進行度 t(0..1) → 沈下比 s/B (%)
export function settlementPct(t) {
  return t * S_MAX_PCT;
}

// ---- 荷重-沈下曲線 -------------------------------------------------
// 沈下比 s (%) における正規化支持応力 q(kPa 相当)を返す。
// 大きさは Dr に比例させ（密ほど高支持力）、形状はモードで変える。
//   全般 : 明確なピーク後に軟化（脆性）
//   局部 : 緩やかなピーク／プラトー、軟化は弱い
//   パンチング : ピークなしの単調漸増（双曲線）
export function qAt(mode, Dr, sPct) {
  const mag = 80 + 320 * Dr; // 支持力スケール（kPa 相当）
  const s = Math.max(sPct, 0);
  if (mode === 'punching') {
    // 双曲線: 単調増加、明確なピークなし
    const qult = mag * 0.75;
    return qult * s / (3.0 + s);
  }
  if (mode === 'general') {
    // 鋭いピーク + 軟化
    const sp = 1.8;            // ピーク沈下比 (%)
    const a = 2.2;             // 鋭さ
    const g = Math.pow(s / sp, a) * Math.exp(a * (1 - s / sp));
    const resid = 0.72;        // 残留比
    const peak = mag;
    // ピーク後は残留へ漸近させる
    const soft = resid + (1 - resid) * g;
    return s <= sp ? peak * g : peak * Math.max(soft, resid);
  }
  // local: 緩やかなピーク
  const sp = 5.0;
  const a = 1.2;
  const g = Math.pow(s / sp, a) * Math.exp(a * (1 - s / sp));
  const resid = 0.88;
  const peak = mag * 0.82;
  const soft = resid + (1 - resid) * g;
  return s <= sp ? peak * g : peak * Math.max(soft, resid);
}

// 曲線全体（プロット用）
export function curve(mode, Dr, n = 121) {
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) {
    const s = (S_MAX_PCT * i) / (n - 1);
    xs.push(s);
    ys.push(qAt(mode, Dr, s));
  }
  return { s: xs, q: ys };
}

// 極限支持力 q_u（全般・局部はピーク値、パンチングは許容沈下 s=10% の値）
export function qu(mode, Dr) {
  if (mode === 'punching') return { q: qAt('punching', Dr, 10), s: 10, defined: false };
  // ピークを数値的に探索
  let best = { q: -1, s: 0 };
  for (let s = 0; s <= S_MAX_PCT; s += 0.05) {
    const q = qAt(mode, Dr, s);
    if (q > best.q) best = { q, s };
  }
  return { ...best, defined: mode === 'general' };
}

// ---- すべり面ジオメトリ -------------------------------------------
// 座標系: x[m] は水平（中心 0）、y[m] は深さ（下向き正、地表 0）。
// 右半分を生成し、描画側で左右対称化する。
//
// development d(0..1): すべり面の発達度（載荷進行 t に連動）。
// settle[m]: 基礎の沈下量。

export function geometry(mode, phiDeg, t) {
  const phi = deg2rad(phiDeg);
  const { B, Df } = GEOM;
  const half = B / 2;
  const alpha = deg2rad(45 + phiDeg / 2); // 主働くさび側面の傾斜（水平から）
  const psi = deg2rad(45 - phiDeg / 2);   // 受働すべり面の地表での角度

  // 沈下量（モード別の最大沈下を t でスケール）
  const sMaxByMode = { general: 0.10 * B, local: 0.14 * B, punching: 0.22 * B };
  const settle = (sMaxByMode[mode] || 0.1 * B) * easeSettle(mode, t);

  // 主働くさび（基礎直下の三角形）: 両下端から apex へ
  const apexDepth = Df + half * Math.tan(alpha);
  const corner = { x: half, y: Df };
  const apex = { x: 0, y: apexDepth };

  const out = { mode, settle, B, Df, alpha, psi, corner, apex };

  if (mode === 'punching') {
    // 鉛直方向の貫入: 基礎角からほぼ鉛直なせん断面、地表隆起なし
    const depth = (Df + 1.2 * B) * t;
    out.shear = [
      { x: half, y: Df },
      { x: half + 0.12 * B, y: Df + depth },
    ];
    out.heave = null;
    out.spiral = null;
    out.passive = null;
    out.reachSurface = false;
    return out;
  }

  // 全般 / 局部: 主働くさび + 対数らせん + 受働直線
  // 対数らせん: 極を基礎角 corner に置く
  const r0 = Math.hypot(corner.x - apex.x, corner.y - apex.y); // 主働面長
  const theta0 = Math.atan2(apex.y - corner.y, apex.x - corner.x); // corner→apex 方向
  // 90° 外側へ回転（受働側へ）
  const sweep = Math.PI / 2;
  const spiral = [];
  const N = 40;
  // 全般は地表到達、局部は途中で止まる
  const reach = mode === 'general' ? 1.0 : 0.55;
  const devSweep = sweep * reach * smooth(t);
  for (let i = 0; i <= N; i++) {
    const dth = (devSweep * i) / N;
    const th = theta0 - dth; // 外側へ
    const r = r0 * Math.exp(dth * Math.tan(phi));
    spiral.push({ x: corner.x + r * Math.cos(th), y: corner.y + r * Math.sin(th) });
  }
  out.spiral = spiral;

  // 受働直線: らせん末端から地表へ角度 psi で（全般のみ地表到達）
  const end = spiral[spiral.length - 1];
  if (mode === 'general') {
    // 末端から上向き外側へ psi で地表 y=0 まで
    const dy = end.y; // 地表までの深さ
    const dx = dy / Math.tan(psi);
    const exit = { x: end.x + dx, y: 0 };
    out.passive = [end, exit];
    out.reachSurface = true;
    // 地表隆起（受働域の外側で盛り上がる）
    const hMag = 0.06 * B * smooth(t);
    out.heave = makeHeave(exit.x, hMag, B);
  } else {
    // 局部: 地表手前で止める
    const dx = 0.6 * (end.y / Math.tan(psi));
    const tip = { x: end.x + dx, y: Math.max(end.y - dx * Math.tan(psi), 0.4 * Df) };
    out.passive = [end, tip];
    out.reachSurface = false;
    out.heave = null;
  }
  return out;
}

function makeHeave(x0, mag, B) {
  // x0 を頂点とする小さな盛り上がり（地表 y=0 から上=負方向）
  const pts = [];
  const w = 0.9 * B;
  for (let i = 0; i <= 24; i++) {
    const xx = x0 - w + (2 * w * i) / 24;
    const d = (xx - x0) / w;
    const y = -mag * Math.exp(-4 * d * d);
    pts.push({ x: xx, y });
  }
  return pts;
}

// 載荷進行に対するすべり面発達の滑らかさ
function smooth(t) { return t * t * (3 - 2 * t); }
// モード別の沈下イージング（パンチングは終始進む、全般はピーク後に急沈下）
function easeSettle(mode, t) {
  if (mode === 'general') return Math.pow(t, 1.6);
  if (mode === 'punching') return t;
  return Math.pow(t, 1.3);
}
