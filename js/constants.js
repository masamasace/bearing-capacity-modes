// constants.js — モード定義・既定値・配色
// 支持力破壊の3形態（Vesic 1973 分類）を可視化する教育用パラメータ。
// 構成則は解かず、教科書的な定性挙動を再現する概念モデルとして定数を与える。

export const MODES = {
  general:  { key: 'general',  jp: '全般せん断破壊',  en: 'general shear',  color: '#2F5D7C' },
  local:    { key: 'local',    jp: '局部せん断破壊',  en: 'local shear',    color: '#4D7B47' },
  punching: { key: 'punching', jp: 'パンチング破壊',  en: 'punching shear', color: '#B36B00' },
};

// 相対密度 Dr による破壊形態の区分（スライド l250-346 / 例題1 に準拠）
//   Dr >= 0.70 : 全般せん断（密な砂・硬い粘土）
//   0.35-0.70  : 局部せん断（中位）
//   Dr <  0.35 : パンチング（緩い砂・軟らかい粘土）
export const DR_GENERAL = 0.70;
export const DR_LOCAL   = 0.35;

// 例題1 の3地盤プリセット
export const PRESETS = [
  { label: '(a) 密な砂 Dr=85%',  Dr: 0.85, phi: 40 },
  { label: '(b) 中位の砂 Dr=50%', Dr: 0.50, phi: 33 },
  { label: '(c) 緩い砂 Dr=20%',  Dr: 0.20, phi: 28 },
];

// 基礎・地盤の既定寸法（m）。可視化用のスケールであり実設計値ではない。
export const GEOM = {
  B: 2.0,      // 基礎幅
  Df: 0.5,     // 根入れ深さ
  halfDomain: 6.0,  // 描画領域の半幅
  depth: 5.0,  // 描画領域の深さ
};

// 沈下軸の最大値（s/B, %）
export const S_MAX_PCT = 12;

export const deg2rad = (d) => (d * Math.PI) / 180;
