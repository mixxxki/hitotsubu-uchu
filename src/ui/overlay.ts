// シート（下から出るモーダル）・トースト・浮かぶ数字
import { h } from './dom.ts';

// ---------------------------------------------------------------- シート
let back: HTMLDivElement | null = null;
let sheet: HTMLDivElement | null = null;
let onCloseCb: (() => void) | null = null;
let updater: (() => void) | null = null;

export function openSheet(content: HTMLElement, opts: { onClose?: () => void; update?: () => void } = {}): void {
  closeSheet(true);
  back = h('div', { class: 'sheet-back' });
  sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
  const close = h('button', { class: 'iconbtn sheet-close', type: 'button', 'aria-label': '閉じる', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
  close.addEventListener('click', () => closeSheet());
  sheet.append(h('div', { class: 'grab' }), close, content);
  // 下方向へのスワイプで閉じる
  let sy = -1;
  sheet.addEventListener('touchstart', (e) => {
    sy = sheet && sheet.scrollTop <= 0 ? e.touches[0].clientY : -1;
  }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (sy >= 0 && e.changedTouches[0].clientY - sy > 80) closeSheet();
    sy = -1;
  }, { passive: true });
  back.addEventListener('click', () => closeSheet());
  document.body.append(back, sheet);
  onCloseCb = opts.onClose ?? null;
  updater = opts.update ?? null;
  requestAnimationFrame(() => {
    back?.classList.add('show');
    sheet?.classList.add('show');
  });
}

export function closeSheet(immediate = false): void {
  const b = back;
  const s = sheet;
  if (!b || !s) return;
  back = null;
  sheet = null;
  updater = null;
  const cb = onCloseCb;
  onCloseCb = null;
  if (immediate) {
    b.remove();
    s.remove();
  } else {
    b.classList.remove('show');
    s.classList.remove('show');
    setTimeout(() => {
      b.remove();
      s.remove();
    }, 240);
  }
  cb?.();
}

export function updateSheet(): void {
  updater?.();
}

export function sheetOpen(): boolean {
  return sheet !== null;
}

// ---------------------------------------------------------------- トースト
let toastBox: HTMLDivElement | null = null;
// 同じ種類の通知が短時間に続いたら1件にまとめる
const groups = new Map<string, { el: HTMLElement; n: number; label: string; t: number }>();
export function toastGroup(group: string, label: string, msg: string, tone: '' | 'lime' | 'star' | 'purple' = ''): void {
  const now = performance.now();
  const g = groups.get(group);
  if (g && now - g.t < 1500 && g.el.isConnected) {
    g.n++;
    g.t = now;
    g.el.textContent = g.label.replace("{n}", String(g.n));
    return;
  }
  const el = toast(msg, tone);
  groups.set(group, { el, n: 1, label, t: now });
}

export function toast(msg: string, tone: '' | 'lime' | 'star' | 'purple' = '', ms = 2600): HTMLElement {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const t = h('div', { class: `toast ${tone}` }, msg);
  toastBox.append(t);
  while (toastBox.children.length > 2) toastBox.firstElementChild?.remove();
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, ms);
  return t;
}

// ---------------------------------------------------------------- 浮かぶ数字
const POOL = 24;
let layer: HTMLDivElement | null = null;
const pool: HTMLDivElement[] = [];
let next = 0;
let streak = 0;
let lastFloat = 0;

export function initFloaters(): void {
  layer = h('div', { class: 'floaters' });
  for (let i = 0; i < POOL; i++) {
    const f = h('div', { class: 'floater' });
    layer.append(f);
    pool.push(f);
  }
  document.body.append(layer);
}

export function floatText(x: number, y: number, text: string, big = false): void {
  if (!layer) return;
  const f = pool[next];
  next = (next + 1) % POOL;
  f.getAnimations().forEach((a) => a.cancel());
  f.textContent = text;
  f.className = big ? 'floater big' : 'floater';
  const now = performance.now();
  streak = now - lastFloat < 250 ? (streak + 1) % 4 : 0;
  lastFloat = now;
  const dx = (Math.random() - 0.5) * 100;
  y -= streak * 18;
  const w = text.length * 4.5;
  f.animate(
    [
      { transform: `translate(${x - w}px, ${y - 10}px) scale(0.9)`, opacity: 0 },
      { transform: `translate(${x - w + dx * 0.3}px, ${y - 30}px) scale(1)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${x - w + dx}px, ${y - 110}px) scale(1)`, opacity: 0 },
    ],
    { duration: big ? 1600 : 1000, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
  );
}
