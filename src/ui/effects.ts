// 演出（transform / opacity のみ）
import { h } from './dom.ts';
import { holdToasts } from './overlay.ts';

/** 流れ星を捕まえた位置に十字の光 */
export function starBurst(x: number, y: number): void {
  const el = h('div', {
    class: 'burst',
    html: '<svg viewBox="-20 -20 40 40" width="80" height="80"><path d="M0 -18 L2 -2 L18 0 L2 2 L0 18 L-2 2 L-18 0 L-2 -2 Z" fill="#FFD166"/></svg>',
  });
  el.style.transform = `translate(${x - 40}px, ${y - 40}px)`;
  document.body.append(el);
  const a = el.animate(
    [
      { transform: `translate(${x - 40}px, ${y - 40}px) scale(0.2) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${x - 40}px, ${y - 40}px) scale(1.6) rotate(45deg)`, opacity: 0 },
    ],
    { duration: 520, easing: 'ease-out' },
  );
  a.onfinish = () => el.remove();
}

/** ビッグバン・次元上昇: 核が縮んでから広がる＋色付きの淡い光とリング */
export function prestigeEffect(color: string, duration: number): void {
  holdToasts(duration * 0.8);
  const core = document.querySelector('.core') as HTMLElement | null;
  core?.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(0.2)', offset: 0.3 },
      { transform: 'scale(1.6)', offset: 0.55 },
      { transform: 'scale(1)' },
    ],
    { duration, easing: 'cubic-bezier(0.2,0.8,0.2,1)' },
  );
  const flash = h('div', { class: 'bb-flash' });
  flash.style.background = color;
  document.body.append(flash);
  flash.animate([{ opacity: 0 }, { opacity: 0 , offset: 0.28 }, { opacity: 0.35, offset: 0.35 }, { opacity: 0 }], { duration, easing: 'ease-out' }).onfinish = () => flash.remove();
  if (core) {
    const r = core.getBoundingClientRect();
    const ring = h('div', { class: 'bb-ring' });
    ring.style.borderColor = color;
    const size = r.width;
    ring.style.width = ring.style.height = `${size}px`;
    ring.style.left = `${r.left}px`;
    ring.style.top = `${r.top}px`;
    document.body.append(ring);
    ring.animate([{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(0.3)', opacity: 0.9, offset: 0.3 }, { transform: 'scale(5)', opacity: 0 }], { duration, easing: 'ease-out' }).onfinish = () => ring.remove();
  }
}
