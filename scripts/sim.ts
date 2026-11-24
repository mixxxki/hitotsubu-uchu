// バランス検証用シミュレータ: `npm run sim -- [時間(h)]`
declare const process: { argv: string[] };
// 想定プレイヤー: 序盤は手でタップ、流れ星は7割拾う、費用対効果の良いものから購入。
import Decimal from 'break_eternity.js';
import { newState, type GameState } from '../src/core/state.ts';
import { computeMods, constantsGain, canBigBang, canAscend, shardsGain, genCost, upgradeCost, lawRepeatCost } from '../src/core/formulas.ts';
import { tick, slowCheck, runAutomation } from '../src/core/tick.ts';
import {
  tap, buyGen, buyUpgrade, upgradeStatus, catchStar, bigBang, enterChallenge, exitChallenge, buyLaw, lawAvailable,
  buyLawRepeat, lawRepeatAvailable, ascend, buyDimGen, buyDimUpgrade, buyDimRepeat, genLocked,
} from '../src/core/actions.ts';
import { UPGRADES } from '../src/data/upgrades.ts';
import { GENERATORS } from '../src/data/generators.ts';
import { LAW_TREE } from '../src/data/lawTree.ts';
import { CHALLENGES } from '../src/data/challenges.ts';
import { DIM_UPGRADES } from '../src/data/dimension.ts';

const hours = Number(process.argv[2] ?? 2);
const stopAtAscend = process.argv.includes("--asc");
let seed = 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const s: GameState = newState(0);
const log = (msg: string) => console.log(`[${fmtT(s.time)}] ${msg}`);
function fmtT(t: number) {
  const h = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = Math.floor(t % 60);
  return h >= 48 ? `${(t / 86400).toFixed(1)}d` : `${h}h${String(mm).padStart(2, '0')}m${String(ss).padStart(2, '0')}s`;
}
const L = (d: Decimal) => d.max(1).log10().toNumber().toFixed(1);

let firstGen = -1, firstUpg = -1;
let challengeStart = 0;
const failedChal = new Map<number, number>();

function greedyBuy() {
  let m = computeMods(s);
  for (let guard = 0; guard < 400; guard++) {
    const base = m.pps.add(m.tapValue.mul(tapRate()));
    let best: { score: Decimal; act: () => void; cost: Decimal } | null = null;
    for (let i = 0; i < GENERATORS.length; i++) {
      if (genLocked(s, i)) continue;
      const cost = genCost(m, i, s.gens[i], 1);
      s.gens[i]++;
      const m2 = computeMods(s);
      s.gens[i]--;
      const d = m2.pps.add(m2.tapValue.mul(tapRate())).sub(base);
      if (d.lte(0)) continue;
      const score = cost.div(d);
      if (!best || score.lt(best.score)) best = { score, cost, act: () => buyGen(s, m, i, 1) };
    }
    for (const u of UPGRADES) {
      const st = upgradeStatus(s, m, u);
      if (st !== 'affordable' && st !== 'unlocked') continue;
      if (st === 'unlocked' && upgradeCost(m, u).gt(s.particles.mul(20))) continue;
      const cost = upgradeCost(m, u);
      s.upgrades.add(u.id);
      const m2 = computeMods(s);
      s.upgrades.delete(u.id);
      let d = m2.pps.add(m2.tapValue.mul(tapRate())).sub(base);
      if (u.kind === 'star' || u.kind === 'ach') d = base.mul(0.1);
      if (d.lte(0)) continue;
      const score = cost.div(d).mul(0.7);
      if (!best || score.lt(best.score)) best = { score, cost, act: () => buyUpgrade(s, m, u) };
    }
    if (!best || best.cost.gt(s.particles)) return;
    best.act();
    if (firstGen < 0 && s.gens.some((g) => g > 0)) { firstGen = s.time; log('初購入（装置）'); }
    if (firstUpg < 0 && s.upgrades.size > 0) { firstUpg = s.time; log('初購入（強化）'); }
    m = computeMods(s);
  }
}

/** 手動タップ: 序盤は熱心、後は時々 */
function tapRate() {
  if (s.autoUnlocked.has('autoTap')) return 0;
  const rt = s.time - s.runStart;
  return rt < 600 ? 4 : 0.5;
}

function buyLaws() {
  for (let g = 0; g < 50; g++) {
    const avail = LAW_TREE.filter((n) => lawAvailable(s, n) && s.constants.gte(n.cost)).sort((a, b) => a.cost - b.cost);
    if (avail.length) { buyLaw(s, avail[0]); continue; }
    if (lawRepeatAvailable(s) && s.constants.gte(lawRepeatCost(s))) { buyLawRepeat(s); continue; }
    break;
  }
}

function buyDim() {
  for (const u of DIM_UPGRADES) buyDimUpgrade(s, u.id);
  for (let k = 0; k < 20; k++) if (!buyDimRepeat(s)) break;
  for (let i = 3; i >= 0; i--) buyDimGen(s, i, 'max');
}

const end = hours * 3600;
let lastReport = 0;
let lastBB = 0;
let asc1 = -1;
let ascStart = 0;
s.auto.bigBang = false;

while (s.time < end) {
  const late = s.bigBangsEver >= 3;
  const dt = s.bigBangsEver === 0 ? 1 : s.ascensions > 0 ? 15 : late ? 5 : 2;
  let m = tick(s, dt, { rnd });
  // 手動タップ
  const tr = tapRate();
  if (tr > 0) tap(s, m, Math.round(tr * dt));
  // 流れ星（7割拾う）
  if (s.star) { if (rnd() < 0.7) catchStar(s, m, false, rnd); else s.star = null; }
  slowCheck(s, m);
  if (!s.autoUnlocked.has('autoGen') || !s.autoUnlocked.has('autoUpg')) greedyBuy();
  else runAutomation(s, m);
  m = computeMods(s);

  const rt = s.time - s.runStart;
  // 挑戦
  if (s.challenge !== null) {
    if (canBigBang(s)) { log(`挑戦達成: ${CHALLENGES[s.challenge].name} (${fmtT(rt)})`); bigBang(s, m); buyLaws(); }
    else if (rt > 3 * 3600) { failedChal.set(s.challenge, s.time); log(`挑戦断念: ${CHALLENGES[s.challenge].name} log10=${L(s.runTotal)}`); exitChallenge(s); }
    continue;
  }
  // 次元上昇
  if (canAscend(s) && (s.ascensions === 0 || shardsGain(s, m).gte(s.shardsEver.mul(0.5).max(2)) || s.time - ascStart > 12 * 3600)) {
    ascStart = s.time;
    const g = ascend(s, m);
    if (g) {
      if (asc1 < 0) { asc1 = s.time; log(`★ 初の次元上昇`); if (stopAtAscend) break; }
      else log(`次元上昇 #${s.ascensions} 欠片計=${L(s.shardsEver)} E=${L(s.energy)} 定数log=${L(s.constantsEver)}`);
      buyDim(); buyLaws();
    }
    continue;
  }
  // ビッグバン判断
  if (canBigBang(s)) {
    const g = constantsGain(s, m);
    const want = s.bigBangsEver === 0 ? true : g.gte(s.constants.add(s.constantsEver.mul(0.5)).max(1)) || rt > 3600;
    if (want && rt > 30) {
      if (s.bigBangsEver < 3 || s.bigBangsEver % 10 === 0) log(`ビッグバン #${s.bigBangsEver + 1} +${g.toString().slice(0, 10)}定数 周回${fmtT(rt)} 累計定数log=${L(s.constantsEver)}`);
      bigBang(s, m);
      lastBB = s.time;
      buyLaws();
      if (s.ascensions > 0) buyDim();
      // 挑戦に挑む
      const mm = computeMods(s);
      for (let i = 0; i < CHALLENGES.length; i++) {
        if (!mm.challengesUnlocked[i] || s.challengesDone.has(i)) continue;
        const f = failedChal.get(i);
        if (f !== undefined && s.time - f < 12 * 3600) continue;
        enterChallenge(s, i); challengeStart = s.time;
        break;
      }
      continue;
    }
  }
  if (s.ascensions > 0) buyDim();
  if (s.time - lastReport >= (s.time < 7200 ? 600 : s.time < 86400 ? 3600 * 3 : 86400)) {
    lastReport = s.time;
    log(`粒子log=${L(s.runTotal)} pps=${L(m.pps)} BB=${s.bigBangsEver} 定数log=${L(s.constantsEver)} 法則=${s.laws.size}+${s.lawRepeat} 挑戦=${s.challengesDone.size} 実績=${s.achievements.size} 欠片=${L(s.shardsEver)} E=${L(s.energy)}`);
  }
  void challengeStart; void lastBB;
}
log(`終了: 実績${s.achievements.size} 次元上昇${s.ascensions}`);
