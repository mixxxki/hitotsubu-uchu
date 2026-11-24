// コア→UI への通知。コアは UI を知らず、ここに投げるだけ。
import type Decimal from 'break_eternity.js';

export type GameEvent =
  | { type: 'achievement'; id: string }
  | { type: 'starCaught'; kind: 'buff' | 'lump'; amount?: Decimal; mult?: number; duration?: number; auto: boolean }
  | { type: 'starSpawn'; id: number }
  | { type: 'bigBang'; gain: Decimal; challengeDone: number | null }
  | { type: 'ascend'; gain: Decimal }
  | { type: 'autoUnlocked'; id: string }
  | { type: 'multiverse' };

type Listener = (e: GameEvent) => void;
const listeners: Listener[] = [];

export function onEvent(fn: Listener): void {
  listeners.push(fn);
}

export function emit(e: GameEvent): void {
  for (const l of listeners) l(e);
}
