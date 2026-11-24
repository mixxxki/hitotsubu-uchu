// 自動化タブ
import type { Game } from '../../core/game.ts';
import { AUTOMATIONS, type AutoId } from '../../data/automation.ts';
import { GENERATORS } from '../../data/generators.ts';
import type { AutoBBMode } from '../../core/state.ts';
import { h, setText, toggle } from '../dom.ts';
import { fmt } from '../format.ts';

export class AutomationView {
  el: HTMLElement;
  private cards = new Map<AutoId, { root: HTMLElement; sw: HTMLButtonElement; extra: HTMLElement; title: HTMLElement; desc: HTMLElement }>();
  private tapRate: HTMLElement;
  private genBtns: HTMLButtonElement[] = [];
  seenUnlocked = 0;
  private bbVal!: HTMLInputElement;
  private bbMode!: HTMLSelectElement;
  private ascVal!: HTMLInputElement;

  private game: Game;

  constructor(game: Game) {
    this.game = game;
    this.el = h('section', { class: 'view', 'data-view': 'auto' });
    this.el.append(h('div', { class: 'section-title' }, '周回を重ねると、順に自動化が解放される'));
    this.tapRate = h('span', { class: 'num lime' });

    for (const a of AUTOMATIONS) {
      const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-label': a.name }, [h('i')]);
      const title = h('h3', {}, a.name);
      const desc = h('div', { class: 'small muted' });
      const extra = h('div', {});
      const root = h('div', { class: 'card' }, [h('div', { class: 'auto-row' }, [h('div', { class: 'grow' }, [title, desc]), sw]), extra]);
      sw.addEventListener('click', () => {
        if (!this.game.s.autoUnlocked.has(a.id)) return;
        this.flip(a.id);
      });
      this.cards.set(a.id, { root, sw, extra, title, desc });
      this.el.append(root);
    }

    // 追加設定
    const tapCard = this.cards.get('autoTap')!;
    tapCard.extra.append(h('div', { class: 'small muted', style: 'margin-top:4px' }, ['現在 ', this.tapRate, ' 回/秒']));

    const genCard = this.cards.get('autoGen')!;
    const mg = h('div', { class: 'mini-gens' });
    GENERATORS.forEach((g, i) => {
      const b = h('button', { type: 'button' }, g.name);
      b.addEventListener('click', () => {
        this.game.s.auto.gens[i] = !this.game.s.auto.gens[i];
      });
      this.genBtns.push(b);
      mg.append(b);
    });
    genCard.extra.append(mg);

    const bbCard = this.cards.get('autoBigBang')!;
    this.bbMode = h('select', { 'aria-label': '条件' }) as HTMLSelectElement;
    const opts: Array<[AutoBBMode, string]> = [
      ['constants', '獲得する宇宙定数が◯以上'],
      ['time', '周回の経過秒数が◯以上'],
      ['multiple', '獲得が所持定数の◯倍以上'],
    ];
    for (const [v, l] of opts) this.bbMode.append(h('option', { value: v }, l));
    this.bbVal = h('input', { type: 'number', inputmode: 'decimal', min: '0', step: 'any', 'aria-label': '値' }) as HTMLInputElement;
    this.bbMode.addEventListener('change', () => (this.game.s.auto.bigBangMode = this.bbMode.value as AutoBBMode));
    this.bbVal.addEventListener('change', () => {
      const v = Number(this.bbVal.value);
      if (isFinite(v) && v >= 0) this.game.s.auto.bigBangValue = v;
    });
    bbCard.extra.append(h('div', { class: 'field' }, [this.bbMode, this.bbVal]), h('div', { class: 'small muted', style: 'margin-top:6px' }, '挑戦中は目標達成で自動ビッグバン。次元上昇できるときは止まる。'));

    const ascCard = this.cards.get('autoAscend')!;
    this.ascVal = h('input', { type: 'number', inputmode: 'decimal', min: '1', step: 'any', 'aria-label': '欠片' }) as HTMLInputElement;
    this.ascVal.addEventListener('change', () => {
      const v = Number(this.ascVal.value);
      if (isFinite(v) && v >= 1) this.game.s.auto.ascendValue = v;
    });
    ascCard.extra.append(h('div', { class: 'field' }, [h('span', { class: 'small muted', style: 'flex:none' }, '獲得する欠片が'), this.ascVal, h('span', { class: 'small muted', style: 'flex:none' }, '以上')]));
    this.syncInputs();
  }

  private flip(id: AutoId): void {
    const a = this.game.s.auto;
    switch (id) {
      case 'autoTap': a.tap = !a.tap; break;
      case 'autoGen': {
        const any = a.gens.some((x) => x);
        a.gens = a.gens.map(() => !any);
        break;
      }
      case 'autoUpg': a.upgrades = !a.upgrades; break;
      case 'autoBigBang': a.bigBang = !a.bigBang; break;
      case 'autoDim': a.dim = !a.dim; break;
      case 'autoAscend': a.ascend = !a.ascend; break;
    }
  }

  private isOn(id: AutoId): boolean {
    const a = this.game.s.auto;
    switch (id) {
      case 'autoTap': return a.tap;
      case 'autoGen': return a.gens.some((x) => x);
      case 'autoUpg': return a.upgrades;
      case 'autoBigBang': return a.bigBang;
      case 'autoDim': return a.dim;
      case 'autoAscend': return a.ascend;
    }
  }

  syncInputs(): void {
    const a = this.game.s.auto;
    this.bbMode.value = a.bigBangMode;
    this.bbVal.value = String(a.bigBangValue);
    this.ascVal.value = String(a.ascendValue);
  }

  update(): void {
    const s = this.game.s;
    for (const a of AUTOMATIONS) {
      const c = this.cards.get(a.id)!;
      const un = s.autoUnlocked.has(a.id);
      toggle(c.root, 'locked-box', !un);
      setText(c.desc, un ? a.desc : `解放条件：${a.condDesc}`);
      const on = un && this.isOn(a.id);
      toggle(c.sw, 'on', on);
      c.sw.setAttribute('aria-checked', String(on));
      if (c.sw.disabled !== !un) c.sw.disabled = !un;
      c.extra.style.display = un ? '' : 'none';
    }
    setText(this.tapRate, fmt(this.game.mods.autoTapRate, 1));
    this.genBtns.forEach((b, i) => toggle(b, 'on', s.auto.gens[i]));
    this.seenUnlocked = s.autoUnlocked.size;
  }
}
