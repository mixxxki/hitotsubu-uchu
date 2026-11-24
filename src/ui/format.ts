import Decimal from 'break_eternity.js';
import type { Notation } from '../core/state.ts';

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

let notation: Notation = 'sci';
export function setNotation(n: Notation): void {
  notation = n;
}

function small(n: number, decimals: number): string {
  if (n < 1000) {
    const d = n < 10 ? decimals : n < 100 ? Math.min(decimals, 1) : 0;
    const v = d === 0 ? Math.floor(n) : Math.floor(n * 10 ** d) / 10 ** d;
    return v.toFixed(d);
  }
  return Math.floor(n).toLocaleString('en-US');
}

/** 数値の表示。decimals は 1000 未満のときの小数桁 */
export function fmt(x: Decimal | number, decimals = 0): string {
  const d = typeof x === 'number' ? new Decimal(x) : x;
  if (d.isNan()) return 'NaN';
  if (d.sign < 0) return '-' + fmt(d.neg(), decimals);
  if (d.layer === 0 && d.mag < 1e6) return small(d.mag, decimals);
  if (d.layer >= 2 || (d.layer === 1 && d.mag >= 1e9)) return d.toString();
  const e = Math.floor(d.log10().toNumber());
  if (notation === 'suffix') {
    const k = Math.floor(e / 3);
    if (k < SUFFIX.length) {
      const m = d.div(Decimal.pow(1000, k)).toNumber();
      const digits = m >= 100 ? 1 : 2;
      return `${(Math.floor(m * 10 ** digits) / 10 ** digits).toFixed(digits)}${SUFFIX[k]}`;
    }
  }
  let m = d.div(Decimal.pow(10, e)).toNumber();
  if (m >= 9.995) m = 9.99;
  return `${(Math.floor(m * 100) / 100).toFixed(2)}e${e}`;
}

export function fmtTime(sec: number): string {
  if (!isFinite(sec)) return '—';
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return h > 0 ? `${d}日${h}時間` : `${d * 24 > 72 ? `${d}日` : `${d * 24}時間`}`;
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

export function fmtMult(x: Decimal | number): string {
  return '×' + fmt(x, 2);
}
