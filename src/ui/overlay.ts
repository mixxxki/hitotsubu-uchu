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
  sheet.append(h('div', { class: 'grab' }), content);
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
export function toast(msg: string, tone: '' | 'lime' | 'star' | 'purple' = '', ms = 2600): void {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const t = h('div', { class: `toast ${tone}` }, msg);
  toastBox.append(t);
  while (toastBox.children.length > 3) toastBox.firstElementChild?.remove();
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, ms);
}

// ---------------------------------------------------------------- 浮かぶ数字
const POOL = 24;
let layer: HTMLDivElement | null = null;
const pool: HTMLDivElement[] = [];
let next = 0;

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
  const dx = (Math.random() - 0.5) * 40;
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
