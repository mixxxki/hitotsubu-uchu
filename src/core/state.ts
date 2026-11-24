import Decimal from 'break_eternity.js';
import { GENERATORS, DIM_GENERATORS } from '../data/generators.ts';

export type Notation = 'sci' | 'suffix';
export type AutoBBMode = 'constants' | 'time' | 'multiple';

export interface DimGenState {
  amount: Decimal;
  bought: number;
}

export interface StarState {
  id: number;
  expiresAt: number; // state.time 基準
}

export interface GameState {
  version: number;
  /** 経過ゲーム時間（秒）。放置分も含む */
  time: number;

  // ---- 粒子層 ----
  particles: Decimal;
  runTotal: Decimal; // このビッグバン周回の累計
  allTotal: Decimal; // 全期間の累計
  gens: number[];
  upgrades: Set<string>;
  runStart: number; // 周回開始時の time
  lastBoughtGen: number;

  // ---- タップ／流れ星 ----
  taps: number;
  starsCaught: number;
  nextStarAt: number;
  star: StarState | null;
  starSeq: number;
  buffUntil: number;
  buffMult: number;
  autoTapAcc: number;

  // ---- 実績 ----
  achievements: Set<string>;
  exported: boolean;
  longestOffline: number;
  fastestBigBang: number;

  // ---- ビッグバン層 ----
  bigBangs: number; // この次元上昇周回内
  bigBangsEver: number;
  constants: Decimal;
  constantsEver: Decimal; // この次元上昇周回での累計（倍率に使う）
  constantsAllTime: Decimal;
  laws: Set<string>;
  lawRepeat: number;
  challenge: number | null;
  challengesDone: Set<number>;

  // ---- 次元層 ----
  ascensions: number;
  shards: Decimal;
  shardsEver: Decimal;
  dimGens: DimGenState[];
  energy: Decimal;
  dimUpgrades: Set<string>;
  dimRepeat: number;
  ascRunTotalShards: Decimal;

  // ---- 多元宇宙（枠） ----
  multiverse: { unlocked: boolean; count: number; potential: Decimal; upgrades: Set<string> };

  // ---- 自動化 ----
  autoUnlocked: Set<string>;
  auto: {
    tap: boolean;
    gens: boolean[];
    upgrades: boolean;
    bigBang: boolean;
    bigBangMode: AutoBBMode;
    bigBangValue: number;
    dim: boolean;
    ascend: boolean;
    ascendValue: number; // 獲得する欠片がこの値以上
  };
  autoAcc: number;

  // ---- 設定 ----
  settings: {
    notation: Notation;
    floaters: boolean;
  };
  lastSave: number; // 実時間 ms
}

export const SAVE_VERSION = 1;

export function newDimGens(): DimGenState[] {
  return DIM_GENERATORS.map(() => ({ amount: new Decimal(0), bought: 0 }));
}

export function newState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    time: 0,
    particles: new Decimal(0),
    runTotal: new Decimal(0),
    allTotal: new Decimal(0),
    gens: GENERATORS.map(() => 0),
    upgrades: new Set(),
    runStart: 0,
    lastBoughtGen: -1,
    taps: 0,
    starsCaught: 0,
    nextStarAt: 45,
    star: null,
    starSeq: 0,
    buffUntil: 0,
    buffMult: 1,
    autoTapAcc: 0,
    achievements: new Set(),
    exported: false,
    longestOffline: 0,
    fastestBigBang: Infinity,
    bigBangs: 0,
    bigBangsEver: 0,
    constants: new Decimal(0),
    constantsEver: new Decimal(0),
    constantsAllTime: new Decimal(0),
    laws: new Set(),
    lawRepeat: 0,
    challenge: null,
    challengesDone: new Set(),
    ascensions: 0,
    shards: new Decimal(0),
    shardsEver: new Decimal(0),
    dimGens: newDimGens(),
    energy: new Decimal(0),
    dimUpgrades: new Set(),
    dimRepeat: 0,
    ascRunTotalShards: new Decimal(0),
    multiverse: { unlocked: false, count: 0, potential: new Decimal(0), upgrades: new Set() },
    autoUnlocked: new Set(),
    auto: {
      tap: true,
      gens: GENERATORS.map(() => true),
      upgrades: true,
      bigBang: false,
      bigBangMode: 'constants',
      bigBangValue: 10,
      dim: true,
      ascend: false,
      ascendValue: 2,
    },
    autoAcc: 0,
    settings: { notation: 'sci', floaters: true },
    lastSave: now,
  };
}
