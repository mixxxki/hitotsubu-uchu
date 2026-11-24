// ゲームループ・放置計算・自動保存
import Decimal from 'break_eternity.js';
import { type GameState, newState } from './state.ts';
import { type Mods, computeMods, offlineCapSeconds } from './formulas.ts';
import { tick, slowCheck } from './tick.ts';
import { scheduleStar, gainTracker } from './actions.ts';
import { saveLocal, loadLocal } from './save.ts';
import { setMuted } from './events.ts';
import { BALANCE } from '../data/balance.ts';

export interface OfflineReport {
  seconds: number; // 計算した秒数
  elapsed: number; // 実際に留守だった秒数
  cap: number;
  bigBangs: number;
  ascensions: number;
  achievements: number;
  capped: boolean;
  gained: Decimal;
  shardsGained: Decimal;
  constantsGained: Decimal;
}

export class Game {
  s: GameState;
  mods: Mods;
  private acc = 0;
  private slowAcc = 0;
  private last = 0;
  private saveTimer = 0;
  private running = false;

  constructor() {
    this.s = loadLocal() ?? newState();
    this.mods = computeMods(this.s);
  }

  /** 最終保存からの差分を一括計算 */
  applyOffline(now = Date.now()): OfflineReport | null {
    const s = this.s;
    const elapsed = Math.max(0, (now - s.lastSave) / 1000);
    if (elapsed < 1) return null;
    const cap = offlineCapSeconds(this.mods);
    const secs = Math.min(elapsed, cap);
    gainTracker.total = new Decimal(0);
    const shards0 = s.shardsEver;
    const const0 = s.constantsAllTime;
    const bb0 = s.bigBangsEver;
    const asc0 = s.ascensions;
    const ach0 = s.achievements.size;
    // 流れ星の倍率は留守中には持ち越さない
    s.buffUntil = Math.min(s.buffUntil, s.time);
    this.mods = computeMods(s);
    // 1ステップは最大 offlineMaxDt 秒。ステップ数は offlineSteps まで
    const steps = Math.max(1, Math.min(BALANCE.offlineSteps, Math.ceil(secs / BALANCE.offlineMaxDt)));
    const dt = secs / steps;
    setMuted(true);
    try {
      for (let i = 0; i < steps; i++) {
        this.mods = tick(s, dt, { offline: true });
        if (i % 20 === 0) slowCheck(s, this.mods);
      }
    } finally {
      setMuted(false);
    }
    s.longestOffline = Math.max(s.longestOffline, elapsed);
    if (elapsed >= BALANCE.offlineMinSeconds) {
      if (s.star) s.star = null;
      scheduleStar(s, this.mods);
    }
    s.lastSave = now;
    this.mods = computeMods(s);
    slowCheck(s, this.mods);
    // 短い離脱は黙って反映するだけ
    if (elapsed < BALANCE.offlineMinSeconds) return null;
    return {
      seconds: secs,
      elapsed,
      cap,
      bigBangs: s.bigBangsEver - bb0,
      ascensions: s.ascensions - asc0,
      achievements: s.achievements.size - ach0,
      capped: elapsed > cap,
      gained: gainTracker.total,
      shardsGained: s.shardsEver.sub(shards0),
      constantsGained: s.constantsAllTime.sub(const0),
    };
  }

  start(onFrame: (alpha: number) => void): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const step = 1 / BALANCE.tickRate;
    const loop = (t: number) => {
      if (!this.running) return;
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 1) dt = 1; // タブ復帰時などの大きな飛びは放置計算に任せる
      this.acc += dt;
      let n = 0;
      while (this.acc >= step && n < 40) {
        this.mods = tick(this.s, step);
        this.acc -= step;
        n++;
      }
      this.slowAcc += dt;
      if (this.slowAcc >= 0.5) {
        this.slowAcc = 0;
        slowCheck(this.s, this.mods);
      }
      this.saveTimer += dt * 1000;
      if (this.saveTimer >= BALANCE.autosaveMs) {
        this.saveTimer = 0;
        this.save();
      }
      onFrame(this.acc / step);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
  }

  /** 状態が操作で変わったら呼ぶ */
  refresh(): void {
    this.mods = computeMods(this.s);
  }

  save(): void {
    saveLocal(this.s);
  }

  replace(s: GameState): void {
    this.s = s;
    this.refresh();
  }

  hardReset(): void {
    this.s = newState();
    this.refresh();
    this.save();
  }
}
