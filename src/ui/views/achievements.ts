// 実績タブ
import type { Game } from '../../core/game.ts';
import { ACHIEVEMENTS } from '../../data/achievements.ts';
import { h, setClass, setText } from '../dom.ts';
import { KIND_ICONS } from '../icons.ts';
import { fmt } from '../format.ts';
import { openSheet } from '../overlay.ts';

export class AchievementsView {
  el: HTMLElement;
  private cells: HTMLButtonElement[] = [];
  private count: HTMLElement;
  private bonus: HTMLElement;
  seen = 0;

  private game: Game;

  constructor(game: Game) {
    this.game = game;
    this.el = h('section', { class: 'view', 'data-view': 'ach' });
    this.count = h('div', { class: 'big-num' });
    this.bonus = h('div', { class: 'small muted' });
    this.el.append(h('div', { class: 'card' }, [h('div', { class: 'small muted' }, '実績'), this.count, this.bonus]));
    const grid = h('div', { class: 'grid' });
    ACHIEVEMENTS.forEach((a, i) => {
      const c = h('button', { class: 'cell locked', type: 'button', 'aria-label': a.name, html: KIND_ICONS.ach });
      c.addEventListener('click', () => {
        const got = this.game.s.achievements.has(a.id);
        openSheet(
          h('div', {}, [
            h('div', { class: 'sheet-icon', html: KIND_ICONS.ach, style: `color:${got ? 'var(--star)' : 'var(--dim)'}` }),
            h('h2', {}, a.name),
            h('p', { class: 'desc' }, a.desc),
            h('div', { class: got ? 'starc' : 'muted' }, got ? `達成済み：全体倍率+${fmt(this.game.mods.achPer * 100, 1)}%` : `未達成（達成で全体倍率+${fmt(this.game.mods.achPer * 100, 1)}%）`),
          ]),
        );
      });
      void i;
      this.cells.push(c);
      grid.append(c);
    });
    this.el.append(grid);
  }

  update(): void {
    const { s, mods } = this.game;
    ACHIEVEMENTS.forEach((a, i) => setClass(this.cells[i], s.achievements.has(a.id) ? 'cell ach-owned' : 'cell locked'));
    setText(this.count, `${s.achievements.size} / ${ACHIEVEMENTS.length}`);
    setText(this.bonus, `1個ごとに+${fmt(mods.achPer * 100, 1)}%　現在 ×${fmt(mods.achMult, 2)}`);
    this.seen = s.achievements.size;
  }
}
