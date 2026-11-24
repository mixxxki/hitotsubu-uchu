// 強化（120個）。ビッグバンでリセットされる。
import { GENERATORS } from './generators.ts';

export type UpgradeEffect =
  | { type: 'genMult'; gen: number; mult: number }
  | { type: 'synergy'; target: number; source: number; perUnit: number }
  | { type: 'tapMult'; mult: number }
  | { type: 'tapPct'; pct: number } // タップ1回に毎秒生産の pct を加算
  | { type: 'globalMult'; mult: number }
  | { type: 'starFreq'; mult: number } // 出現間隔×
  | { type: 'starDur'; mult: number } // 効果時間×
  | { type: 'starPow'; mult: number } // 効果量×
  | { type: 'achBonus'; add: number }; // 実績1個あたり倍率に加算

export type Unlock =
  | { type: 'gen'; gen: number; n: number }
  | { type: 'gens2'; a: number; b: number; n: number }
  | { type: 'total'; amount: number } // この周回の累計粒子
  | { type: 'taps'; n: number }
  | { type: 'stars'; n: number }
  | { type: 'ach'; n: number };

export type UpgradeKind = 'gen' | 'synergy' | 'tap' | 'global' | 'star' | 'ach';

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  kind: UpgradeKind;
  cost: number;
  effect: UpgradeEffect;
  unlock: Unlock;
  /** アイコン描画用 */
  gen?: number;
  tier?: number;
}

const TIER_WORDS = ['凝集', '結晶', '共鳴', '臨界', '超越', '永劫', '特異'];
const TIER_UNLOCK = [1, 10, 25, 50, 100, 150, 200];
const TIER_COSTMUL = [10, 60, 600, 2e4, 2e6, 5e8, 1e11];
const TIER_MULT = [2, 2, 2, 3, 3, 4, 5];

const list: UpgradeDef[] = [];

// 装置ごとの単体倍率 8×7 = 56
GENERATORS.forEach((g, gi) => {
  for (let t = 0; t < 7; t++) {
    list.push({
      id: `g${gi}t${t}`,
      name: `${g.name}の${TIER_WORDS[t]}`,
      desc: `${g.name}の生産×${TIER_MULT[t]}`,
      kind: 'gen',
      cost: g.baseCost * TIER_COSTMUL[t],
      effect: { type: 'genMult', gen: gi, mult: TIER_MULT[t] },
      unlock: { type: 'gen', gen: gi, n: TIER_UNLOCK[t] },
      gen: gi,
      tier: t,
    });
  }
});

// 相乗効果 7×2 = 14
for (let i = 0; i < 7; i++) {
  const lo = GENERATORS[i];
  const hi = GENERATORS[i + 1];
  list.push({
    id: `sy${i}a`,
    name: `${hi.name}から${lo.name}へ`,
    desc: `${hi.name}1台ごとに${lo.name}の生産+4%`,
    kind: 'synergy',
    cost: hi.baseCost * 800,
    effect: { type: 'synergy', target: i, source: i + 1, perUnit: 0.04 },
    unlock: { type: 'gens2', a: i, b: i + 1, n: 15 },
    gen: i,
  });
  list.push({
    id: `sy${i}b`,
    name: `${lo.name}から${hi.name}へ`,
    desc: `${lo.name}1台ごとに${hi.name}の生産+0.6%`,
    kind: 'synergy',
    cost: hi.baseCost * 4e4,
    effect: { type: 'synergy', target: i + 1, source: i, perUnit: 0.006 },
    unlock: { type: 'gens2', a: i, b: i + 1, n: 40 },
    gen: i + 1,
  });
}

// タップ強化 15
const TAP: Array<[string, number, UpgradeEffect, Unlock]> = [
  ['指先の熱', 100, { type: 'tapMult', mult: 2 }, { type: 'taps', n: 20 }],
  ['掌の重力', 600, { type: 'tapMult', mult: 2 }, { type: 'taps', n: 100 }],
  ['反響する鼓動', 8e3, { type: 'tapMult', mult: 2 }, { type: 'taps', n: 300 }],
  ['核への共振', 5e4, { type: 'tapPct', pct: 0.01 }, { type: 'total', amount: 2e4 }],
  ['衝撃波', 5e5, { type: 'tapMult', mult: 3 }, { type: 'taps', n: 800 }],
  ['連なる波紋', 5e6, { type: 'tapPct', pct: 0.01 }, { type: 'total', amount: 2e6 }],
  ['臨界の指', 1e8, { type: 'tapMult', mult: 3 }, { type: 'taps', n: 2000 }],
  ['核の脈動', 1e9, { type: 'tapPct', pct: 0.02 }, { type: 'total', amount: 4e8 }],
  ['星を砕く手', 1e11, { type: 'tapMult', mult: 5 }, { type: 'taps', n: 4000 }],
  ['銀河の握り', 1e13, { type: 'tapPct', pct: 0.02 }, { type: 'total', amount: 4e12 }],
  ['無限の打鍵', 1e16, { type: 'tapMult', mult: 5 }, { type: 'taps', n: 8000 }],
  ['特異点の触覚', 1e19, { type: 'tapPct', pct: 0.03 }, { type: 'total', amount: 1e18 }],
  ['宇宙の指揮', 1e23, { type: 'tapMult', mult: 10 }, { type: 'taps', n: 15000 }],
  ['時空の拍動', 1e28, { type: 'tapPct', pct: 0.04 }, { type: 'total', amount: 1e27 }],
  ['ひとつぶの意志', 1e35, { type: 'tapMult', mult: 25 }, { type: 'taps', n: 30000 }],
];
TAP.forEach(([name, cost, effect, unlock], i) => {
  const desc = effect.type === 'tapMult' ? `タップ獲得量×${effect.mult}` : `タップ1回ごとに毎秒生産の${Math.round((effect as { pct: number }).pct * 100)}%を追加`;
  list.push({ id: `tap${i}`, name, desc, kind: 'tap', cost, effect, unlock, tier: i });
});

// 全体倍率 20
const GLOBAL_NAMES = [
  '最初の光', '静かな膨張', '揺らぎ', '再結合', '暗黒の時代', '再電離', '星形成', '金属の雨',
  '円盤の誕生', '渦状腕', '銀河群', '大規模構造', '宇宙の網', '超銀河団', '空洞の歌', '暗黒流',
  '真空の相転移', '偽の真空', 'インフレーション', '宇宙の地平',
];
const GLOBAL_COST = [5e3, 1e5, 2e6, 5e7, 1e9, 3e10, 1e12, 5e13, 2e15, 1e17, 1e19, 1e21, 1e24, 1e27, 1e31, 1e35, 1e40, 1e46, 1e53, 1e60];
const GLOBAL_MULT = [1.5, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 6];
GLOBAL_NAMES.forEach((name, i) => {
  list.push({
    id: `gl${i}`,
    name,
    desc: `すべての生産×${GLOBAL_MULT[i]}`,
    kind: 'global',
    cost: GLOBAL_COST[i],
    effect: { type: 'globalMult', mult: GLOBAL_MULT[i] },
    unlock: { type: 'total', amount: GLOBAL_COST[i] / 5 },
    tier: i,
  });
});

// 流れ星 8
const STAR: Array<[string, number, UpgradeEffect, Unlock, string]> = [
  ['星見の丘', 2e4, { type: 'starFreq', mult: 0.85 }, { type: 'stars', n: 1 }, '流れ星の出現間隔×0.85'],
  ['尾の長い星', 4e5, { type: 'starDur', mult: 1.5 }, { type: 'stars', n: 3 }, '流れ星の倍率の持続×1.5'],
  ['明るい流星', 1e7, { type: 'starPow', mult: 1.5 }, { type: 'stars', n: 6 }, '流れ星の効果×1.5'],
  ['流星群', 1e9, { type: 'starFreq', mult: 0.85 }, { type: 'stars', n: 10 }, '流れ星の出現間隔×0.85'],
  ['火球', 1e12, { type: 'starPow', mult: 1.5 }, { type: 'stars', n: 15 }, '流れ星の効果×1.5'],
  ['長い残光', 1e15, { type: 'starDur', mult: 1.5 }, { type: 'stars', n: 25 }, '流れ星の倍率の持続×1.5'],
  ['星の雨', 1e20, { type: 'starFreq', mult: 0.8 }, { type: 'stars', n: 40 }, '流れ星の出現間隔×0.8'],
  ['願いの星', 1e27, { type: 'starPow', mult: 2 }, { type: 'stars', n: 60 }, '流れ星の効果×2'],
];
STAR.forEach(([name, cost, effect, unlock, desc], i) => {
  list.push({ id: `st${i}`, name, desc, kind: 'star', cost, effect, unlock, tier: i });
});

// 実績連動 7
const ACH: Array<[string, number, number, number]> = [
  ['記録者', 1e6, 0.002, 10],
  ['観測者', 1e9, 0.003, 20],
  ['年代記', 1e13, 0.004, 30],
  ['星図', 1e18, 0.005, 45],
  ['宇宙誌', 1e25, 0.006, 60],
  ['万象の書', 1e34, 0.008, 80],
  ['全知の記憶', 1e45, 0.01, 100],
];
ACH.forEach(([name, cost, add, n], i) => {
  list.push({
    id: `ac${i}`,
    name,
    desc: `実績1個ごとの全体倍率+${(add * 100).toFixed(1)}%`,
    kind: 'ach',
    cost,
    effect: { type: 'achBonus', add },
    unlock: { type: 'ach', n },
    tier: i,
  });
});

/** 表示順（マス目）は生成順: 装置→相乗→タップ→全体→流れ星→実績 */
export const UPGRADES: UpgradeDef[] = list;
export const UPGRADE_INDEX: Record<string, number> = Object.fromEntries(list.map((u, i) => [u.id, i]));

if (UPGRADES.length !== 120) {
  // 開発時チェック
  console.warn(`upgrades: expected 120, got ${UPGRADES.length}`);
}
