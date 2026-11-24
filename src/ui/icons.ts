// SVG アイコン（currentColor で着色。グラデーション・絵文字は使わない）
import type { GenIcon } from '../data/generators.ts';
import type { UpgradeKind } from '../data/upgrades.ts';

const sv = (vb: string, body: string) => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const GEN_ICONS: Record<GenIcon, string> = {
  dust: sv('0 0 40 40', '<g fill="currentColor" stroke="none"><circle cx="12" cy="14" r="1.6"/><circle cx="22" cy="10" r="1.1"/><circle cx="28" cy="18" r="1.8"/><circle cx="17" cy="22" r="2.2"/><circle cx="25" cy="28" r="1.3"/><circle cx="11" cy="28" r="1.1"/><circle cx="31" cy="27" r="0.9"/><circle cx="20" cy="31" r="0.9"/></g>'),
  pebble: sv('0 0 40 40', '<path d="M10 23c0-6 5-11 11-11s10 4 10 9-4 9-11 9-10-3-10-7z"/><circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none"/>'),
  rock: sv('0 0 40 40', '<path d="M8 25l5-12 10-4 9 7 1 10-9 6-11-1z"/><path d="M13 13l6 8 4-12M19 21l-11 4M19 21l3 10M19 21l13-5"/>'),
  moon: sv('0 0 40 40', '<path d="M25 8a12 12 0 1 0 7 20A10 10 0 0 1 25 8z"/>'),
  planet: sv('0 0 40 40', '<circle cx="20" cy="20" r="8"/><ellipse cx="20" cy="20" rx="16" ry="5" transform="rotate(-18 20 20)"/>'),
  star: sv('0 0 40 40', '<circle cx="20" cy="20" r="6"/><path d="M20 5v5M20 30v5M5 20h5M30 20h5M9.5 9.5l3.5 3.5M27 27l3.5 3.5M9.5 30.5l3.5-3.5M27 13l3.5-3.5"/>'),
  cluster: sv('0 0 40 40', '<circle cx="20" cy="15" r="3"/><circle cx="13" cy="23" r="2.5"/><circle cx="26" cy="24" r="3.5"/><circle cx="19" cy="29" r="1.8"/><circle cx="29" cy="12" r="1.5"/><circle cx="10" cy="13" r="1.3"/>'),
  galaxy: sv('0 0 40 40', '<path d="M20 20c2-2 5 0 4 3-1 4-7 5-10 1-3-5 1-11 8-11 8 0 12 8 9 14"/><path d="M20 20c-2 2-5 0-4-3 1-4 7-5 10-1 3 5-1 11-8 11-8 0-12-8-9-14"/>'),
};

export const KIND_ICONS: Record<Exclude<UpgradeKind, 'gen'>, string> = {
  synergy: sv('0 0 24 24', '<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M11 12h2"/>'),
  tap: sv('0 0 24 24', '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>'),
  global: sv('0 0 24 24', '<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>'),
  star: sv('0 0 24 24', '<path d="M4 20L15 9"/><circle cx="17.5" cy="6.5" r="2.5"/>'),
  ach: sv('0 0 24 24', '<path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9z"/><path d="M9 12l2 2 4-4"/>'),
};

/** 装置強化セル: 装置アイコン + 段数の点 */
export function genTierIcon(icon: GenIcon, tier: number): string {
  const base = GEN_ICONS[icon].replace('<svg ', '<svg ');
  const dots = Array.from({ length: tier + 1 }, (_, i) => `<circle cx="${20 - tier * 2.5 + i * 5}" cy="38.5" r="1.4" fill="currentColor" stroke="none"/>`).join('');
  return base.replace('</svg>', `${dots}</svg>`).replace('viewBox="0 0 40 40"', 'viewBox="0 -1 40 42"');
}

export const ICON = {
  gear: sv('0 0 24 24', '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  tabGen: sv('0 0 24 24', '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><circle cx="20" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
  tabUpg: sv('0 0 24 24', '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  tabAuto: sv('0 0 24 24', '<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>'),
  tabAch: sv('0 0 24 24', '<path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9z"/><circle cx="12" cy="12" r="2.5"/>'),
  tabCosmos: sv('0 0 24 24', '<circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(30 12 12)"/>'),
  law: sv('0 0 24 24', '<circle cx="12" cy="12" r="6"/><path d="M12 6v12M6 12h12"/>'),
  lawOwned: sv('0 0 24 24', '<circle cx="12" cy="12" r="5" fill="currentColor"/>'),
  lock: sv('0 0 24 24', '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>'),
  infinity: sv('0 0 24 24', '<path d="M12 12c-2-3-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1 6-4zm0 0c2 3 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1-6 4z"/>'),
};

export function coreSvg(): string {
  return `<svg viewBox="-100 -100 200 200" aria-hidden="true">
  <circle r="96" fill="none" stroke="#C6F432" stroke-opacity="0.12" stroke-width="1"/>
  <g class="orbit"><circle r="78" fill="none" stroke="#C6F432" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2 9"/><circle cx="78" cy="0" r="3" fill="#C6F432"/></g>
  <g class="orbit2"><circle r="58" fill="none" stroke="#A78BFA" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="1 6"/><circle cx="0" cy="-58" r="2.2" fill="#A78BFA"/></g>
  <circle r="40" fill="#C6F432" fill-opacity="0.08" stroke="#C6F432" stroke-opacity="0.5" stroke-width="1"/>
  <circle class="nucleus" r="24" fill="#C6F432"/>
</svg>`;
}

export function starSvg(): string {
  return `<svg viewBox="-32 -32 64 64" aria-hidden="true">
  <line x1="-30" y1="-30" x2="-4" y2="-4" stroke="#FFD166" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round"/>
  <line x1="-20" y1="-26" x2="-5" y2="-9" stroke="#FFD166" stroke-opacity="0.25" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" fill="#FFD166"/>
</svg>`;
}
