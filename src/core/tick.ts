// 1 tick の進行（生産・次元装置・自動化・流れ星・実績）
import type { GameState } from './state.ts';
import { type Mods, computeMods, hasRule, dimGenRate, constantsGain, shardsGain, canBigBang, canAscend, upgradeCost } from './formulas.ts';
import { gain, tap, buyGen, buyUpgrade, upgradeStatus, catchStar, scheduleStar, bigBang, ascend, buyDimGen } from './actions.ts';
import { checkAchievements } from './achievements.ts';
import { AUTOMATIONS, AUTO_BUY_INTERVAL } from '../data/automation.ts';
import { GENERATORS } from '../data/generators.ts';
import { UPGRADES } from '../data/upgrades.ts';
import { BALANCE } from '../data/balance.ts';
import { emit } from './events.ts';

export interface TickOptions {
  offline?: boolean;
  rnd?: () => number;
}

export function tick(s: GameState, dt: number, opts: TickOptions = {}): Mods {
  const rnd = opts.rnd ?? Math.random;
  let m = computeMods(s);
  s.time += dt;

  // 生産
  gain(s, m.pps.mul(dt));

  // 次元装置（上の段から順に）
  for (let i = s.dimGens.length - 1; i >= 0; i--) {
    const r = dimGenRate(s, m, i).mul(dt);
    if (r.lte(0)) continue;
    if (i === 0) s.energy = s.energy.add(r);
    else s.dimGens[i - 1].amount = s.dimGens[i - 1].amount.add(r);
  }

  // 自動タップ
  if (m.autoTapRate > 0 && s.auto.tap && !hasRule(s, 'noTap')) {
    s.autoTapAcc += m.autoTapRate * dt;
    const n = Math.floor(s.autoTapAcc);
    if (n > 0) {
      s.autoTapAcc -= n;
      tap(s, m, n);
    }
  }

  // 流れ星
  if (!opts.offline) {
    if (s.star && s.time >= s.star.expiresAt) {
      s.star = null;
      scheduleStar(s, m, rnd);
    }
    if (!s.star && s.time >= s.nextStarAt) {
      if (hasRule(s, 'noStars')) {
        scheduleStar(s, m, rnd);
      } else {
        s.starSeq++;
        s.star = { id: s.starSeq, expiresAt: s.time + BALANCE.starLifetime };
        emit({ type: 'starSpawn', id: s.starSeq });
      }
    }
    if (s.star && m.starAuto && s.time >= s.star.expiresAt - BALANCE.starLifetime + 2) catchStar(s, m, true, rnd);
  } else if (s.time >= s.nextStarAt) {
    scheduleStar(s, m, rnd);
  }

  // 自動購入
  // 挑戦の最高到達
  if (s.challenge !== null) {
    const lg = s.runTotal.max(1).log10().toNumber();
    if (lg > (s.challengeBest[s.challenge] ?? 0)) s.challengeBest[s.challenge] = lg;
  }

  // 自動購入（大きな dt でも回数がずれないよう複数回まわす）
  s.autoAcc += dt;
  const interval = AUTO_BUY_INTERVAL / m.autoSpeed;
  let runs = 0;
  while (s.autoAcc >= interval && runs < 8) {
    s.autoAcc -= interval;
    m = runAutomation(s, m);
    runs++;
  }
  if (s.autoAcc >= interval) s.autoAcc = 0;

  return m;
}

export function runAutomation(s: GameState, m: Mods): Mods {
  let changed = false;
  const u = s.autoUnlocked;
  if (u.has('autoUpg') && s.auto.upgrades && !hasRule(s, 'noUpgrades')) {
    const avail = UPGRADES.filter((x) => upgradeStatus(s, m, x) === 'affordable').sort((a, b) => upgradeCost(m, a).cmp(upgradeCost(m, b)));
    for (const x of avail) if (buyUpgrade(s, m, x)) changed = true;
    if (changed) m = computeMods(s);
  }
  if (u.has('autoGen')) {
    for (let i = GENERATORS.length - 1; i >= 0; i--) {
      if (!s.auto.gens[i]) continue;
      if (hasRule(s, 'lastBoughtOnly') && s.lastBoughtGen >= 0 && i !== s.lastBoughtGen) continue;
      if (buyGen(s, m, i, 'max') > 0) changed = true;
    }
    if (changed) m = computeMods(s);
  }
  if (u.has('autoDim') && s.auto.dim) {
    for (let i = s.dimGens.length - 1; i >= 0; i--) buyDimGen(s, i, 'max');
  }
  if (u.has('autoAscend') && s.auto.ascend && canAscend(s)) {
    if (shardsGain(s, m).gte(s.auto.ascendValue)) {
      ascend(s, m);
      return computeMods(s);
    }
  }
  if (u.has('autoBigBang') && s.auto.bigBang && canBigBang(s)) {
    // 「次元上昇できるときは止める」設定なら、取り逃し防止のため止める
    if (!(canAscend(s) && s.auto.bigBangHold)) {
      const g = constantsGain(s, m);
      const runTime = s.time - s.runStart;
      let ok = false;
      if (s.challenge !== null) ok = true;
      else if (s.auto.bigBangMode === 'constants') ok = g.gte(s.auto.bigBangValue);
      else if (s.auto.bigBangMode === 'time') ok = runTime >= s.auto.bigBangValue;
      else ok = g.gte(s.constantsEver.max(1).mul(s.auto.bigBangValue));
      if (ok) {
        bigBang(s, m);
        return computeMods(s);
      }
    }
  }
  return m;
}

/** 低頻度の処理（実績・自動化解放）。1秒に1回ほど呼ぶ */
export function slowCheck(s: GameState, m: Mods): void {
  for (const a of AUTOMATIONS) {
    if (s.autoUnlocked.has(a.id)) continue;
    const ok = a.cond.type === 'bigBangsEver' ? s.bigBangsEver >= a.cond.n : s.ascensions >= a.cond.n;
    if (ok) {
      s.autoUnlocked.add(a.id);
      emit({ type: 'autoUnlocked', id: a.id });
    }
  }
  checkAchievements(s, m);
}
