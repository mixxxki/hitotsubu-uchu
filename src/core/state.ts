import Decimal from 'break_eternity.js';
import { GENERATORS, DIM_GENERATORS } from '../data/generators.ts';
import { CHALLENGES } from '../data/challenges.ts';

export type Notation = 'sci' | 'suffix';
export type AutoBBMode = 'constants' | 'time' | 'multiple';
export type AutoAscMode = 'shards' | 'time' | 'multiple';

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
  /** 挑戦ごとの最高到達（log10） */
  challengeBest: number[];
  /** 宇宙定数の獲得ペース（/分）の過去最高 */
  bestConstRate: Decimal;

  // ---- 次元層 ----
  ascensions: number;
  shards: Decimal;
  shardsEver: Decimal;
  dimGens: DimGenState[];
  energy: Decimal;
  dimUpgrades: Set<string>;
  dimRepeat: number;
  ascRunTotalShards: Decimal; // 未使用（互換のため残す）
  ascStart: number; // 次元上昇周回の開始 time
  lastAscGain: Decimal;

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
    /** モードごとの条件値 */
    bigBangValues: Record<AutoBBMode, number>;
    /** 次元上昇できるときは自動ビッグバンを止める */
    bigBangHold: boolean;
    dim: boolean;
    ascend: boolean;
    ascendMode: AutoAscMode;
    ascendValues: Record<AutoAscMode, number>;
    /** 次元装置の段ごとの自動購入 */
    dimGens: boolean[];
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
    challengeBest: CHALLENGES.map(() => 0),
    bestConstRate: new Decimal(0),
    ascensions: 0,
    shards: new Decimal(0),
    shardsEver: new Decimal(0),
    dimGens: newDimGens(),
    energy: new Decimal(0),
    dimUpgrades: new Set(),
    dimRepeat: 0,
    ascRunTotalShards: new Decimal(0),
    ascStart: 0,
    lastAscGain: new Decimal(0),
    multiverse: { unlocked: false, count: 0, potential: new Decimal(0), upgrades: new Set() },
    autoUnlocked: new Set(),
    auto: {
      tap: true,
      gens: GENERATORS.map(() => true),
      upgrades: true,
      bigBang: false,
      bigBangMode: 'time',
      bigBangValues: { constants: 1000, time: 300, multiple: 1 },
      bigBangHold: true,
      dim: false,
      ascend: false,
      ascendMode: 'multiple',
      ascendValues: { shards: 10, time: 3600, multiple: 1 },
      dimGens: DIM_GENERATORS.map(() => true),
    },
    autoAcc: 0,
    settings: { notation: 'sci', floaters: true },
    lastSave: now,
  };
}
