// 倍率・価格・獲得量などの純粋な計算
import Decimal from 'break_eternity.js';
import type { GameState } from './state.ts';
import { BALANCE } from '../data/balance.ts';
import { GENERATORS, DIM_GENERATORS, DIM_MILESTONE_EVERY, DIM_MILESTONE_MULT } from '../data/generators.ts';
import { UPGRADES, type UpgradeDef } from '../data/upgrades.ts';
import { LAW_TREE, LAW_REPEAT, type LawEffect } from '../data/lawTree.ts';
import { CHALLENGES, type ChallengeRule, type ChallengeReward } from '../data/challenges.ts';
import { DIM_UPGRADES, DIM_REPEAT, type DimUpgradeEffect } from '../data/dimension.ts';
import { AUTO_TAP_BASE_RATE } from '../data/automation.ts';

export const D0 = new Decimal(0);
export const D1 = new Decimal(1);

const GEN_BASE_COST = GENERATORS.map((g) => new Decimal(g.baseCost));
const GEN_BASE_PROD = GENERATORS.map((g) => new Decimal(g.baseProd));

// ---------------------------------------------------------------- ルール
export function hasRule(s: GameState, rule: ChallengeRule): boolean {
  if (s.challenge === null) return false;
  const r = CHALLENGES[s.challenge].rule;
  if (r === rule) return true;
  if (r === 'vacuum') return rule === 'noTap' || rule === 'noUpgrades' || rule === 'noStars';
  return false;
}

function* lawEffects(s: GameState): Generator<LawEffect> {
  if (hasRule(s, 'noLaws')) return;
  for (const node of LAW_TREE) if (s.laws.has(node.id)) yield* node.effects;
}
function* chalRewards(s: GameState): Generator<ChallengeReward> {
  for (const i of s.challengesDone) yield CHALLENGES[i].reward;
}
function* dimEffects(s: GameState): Generator<DimUpgradeEffect> {
  for (const u of DIM_UPGRADES) if (s.dimUpgrades.has(u.id)) yield u.effect;
}

// ---------------------------------------------------------------- 修飾値
export interface Mods {
  genMult: Decimal[];
  genProd: Decimal[]; // 1種類ごとの毎秒生産（全体倍率込み・指数前）
  global: Decimal;
  pps: Decimal; // 最終的な毎秒生産
  genPow: number;
  tapMult: Decimal;
  tapPct: number;
  tapValue: Decimal;
  costMult: number;
  costGrowth: number[];
  upgradeCostMult: number;
  starFreq: number;
  starDur: number;
  starPow: number;
  starAuto: boolean;
  achPer: number;
  achMult: number;
  constMult: Decimal;
  constGain: Decimal;
  constExp: number;
  milestoneMult: number;
  autoTapRate: number;
  autoSpeed: number;
  offlineHours: number;
  keepGenTiers: number;
  startParticles: number;
  energyMult: Decimal;
  energyExp: number;
  dimGenMult: number;
  shardGain: number;
  challengesUnlocked: boolean[];
}

export function milestoneCount(count: number): number {
  let n = 0;
  for (const m of BALANCE.milestones) if (count >= m) n++;
  const last = BALANCE.milestones[BALANCE.milestones.length - 1];
  if (count >= last) n += Math.floor((count - last) / BALANCE.milestoneEvery);
  return n;
}

/** 次の節目の台数と直前の節目 */
export function nextMilestone(count: number): { prev: number; next: number } {
  let prev = 0;
  for (const m of BALANCE.milestones) {
    if (count < m) return { prev, next: m };
    prev = m;
  }
  const last = BALANCE.milestones[BALANCE.milestones.length - 1];
  const k = Math.floor((count - last) / BALANCE.milestoneEvery);
  return { prev: last + k * BALANCE.milestoneEvery, next: last + (k + 1) * BALANCE.milestoneEvery };
}

export function computeMods(s: GameState): Mods {
  const n = GENERATORS.length;
  const genMultNum = new Array<number>(n).fill(1); // 小さい倍率は number で集計
  const synergy: Array<[number, number, number]> = [];
  let tapMult = 1;
  let tapPct = 0;
  let globalNum = 1;
  let starFreq = 1;
  let starDur = 1;
  let starPow = 1;
  let achPer: number = BALANCE.achievementBonus;
  let upgradeCostMult = 1;
  let synergyMult = 1;

  const noUpg = hasRule(s, 'noUpgrades');
  if (!noUpg) {
    for (const u of UPGRADES) {
      if (!s.upgrades.has(u.id)) continue;
      const e = u.effect;
      switch (e.type) {
        case 'genMult': genMultNum[e.gen] *= e.mult; break;
        case 'synergy': synergy.push([e.target, e.source, e.perUnit]); break;
        case 'tapMult': tapMult *= e.mult; break;
        case 'tapPct': tapPct += e.pct; break;
        case 'globalMult': globalNum *= e.mult; break;
        case 'starFreq': starFreq *= e.mult; break;
        case 'starDur': starDur *= e.mult; break;
        case 'starPow': starPow *= e.mult; break;
        case 'achBonus': achPer += e.add; break;
      }
    }
  }

  let lawProd = new Decimal(1);
  let costMult = 1;
  let startParticles = 0;
  let keepGenTiers = 0;
  let offlineHours: number = BALANCE.offlineCapHours;
  let starAuto = false;
  let constGain = 1;
  let constExp: number = BALANCE.constantEffectExp;
  let autoTapRate = 0;
  let perBB = 0;
  let perRunTimeMax = 1;
  let constRunMax = 1;
  let constRunSec = 300;
  let milestoneMult: number = BALANCE.milestoneMult;
  let genPow = 1;
  let autoSpeed = 1;
  const challengesUnlocked = CHALLENGES.map(() => false);

  for (const e of lawEffects(s)) {
    switch (e.type) {
      case 'prodMult': lawProd = lawProd.mul(e.mult); break;
      case 'tapMult': tapMult *= e.mult; break;
      case 'costMult': costMult *= e.mult; break;
      case 'startParticles': startParticles = Math.max(startParticles, e.amount); break;
      case 'keepGenUpgrades': keepGenTiers = Math.max(keepGenTiers, e.tiers); break;
      case 'offlineHours': offlineHours += e.add; break;
      case 'starFreq': starFreq *= e.mult; break;
      case 'starAuto': starAuto = true; break;
      case 'constGain': constGain *= e.mult; break;
      case 'constExp': constExp += e.add; break;
      case 'achBonus': achPer += e.add; break;
      case 'autoTap': autoTapRate += e.add; break;
      case 'perBigBang': perBB += e.per; break;
      case 'perRunTime': perRunTimeMax *= e.maxMult; break;
      case 'milestoneMult': milestoneMult += e.add; break;
      case 'genPow': genPow += e.add; break;
      case 'autoSpeed': autoSpeed *= e.mult; break;
      case 'constPerRunTime': constRunMax *= e.maxMult; constRunSec = e.seconds; break;
      case 'unlockChallenges': for (let i = e.from; i < e.to; i++) challengesUnlocked[i] = true; break;
    }
  }
  // 挑戦の解放は「無法」中でも維持
  if (hasRule(s, 'noLaws')) {
    for (const node of LAW_TREE) {
      if (!s.laws.has(node.id)) continue;
      for (const e of node.effects) if (e.type === 'unlockChallenges') for (let i = e.from; i < e.to; i++) challengesUnlocked[i] = true;
    }
  }
  if (s.lawRepeat > 0 && !hasRule(s, 'noLaws') && s.laws.has(LAW_REPEAT.req)) lawProd = lawProd.mul(Decimal.pow(LAW_REPEAT.mult, s.lawRepeat));

  const costGrowthAdd = { v: 0 };
  let chalProd = 1;
  let runTimeMax = 1;
  for (const r of chalRewards(s)) {
    switch (r.type) {
      case 'genMult': for (let i = 0; i < n; i++) genMultNum[i] *= r.mult; break;
      case 'upgradeCost': upgradeCostMult *= r.mult; break;
      case 'lowGenMult': for (let i = 0; i < 4; i++) genMultNum[i] *= r.mult; break;
      case 'costGrowth': costGrowthAdd.v -= r.sub; break;
      case 'starPow': starPow *= r.mult; break;
      case 'milestoneMult': milestoneMult += r.add; break;
      case 'achBonus': achPer += r.add; break;
      case 'runTimeMult': runTimeMax *= r.maxMult; break;
      case 'prodMult': chalProd *= r.mult; break;
      case 'synergyMult': synergyMult *= r.mult; break;
      case 'constGain': constGain *= r.mult; break;
      case 'constExp': constExp += r.add; break;
    }
  }
  if (hasRule(s, 'heavyCost')) costGrowthAdd.v += 0.1;
  if (hasRule(s, 'noMilestones')) milestoneMult = 1;
  if (hasRule(s, 'noAchievements')) achPer = 0;
  if (hasRule(s, 'weakPow')) genPow *= 0.8;

  let dimProd = new Decimal(1);
  let energyExp: number = BALANCE.energyExp;
  let dimGenMult = 1;
  let shardGain = 1;
  for (const e of dimEffects(s)) {
    switch (e.type) {
      case 'prodMult': dimProd = dimProd.mul(e.mult); break;
      case 'constGain': constGain *= e.mult; break;
      case 'dimGenMult': dimGenMult *= e.mult; break;
      case 'energyExp': energyExp += e.add; break;
      case 'offlineHours': offlineHours += e.add; break;
      case 'shardGain': shardGain *= e.mult; break;
      case 'constExp': constExp += e.add; break;
      default: break;
    }
  }

  // 実績
  const achMult = 1 + s.achievements.size * achPer;
  // 宇宙定数
  const constMult = s.constantsEver.mul(BALANCE.constantEffectPer).add(1).pow(constExp);
  // 次元エネルギー
  const energyMult = s.energy.add(1).pow(energyExp);
  // 流れ星バフ
  const buff = s.time < s.buffUntil ? s.buffMult : 1;
  const runTime = s.time - s.runStart;
  const runFrac = Math.min(1, runTime / 3600);
  const runTimeMult = (1 + (perRunTimeMax - 1) * runFrac) * (1 + (runTimeMax - 1) * Math.min(1, runTime / 7200));
  const decay = hasRule(s, 'decay') ? Math.pow(0.5, runTime / 600) : 1;

  const global = new Decimal(globalNum * achMult * chalProd * buff * runTimeMult * decay * (1 + perBB * Math.min(s.bigBangs, BALANCE.perBigBangCap)))
    .mul(lawProd)
    .mul(dimProd)
    .mul(constMult)
    .mul(energyMult);

  // 装置ごと
  const genMult: Decimal[] = [];
  const genProd: Decimal[] = [];
  let total = new Decimal(0);
  const lastOnly = hasRule(s, 'lastBoughtOnly');
  for (let i = 0; i < n; i++) {
    let m = genMultNum[i] * Math.pow(milestoneMult, milestoneCount(s.gens[i]));
    for (const [t, src, per] of synergy) if (t === i) m *= 1 + per * synergyMult * s.gens[src];
    const gm = new Decimal(m);
    genMult.push(gm);
    let p = s.gens[i] > 0 ? GEN_BASE_PROD[i].mul(s.gens[i]).mul(gm).mul(global) : D0;
    if (lastOnly && i !== s.lastBoughtGen) p = D0;
    genProd.push(p);
    total = total.add(p);
  }
  const pps = genPow === 1 || total.lte(0) ? total : total.pow(genPow);

  const noTap = hasRule(s, 'noTap');
  const tapMultD = new Decimal(tapMult).mul(achMult).mul(lawProd.pow(0.5)).mul(dimProd.pow(0.5));
  const tapValue = noTap ? D0 : tapMultD.mul(BALANCE.tapBase).add(pps.mul(tapPct));

  const constRun = 1 + (constRunMax - 1) * Math.min(1, runTime / constRunSec);
  const constGainD = new Decimal(constGain * constRun).mul(s.energy.add(1).pow(BALANCE.energyConstExp));

  return {
    genMult,
    genProd,
    global,
    pps,
    genPow,
    tapMult: tapMultD,
    tapPct,
    tapValue,
    costMult,
    costGrowth: GENERATORS.map((g) => g.costGrowth + costGrowthAdd.v),
    upgradeCostMult,
    starFreq,
    starDur,
    starPow,
    starAuto,
    achPer,
    achMult,
    constMult,
    constGain: constGainD,
    constExp,
    milestoneMult,
    autoTapRate: s.autoUnlocked.has('autoTap') ? AUTO_TAP_BASE_RATE + autoTapRate : 0,
    autoSpeed,
    offlineHours,
    keepGenTiers,
    startParticles,
    energyMult,
    energyExp,
    dimGenMult,
    shardGain,
    challengesUnlocked,
  };
}

// ---------------------------------------------------------------- 価格
export function genCost(m: Mods, gi: number, owned: number, amount: number): Decimal {
  const r = new Decimal(m.costGrowth[gi]);
  const start = GEN_BASE_COST[gi].mul(m.costMult);
  return Decimal.sumGeometricSeries(amount, start, r, owned);
}

export function genMaxAffordable(m: Mods, gi: number, owned: number, money: Decimal): number {
  const r = new Decimal(m.costGrowth[gi]);
  const start = GEN_BASE_COST[gi].mul(m.costMult);
  const n = Decimal.affordGeometricSeries(money, start, r, owned);
  return Math.max(0, Math.floor(n.toNumber()));
}

export function upgradeCost(m: Mods, u: UpgradeDef): Decimal {
  return new Decimal(u.cost).mul(m.upgradeCostMult);
}

export function lawRepeatCost(s: GameState): Decimal {
  return Decimal.pow(LAW_REPEAT.costGrowth, s.lawRepeat).mul(LAW_REPEAT.baseCost);
}

export function dimRepeatCost(s: GameState): Decimal {
  return Decimal.pow(DIM_REPEAT.costGrowth, s.dimRepeat).mul(DIM_REPEAT.baseCost);
}

export function dimGenCost(gi: number, bought: number, amount = 1): Decimal {
  const d = DIM_GENERATORS[gi];
  return Decimal.sumGeometricSeries(amount, d.baseCost, d.costGrowth, bought).ceil();
}

export function dimGenMaxAffordable(gi: number, bought: number, money: Decimal): number {
  const d = DIM_GENERATORS[gi];
  return Math.max(0, Math.floor(Decimal.affordGeometricSeries(money, d.baseCost, d.costGrowth, bought).toNumber()));
}

export function dimGenRate(s: GameState, m: Mods, gi: number): Decimal {
  const g = s.dimGens[gi];
  if (g.amount.lte(0)) return D0;
  let mult = Decimal.pow(DIM_MILESTONE_MULT, Math.floor(g.bought / DIM_MILESTONE_EVERY)).mul(m.dimGenMult);
  if (gi === 0) mult = mult.mul(Decimal.pow(DIM_REPEAT.mult, s.dimRepeat));
  return g.amount.mul(DIM_GENERATORS[gi].baseProd).mul(mult);
}

// ---------------------------------------------------------------- 周回の獲得量
export function bigBangRequirement(s: GameState): Decimal {
  if (s.challenge !== null) return new Decimal(CHALLENGES[s.challenge].goal);
  return new Decimal(BALANCE.bigBangReq);
}

export function canBigBang(s: GameState): boolean {
  return s.runTotal.gte(bigBangRequirement(s));
}

export function constantsGain(s: GameState, m: Mods): Decimal {
  if (!canBigBang(s)) return D0;
  const g = s.runTotal.div(BALANCE.bigBangReq).max(1).pow(BALANCE.bigBangGainExp).mul(BALANCE.bigBangGainMult).mul(m.constGain).floor();
  return g.max(1);
}

/** 次の宇宙定数+1に必要な粒子 */
export function nextConstantAt(s: GameState, m: Mods): Decimal {
  const g = constantsGain(s, m).add(1);
  return g.div(m.constGain).div(BALANCE.bigBangGainMult).pow(1 / BALANCE.bigBangGainExp).mul(BALANCE.bigBangReq);
}

export function canAscend(s: GameState): boolean {
  return s.challenge === null && s.runTotal.gte(BALANCE.ascendReq);
}

export function shardsGain(s: GameState, m: Mods): Decimal {
  if (!canAscend(s)) return D0;
  const lg = s.runTotal.log10().sub(100).div(BALANCE.ascendGainDiv);
  return Decimal.pow(10, lg).mul(BALANCE.ascendGainMult).mul(m.shardGain).mul(s.energy.add(1).pow(BALANCE.energyShardExp)).floor().max(1);
}

export function multiverseReady(s: GameState): boolean {
  return s.shardsEver.gte(BALANCE.multiverseReqShardsEver) && s.ascensions >= BALANCE.multiverseReqAscensions;
}

export function offlineCapSeconds(m: Mods): number {
  return m.offlineHours * 3600;
}
