// 実績（120個）。1個ごとに全体倍率+1%（balance.ts の achievementBonus）。
import { GENERATORS, DIM_GENERATORS } from './generators.ts';
import { CHALLENGES } from './challenges.ts';

export type AchCond =
  | { type: 'gen'; gen: number; n: number }
  | { type: 'allTotal'; amount: number }
  | { type: 'pps'; amount: number }
  | { type: 'taps'; n: number }
  | { type: 'stars'; n: number }
  | { type: 'upgrades'; n: number }
  | { type: 'bigBangs'; n: number }
  | { type: 'constants'; amount: number }
  | { type: 'challenge'; index: number }
  | { type: 'ascensions'; n: number }
  | { type: 'dimGen'; index: number }
  | { type: 'laws'; n: number }
  | { type: 'offline'; seconds: number }
  | { type: 'exported' }
  | { type: 'fastBigBang'; seconds: number };

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  cond: AchCond;
}

const fmt = (n: number) => (n < 1e4 ? n.toLocaleString('ja-JP') : n.toExponential(0).replace('+', ''));
const list: AchievementDef[] = [];

const GEN_COUNTS = [1, 10, 50, 100, 200];
GENERATORS.forEach((g, gi) => {
  GEN_COUNTS.forEach((n) => {
    list.push({ id: `a_g${gi}_${n}`, name: `${g.name} ${n}`, desc: `${g.name}を${n}台持つ`, cond: { type: 'gen', gen: gi, n } });
  });
});

const TOTALS = [1e2, 1e4, 1e6, 1e8, 1e10, 1e12, 1e15, 1e18, 1e21, 1e25, 1e30, 1e35, 1e40, 1e50, 1e60, 1e75, 1e100, 1e150, 1e200, 1e300];
TOTALS.forEach((a, i) => {
  list.push({ id: `a_tot${i}`, name: `累計 ${fmt(a)}`, desc: `粒子を累計${fmt(a)}個生み出す`, cond: { type: 'allTotal', amount: a } });
});

const PPS = [1, 1e3, 1e6, 1e9, 1e12, 1e15, 1e20, 1e30, 1e50, 1e80];
PPS.forEach((a, i) => {
  list.push({ id: `a_pps${i}`, name: `毎秒 ${fmt(a)}`, desc: `毎秒${fmt(a)}個の粒子を生む`, cond: { type: 'pps', amount: a } });
});

[100, 1000, 1e4, 1e5, 1e6].forEach((n, i) => list.push({ id: `a_tap${i}`, name: `タップ ${fmt(n)}`, desc: `核を${fmt(n)}回タップする（自動含む）`, cond: { type: 'taps', n } }));
[1, 10, 50, 100, 500].forEach((n, i) => list.push({ id: `a_star${i}`, name: `流れ星 ${n}`, desc: `流れ星を${n}個捕まえる`, cond: { type: 'stars', n } }));
[10, 30, 60, 90, 120].forEach((n, i) => list.push({ id: `a_upg${i}`, name: `強化 ${n}`, desc: `1周回で強化を${n}個購入する`, cond: { type: 'upgrades', n } }));
[1, 5, 10, 25, 50, 100].forEach((n, i) => list.push({ id: `a_bb${i}`, name: `ビッグバン ${n}`, desc: `ビッグバンを累計${n}回行う`, cond: { type: 'bigBangs', n } }));
[10, 100, 1e3, 1e4, 1e6].forEach((a, i) => list.push({ id: `a_con${i}`, name: `定数 ${fmt(a)}`, desc: `宇宙定数を累計${fmt(a)}個得る`, cond: { type: 'constants', amount: a } }));
CHALLENGES.forEach((c, i) => list.push({ id: `a_ch${i}`, name: c.name, desc: `挑戦「${c.name}」を達成する`, cond: { type: 'challenge', index: i } }));
[1, 3, 10].forEach((n, i) => list.push({ id: `a_asc${i}`, name: `次元上昇 ${n}`, desc: `次元上昇を${n}回行う`, cond: { type: 'ascensions', n } }));
DIM_GENERATORS.forEach((d, i) => list.push({ id: `a_dim${i}`, name: d.name, desc: `次元装置「${d.name}」を手に入れる`, cond: { type: 'dimGen', index: i } }));
[5, 15, 35].forEach((n, i) => list.push({ id: `a_law${i}`, name: `法則 ${n}`, desc: `法則の木を${n}個解く`, cond: { type: 'laws', n } }));
list.push({ id: 'a_off', name: 'おかえり', desc: '1時間以上留守にして戻る', cond: { type: 'offline', seconds: 3600 } });
list.push({ id: 'a_exp', name: '宇宙の写し', desc: 'セーブをエクスポートする', cond: { type: 'exported' } });
list.push({ id: 'a_fast1', name: '速い膨張', desc: '30分以内にビッグバンする', cond: { type: 'fastBigBang', seconds: 1800 } });
list.push({ id: 'a_fast2', name: '瞬きの宇宙', desc: '1分以内にビッグバンする', cond: { type: 'fastBigBang', seconds: 60 } });

export const ACHIEVEMENTS: AchievementDef[] = list;
