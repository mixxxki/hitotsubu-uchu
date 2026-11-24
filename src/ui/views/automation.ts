// 自動化タブ
import type { Game } from '../../core/game.ts';
import { AUTOMATIONS, type AutoId } from '../../data/automation.ts';
import { GENERATORS, DIM_GENERATORS } from '../../data/generators.ts';
import type { AutoBBMode, AutoAscMode } from '../../core/state.ts';
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
  private holdSw!: HTMLButtonElement;
  private ascMode!: HTMLSelectElement;
  private dimBtns: HTMLButtonElement[] = [];

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
      ['time', '周回が◯秒たったら'],
      ['constants', '獲得定数が◯以上'],
      ['multiple', '獲得が累計の◯倍'],
    ];
    for (const [v, l] of opts) this.bbMode.append(h('option', { value: v }, l));
    this.bbVal = h('input', { type: 'number', inputmode: 'decimal', min: '0', step: 'any', 'aria-label': '値' }) as HTMLInputElement;
    this.bbMode.addEventListener('change', () => {
      this.game.s.auto.bigBangMode = this.bbMode.value as AutoBBMode;
      this.syncInputs();
    });
    this.bbVal.addEventListener('change', () => {
      const raw = this.bbVal.value.trim();
      const v = Number(raw);
      if (raw !== '' && isFinite(v) && v > 0) this.game.s.auto.bigBangValues[this.game.s.auto.bigBangMode] = v;
      this.syncInputs();
    });
    this.holdSw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-label': '次元上昇できるときは止める' }, [h('i')]);
    this.holdSw.addEventListener('click', () => {
      this.game.s.auto.bigBangHold = !this.game.s.auto.bigBangHold;
    });
    bbCard.extra.append(
      h('div', { class: 'field' }, [this.bbMode, this.bbVal]),
      h('div', { class: 'auto-row' }, [h('div', { class: 'grow small' }, '次元上昇できるときは止める'), this.holdSw]),
      h('div', { class: 'small muted' }, '挑戦中は目標達成で自動ビッグバン。'),
    );

    const ascCard = this.cards.get('autoAscend')!;
    this.ascMode = h('select', { 'aria-label': '条件' }) as HTMLSelectElement;
    const aopts: Array<[AutoAscMode, string]> = [['multiple', '獲得が累計の◯倍'], ['time', '◯秒たったら'], ['shards', '獲得欠片が◯以上']];
    for (const [v, l] of aopts) this.ascMode.append(h('option', { value: v }, l));
    this.ascMode.addEventListener('change', () => {
      this.game.s.auto.ascendMode = this.ascMode.value as AutoAscMode;
      this.syncInputs();
    });
    this.ascVal = h('input', { type: 'number', inputmode: 'decimal', min: '1', step: 'any', 'aria-label': '欠片' }) as HTMLInputElement;
    this.ascVal.addEventListener('change', () => {
      const raw = this.ascVal.value.trim();
      const v = Number(raw);
      if (raw !== '' && isFinite(v) && v > 0) this.game.s.auto.ascendValues[this.game.s.auto.ascendMode] = v;
      this.syncInputs();
    });
    ascCard.extra.append(h('div', { class: 'field' }, [this.ascMode, this.ascVal]));
    const dimCard = this.cards.get('autoDim')!;
    const dg = h('div', { class: 'mini-gens' });
    DIM_GENERATORS.forEach((d, i) => {
      const b = h('button', { type: 'button' }, d.name);
      b.addEventListener('click', () => {
        this.game.s.auto.dimGens[i] = !this.game.s.auto.dimGens[i];
      });
      this.dimBtns.push(b);
      dg.append(b);
    });
    dimCard.extra.append(dg);
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
    this.bbVal.value = String(a.bigBangValues[a.bigBangMode]);
    this.ascMode.value = a.ascendMode;
    this.ascVal.value = String(a.ascendValues[a.ascendMode]);
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
    toggle(this.holdSw, 'on', s.auto.bigBangHold);
    this.dimBtns.forEach((b, i) => toggle(b, 'on', s.auto.dimGens[i]));
    this.seenUnlocked = s.autoUnlocked.size;
  }
}
