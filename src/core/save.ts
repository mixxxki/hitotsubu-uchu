// 保存・読み込み・エクスポート/インポート
import Decimal from 'break_eternity.js';
import { type GameState, newState, SAVE_VERSION } from './state.ts';
import { CHALLENGES } from '../data/challenges.ts';

export const SAVE_KEY = 'hitotsubu-uchu-save';

// Decimal は toJSON を持つため、置換前の生の値（this[k]）で判定する
function replacer(this: Record<string, unknown>, k: string, v: unknown): unknown {
  const raw = this[k];
  if (raw instanceof Decimal) return { __d: raw.toString() };
  if (v instanceof Set) return { __s: [...v] };
  if (v === Infinity) return { __inf: 1 };
  return v;
}

function reviver(_k: string, v: unknown): unknown {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.__d === 'string') return new Decimal(o.__d);
    if (Array.isArray(o.__s)) return new Set(o.__s);
    if (o.__inf === 1) return Infinity;
  }
  return v;
}

export function serialize(s: GameState): string {
  return JSON.stringify(s, replacer);
}

/** 既定値に読み込んだ値を重ねる（項目追加に強くする） */
function merge<T>(base: T, loaded: unknown): T {
  if (loaded === undefined || loaded === null) return base;
  if (base instanceof Decimal) {
    // 旧形式（文字列）のセーブも救う
    const d = loaded instanceof Decimal ? loaded : typeof loaded === 'string' || typeof loaded === 'number' ? new Decimal(loaded) : null;
    return (d && !d.isNan() ? d : base) as T;
  }
  if (base instanceof Set) return (loaded instanceof Set ? loaded : base) as T;
  if (Array.isArray(base)) {
    if (!Array.isArray(loaded)) return base;
    return base.map((b, i) => merge(b, loaded[i])) as T;
  }
  if (typeof base === 'object' && base !== null) {
    if (typeof loaded !== 'object') return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const k of Object.keys(out)) out[k] = merge(out[k], (loaded as Record<string, unknown>)[k]);
    return out as T;
  }
  if (base === null) return loaded as T;
  return (typeof loaded === typeof base ? loaded : base) as T;
}

export function deserialize(json: string): GameState {
  const raw = JSON.parse(json, reviver) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') throw new Error('セーブデータの形式が正しくありません');
  if (raw.version > SAVE_VERSION) throw new Error('新しいバージョンのセーブデータです');
  for (const k of ['particles', 'gens', 'time', 'lastSave']) if (!(k in raw)) throw new Error('セーブデータが欠けています');
  const base = newState();
  // null を許す項目
  const s = merge(base, raw);
  s.challenge = typeof raw.challenge === 'number' && raw.challenge >= 0 && raw.challenge < CHALLENGES.length ? raw.challenge : null;
  const star = raw.star as GameState['star'];
  s.star = star && typeof star.id === 'number' ? star : null;
  s.version = SAVE_VERSION;
  return s;
}

export function saveLocal(s: GameState, now = Date.now()): void {
  s.lastSave = now;
  try {
    localStorage.setItem(SAVE_KEY, serialize(s));
  } catch {
    /* 容量超過など */
  }
}

/** 読み込みに失敗したセーブを退避したとき true（UI で知らせる） */
export const loadStatus = { failed: false };

export function loadLocal(): GameState | null {
  let j: string | null = null;
  try {
    j = localStorage.getItem(SAVE_KEY);
    if (!j) return null;
    return deserialize(j);
  } catch {
    // 新しい版のセーブや壊れたセーブを、上書きされる前に退避する
    try {
      if (j) localStorage.setItem(SAVE_KEY + '-corrupt', j);
    } catch {
      /* noop */
    }
    loadStatus.failed = true;
    return null;
  }
}

function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(b64: string): string {
  const bin = atob(b64.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportSave(s: GameState): string {
  return b64encode(serialize(s));
}

export function importSave(text: string): GameState {
  return deserialize(b64decode(text));
}

/** インポート前などに直前のセーブを退避する */
export function backupLocal(): void {
  try {
    const j = localStorage.getItem(SAVE_KEY);
    if (j) localStorage.setItem(SAVE_KEY + '-backup', j);
  } catch {
    /* noop */
  }
}
