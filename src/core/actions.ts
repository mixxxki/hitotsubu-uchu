// プレイヤー操作・リセット処理
import Decimal from 'break_eternity.js';
import type { GameState } from './state.ts';
import { newDimGens } from './state.ts';
import { GENERATORS } from '../data/generators.ts';
import { UPGRADES, type UpgradeDef, type Unlock } from '../data/upgrades.ts';
import { LAW_TREE, LAW_REPEAT, type LawNode } from '../data/lawTree.ts';
import { CHALLENGES } from '../data/challenges.ts';
import { DIM_UPGRADES } from '../data/dimension.ts';
import { BALANCE } from '../data/balance.ts';
import { MULTIVERSE_GAIN } from '../data/multiverse.ts';
import {
  type Mods, computeMods, genCost, genMaxAffordable, upgradeCost, hasRule, canBigBang, constantsGain,
  canAscend, shardsGain, lawRepeatCost, dimGenCost, dimGenMaxAffordable, dimRepeatCost, multiverseReady,
} from './formulas.ts';
import { emit } from './events.ts';

// ---------------------------------------------------------------- 獲得
/** 一定区間の獲得量を桁落ちなく数えるためのカウンタ（放置計算で使う） */
export const gainTracker = { total: new Decimal(0) };

export function gain(s: GameState, amount: Decimal): void {
  if (amount.lte(0)) return;
  gainTracker.total = gainTracker.total.add(amount);
  s.particles = s.particles.add(amount);
  s.runTotal = s.runTotal.add(amount);
  s.allTotal = s.allTotal.add(amount);
}

export function tap(s: GameState, m: Mods, count = 1): Decimal {
  s.taps += count;
  const v = m.tapValue.mul(count);
  gain(s, v);
  return v;
}

// ---------------------------------------------------------------- 生成装置
export function genLocked(s: GameState, gi: number): boolean {
  return hasRule(s, 'lowGensOnly') && gi >= 4;
}

/** amount: 正の数=その台数, 'max'=買えるだけ */
export function buyAmount(s: GameState, m: Mods, gi: number, mode: number | 'max'): number {
  if (genLocked(s, gi)) return 0;
  if (mode === 'max') return genMaxAffordable(m, gi, s.gens[gi], s.particles);
  return mode;
}

export function buyGen(s: GameState, m: Mods, gi: number, mode: number | 'max'): number {
  const n = buyAmount(s, m, gi, mode);
  if (n <= 0) return 0;
  const cost = genCost(m, gi, s.gens[gi], n);
  if (cost.gt(s.particles)) return 0;
  s.particles = s.particles.sub(cost).max(0);
  s.gens[gi] += n;
  s.lastBoughtGen = gi;
  return n;
}

// ---------------------------------------------------------------- 強化
export function unlockMet(s: GameState, u: Unlock): boolean {
  switch (u.type) {
    case 'gen': return s.gens[u.gen] >= u.n;
    case 'gens2': return s.gens[u.a] >= u.n && s.gens[u.b] >= u.n;
    case 'total': return s.runTotal.gte(u.amount);
    case 'taps': return s.taps >= u.n;
    case 'stars': return s.starsCaught >= u.n;
    case 'ach': return s.achievements.size >= u.n;
  }
}

export type UpgradeStatus = 'owned' | 'affordable' | 'unlocked' | 'locked';

export function upgradeStatus(s: GameState, m: Mods, u: UpgradeDef): UpgradeStatus {
  if (s.upgrades.has(u.id)) return 'owned';
  if (!unlockMet(s, u.unlock)) return 'locked';
  if (hasRule(s, 'noUpgrades')) return 'unlocked';
  return s.particles.gte(upgradeCost(m, u)) ? 'affordable' : 'unlocked';
}

export function buyUpgrade(s: GameState, m: Mods, u: UpgradeDef): boolean {
  if (upgradeStatus(s, m, u) !== 'affordable') return false;
  s.particles = s.particles.sub(upgradeCost(m, u)).max(0);
  s.upgrades.add(u.id);
  return true;
}

// ---------------------------------------------------------------- 流れ星
export function catchStar(s: GameState, m: Mods, auto: boolean, rnd: () => number = Math.random): void {
  if (!s.star) return;
  s.star = null;
  s.starsCaught++;
  scheduleStar(s, m, rnd);
  if (rnd() < BALANCE.starBuffChance) {
    const mult = 1 + (BALANCE.starBuffMult - 1) * m.starPow;
    const duration = BALANCE.starBuffDuration * m.starDur;
    s.buffMult = mult;
    s.buffUntil = s.time + duration;
    emit({ type: 'starCaught', kind: 'buff', mult, duration, auto });
  } else {
    const a = Decimal.min(m.pps.mul(BALANCE.starLumpSeconds), s.particles.mul(BALANCE.starLumpBankFrac)).add(13).mul(m.starPow);
    gain(s, a);
    emit({ type: 'starCaught', kind: 'lump', amount: a, auto });
  }
}

export function scheduleStar(s: GameState, m: Mods, rnd: () => number = Math.random): void {
  const t = BALANCE.starIntervalMin + (BALANCE.starIntervalMax - BALANCE.starIntervalMin) * rnd();
  s.nextStarAt = s.time + t * m.starFreq;
}

// ---------------------------------------------------------------- 周回リセット
function resetRun(s: GameState, m: Mods): void {
  s.particles = new Decimal(m.startParticles);
  s.runTotal = new Decimal(0);
  s.gens = GENERATORS.map(() => 0);
  const keep = new Set<string>();
  if (m.keepGenTiers > 0) {
    for (const u of UPGRADES) if (u.kind === 'gen' && (u.tier ?? 99) < m.keepGenTiers && s.upgrades.has(u.id)) keep.add(u.id);
  }
  s.upgrades = keep;
  s.lastBoughtGen = -1;
  s.runStart = s.time;
  if (s.star) {
    s.star = null;
    scheduleStar(s, m);
  }
  s.buffUntil = 0;
  s.buffMult = 1;
}

export function bigBang(s: GameState, m: Mods = computeMods(s)): boolean {
  if (!canBigBang(s)) return false;
  const g = constantsGain(s, m);
  const runTime = s.time - s.runStart;
  let done: number | null = null;
  if (s.challenge !== null) {
    done = s.challenge;
    s.challengesDone.add(s.challenge);
    s.challenge = null;
  }
  s.constants = s.constants.add(g);
  s.constantsEver = s.constantsEver.add(g);
  s.constantsAllTime = s.constantsAllTime.add(g);
  s.bigBangs++;
  s.bigBangsEver++;
  s.fastestBigBang = Math.min(s.fastestBigBang, runTime);
  if (runTime > 0) {
    const rate = g.div(runTime / 60);
    if (rate.gt(s.bestConstRate)) s.bestConstRate = rate;
  }
  resetRun(s, computeMods(s));
  emit({ type: 'bigBang', gain: g, challengeDone: done });
  return true;
}

export function enterChallenge(s: GameState, index: number): boolean {
  const m = computeMods(s);
  if (!m.challengesUnlocked[index] || s.challenge !== null) return false;
  s.challenge = index;
  resetRun(s, computeMods(s));
  return true;
}

export function exitChallenge(s: GameState): void {
  if (s.challenge === null) return;
  s.challenge = null;
  resetRun(s, computeMods(s));
}

// ---------------------------------------------------------------- 法則の木
export function lawAvailable(s: GameState, node: LawNode): boolean {
  if (s.laws.has(node.id)) return false;
  if (node.excl && s.laws.has(node.excl)) return false;
  return node.req.length === 0 || node.req.some((r) => s.laws.has(r));
}

export function buyLaw(s: GameState, node: LawNode): boolean {
  if (!lawAvailable(s, node) || s.constants.lt(node.cost)) return false;
  s.constants = s.constants.sub(node.cost);
  s.laws.add(node.id);
  return true;
}

export function lawRepeatAvailable(s: GameState): boolean {
  return s.laws.has(LAW_REPEAT.req);
}

export function buyLawRepeat(s: GameState): boolean {
  if (!lawRepeatAvailable(s)) return false;
  const c = lawRepeatCost(s);
  if (s.constants.lt(c)) return false;
  s.constants = s.constants.sub(c);
  s.lawRepeat++;
  return true;
}

// ---------------------------------------------------------------- 次元上昇
export function ascend(s: GameState, m: Mods = computeMods(s)): boolean {
  if (!canAscend(s)) return false;
  const g = shardsGain(s, m);
  s.shards = s.shards.add(g);
  s.shardsEver = s.shardsEver.add(g);
  s.ascRunTotalShards = s.ascRunTotalShards.add(g);
  s.ascensions++;
  s.lastAscGain = g;
  s.ascStart = s.time;
  const startC = s.dimUpgrades.has('d_const') ? 100 : 0;
  s.constants = new Decimal(startC);
  s.constantsEver = new Decimal(startC);
  s.bigBangs = s.dimUpgrades.has('d_bb') ? 10 : 0;
  if (!s.dimUpgrades.has('d_tree')) {
    s.laws = new Set();
    s.lawRepeat = 0;
  }
  if (!s.dimUpgrades.has('d_chal')) s.challengesDone = new Set();
  s.challenge = null;
  resetRun(s, computeMods(s));
  emit({ type: 'ascend', gain: g });
  return true;
}

export function buyDimGen(s: GameState, gi: number, mode: number | 'max'): number {
  const g = s.dimGens[gi];
  const n = mode === 'max' ? dimGenMaxAffordable(gi, g.bought, s.shards) : mode;
  if (n <= 0) return 0;
  const c = dimGenCost(gi, g.bought, n);
  if (c.gt(s.shards)) return 0;
  s.shards = s.shards.sub(c).max(0);
  g.bought += n;
  g.amount = g.amount.add(n);
  return n;
}

export function buyDimUpgrade(s: GameState, id: string): boolean {
  const u = DIM_UPGRADES.find((x) => x.id === id);
  if (!u || s.dimUpgrades.has(id) || s.shards.lt(u.cost)) return false;
  s.shards = s.shards.sub(u.cost);
  s.dimUpgrades.add(id);
  return true;
}

export function buyDimRepeat(s: GameState): boolean {
  const c = dimRepeatCost(s);
  if (s.shards.lt(c)) return false;
  s.shards = s.shards.sub(c);
  s.dimRepeat++;
  return true;
}

// ---------------------------------------------------------------- 多元宇宙（枠）
export function potentialGain(s: GameState): Decimal {
  if (!multiverseReady(s)) return new Decimal(0);
  return s.shardsEver.div(BALANCE.multiverseReqShardsEver).pow(MULTIVERSE_GAIN.exp).mul(MULTIVERSE_GAIN.mult).floor().max(1);
}

/** 多元化: 次元層ごとリセット。報酬（可能性）の使い道は今後追加 */
export function multiverse(s: GameState): boolean {
  if (!multiverseReady(s)) return false;
  s.multiverse.unlocked = true;
  s.multiverse.count++;
  s.multiverse.potential = s.multiverse.potential.add(potentialGain(s));
  s.shards = new Decimal(0);
  s.shardsEver = new Decimal(0);
  s.ascRunTotalShards = new Decimal(0);
  s.dimGens = newDimGens();
  s.energy = new Decimal(0);
  s.dimUpgrades = new Set();
  s.dimRepeat = 0;
  s.ascensions = 0;
  s.constants = new Decimal(0);
  s.constantsEver = new Decimal(0);
  s.bigBangs = 0;
  s.laws = new Set();
  s.lawRepeat = 0;
  s.challengesDone = new Set();
  s.challenge = null;
  resetRun(s, computeMods(s));
  emit({ type: 'multiverse' });
  return true;
}

export function challengeGoal(index: number): number {
  return CHALLENGES[index].goal;
}

export { LAW_TREE };

/** 法則の振り直し: 使った宇宙定数を全額返し、今の周回をリセットする（定数は得られない） */
export function respecLaws(s: GameState): Decimal {
  let refund = new Decimal(0);
  for (const n of LAW_TREE) if (s.laws.has(n.id)) refund = refund.add(n.cost);
  // 無限の法則に使った分も返す
  for (let i = 0; i < s.lawRepeat; i++) refund = refund.add(Decimal.pow(LAW_REPEAT.costGrowth, i).mul(LAW_REPEAT.baseCost));
  if (refund.lte(0)) return refund;
  s.laws = new Set();
  s.lawRepeat = 0;
  s.constants = s.constants.add(refund);
  if (s.challenge !== null) s.challenge = null;
  resetRun(s, computeMods(s));
  return refund;
}

/** 二択だけ入れ替える: 一方を返金して外し、もう一方を解明する（今の周回はリセット） */
export function swapExclusive(s: GameState, id: string): boolean {
  const node = LAW_TREE.find((n) => n.id === id);
  if (!node?.excl || !s.laws.has(node.excl)) return false;
  const other = LAW_TREE.find((n) => n.id === node.excl)!;
  const funds = s.constants.add(other.cost);
  if (funds.lt(node.cost)) return false;
  s.laws.delete(other.id);
  s.constants = funds.sub(node.cost);
  s.laws.add(node.id);
  resetRun(s, computeMods(s));
  return true;
}

/** 解明できる法則を安い順にまとめて解明 */
export function buyAllLaws(s: GameState): number {
  let n = 0;
  for (let guard = 0; guard < 100; guard++) {
    const c = LAW_TREE.filter((x) => !x.excl && lawAvailable(s, x) && s.constants.gte(x.cost)).sort((a, b) => a.cost - b.cost)[0];
    if (!c || !buyLaw(s, c)) break;
    n++;
  }
  return n;
}
