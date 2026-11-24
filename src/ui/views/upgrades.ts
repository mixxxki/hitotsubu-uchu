// 強化タブ: 120マスのグリッド
import type { Game } from '../../core/game.ts';
import { UPGRADES, type UpgradeDef, type Unlock } from '../../data/upgrades.ts';
import { GENERATORS } from '../../data/generators.ts';
import { upgradeStatus, buyUpgrade, type UpgradeStatus } from '../../core/actions.ts';
import { upgradeCost, hasRule } from '../../core/formulas.ts';
import { h, setClass, setText, setDisabled } from '../dom.ts';
import { KIND_ICONS, genTierIcon } from '../icons.ts';
import { fmt } from '../format.ts';
import { openSheet, closeSheet } from '../overlay.ts';

export function upgradeIcon(u: UpgradeDef): string {
  if (u.kind === 'gen') return genTierIcon(GENERATORS[u.gen ?? 0].icon, u.tier ?? 0);
  return KIND_ICONS[u.kind];
}

const KIND_LABEL: Record<UpgradeDef['kind'], string> = {
  gen: '装置の強化',
  synergy: '相乗効果',
  tap: 'タップ強化',
  global: '全体倍率',
  star: '流れ星',
  ach: '実績連動',
};

function unlockText(u: Unlock): string {
  switch (u.type) {
    case 'gen': return `${GENERATORS[u.gen].name}を${u.n}台`;
    case 'gens2': return `${GENERATORS[u.a].name}と${GENERATORS[u.b].name}を各${u.n}台`;
    case 'total': return `この周回で粒子を累計${fmt(u.amount)}`;
    case 'taps': return `タップ${u.n}回`;
    case 'stars': return `流れ星を${u.n}個捕まえる`;
    case 'ach': return `実績${u.n}個`;
  }
}

export class UpgradesView {
  el: HTMLElement;
  private cells: HTMLButtonElement[] = [];
  private status: UpgradeStatus[] = [];
  private summary: HTMLElement;
  private buyAllBtn: HTMLButtonElement;
  affordableCount = 0;

  private game: Game;

  constructor(game: Game) {
    this.game = game;
    this.el = h('section', { class: 'view', 'data-view': 'upg' });
    this.summary = h('span', { class: 'num' });
    this.buyAllBtn = h('button', { class: 'btn', type: 'button', style: 'min-height:44px;padding:0 12px;font-size:13px' }, '買えるだけ買う');
    this.buyAllBtn.addEventListener('click', () => this.buyAll());
    this.el.append(
      h('div', { class: 'section-title' }, [h('span', {}, '強化'), this.summary, h('span', { class: 'grow' }), this.buyAllBtn]),
      h('div', { class: 'legend' }, [
        h('span', {}, [h('i', { class: 'l-own' }), '購入済み']),
        h('span', {}, [h('i', { class: 'l-aff' }), '購入可']),
        h('span', {}, [h('i'), '解放済み']),
        h('span', {}, [h('i', { class: 'l-lock' }), '未解放']),
      ]),
    );
    const grid = h('div', { class: 'grid' });
    UPGRADES.forEach((u, i) => {
      const c = h('button', { class: 'cell locked', type: 'button', 'aria-label': u.name, html: upgradeIcon(u) });
      c.addEventListener('click', () => this.openDetail(i));
      this.cells.push(c);
      this.status.push('locked');
      grid.append(c);
    });
    this.el.append(grid);
  }

  private buyAll(): void {
    const { s } = this.game;
    const list = UPGRADES.filter((u) => upgradeStatus(s, this.game.mods, u) === 'affordable').sort((a, b) => upgradeCost(this.game.mods, a).cmp(upgradeCost(this.game.mods, b)));
    let n = 0;
    for (const u of list) if (buyUpgrade(s, this.game.mods, u)) n++;
    if (n) this.game.refresh();
  }

  private openDetail(i: number): void {
    const u = UPGRADES[i];
    const cell = this.cells[i];
    cell.classList.add('sel');
    const icon = h('div', { class: 'sheet-icon', html: upgradeIcon(u) });
    const title = h('h2', {});
    const kind = h('div', { class: 'small muted' }, KIND_LABEL[u.kind]);
    const desc = h('p', { class: 'desc' });
    const cost = h('div', { class: 'kv' }, [h('span', {}, '価格'), h('span', {})]);
    const cond = h('div', { class: 'kv' }, [h('span', {}, '解放条件'), h('span', { style: 'font-family:var(--sans)' }, unlockText(u.unlock))]);
    const btn = h('button', { class: 'btn fill block', type: 'button', style: 'margin-top:12px' });
    btn.addEventListener('click', () => {
      if (buyUpgrade(this.game.s, this.game.mods, u)) {
        this.game.refresh();
        closeSheet();
      }
    });
    const wrap = h('div', {}, [icon, kind, title, desc, cost, cond, btn]);
    const upd = () => {
      const st = upgradeStatus(this.game.s, this.game.mods, u);
      const known = st !== 'locked';
      setText(title, known ? u.name : '？？？');
      setText(desc, known ? u.desc : '解放条件を満たすと明らかになる');
      setText(cost.lastChild as HTMLElement, fmt(upgradeCost(this.game.mods, u)));
      setText(btn, st === 'owned' ? '購入済み' : st === 'locked' ? '未解放' : hasRule(this.game.s, 'noUpgrades') ? '挑戦中は購入不可' : st === 'affordable' ? '購入する' : '粒子が足りない');
      setDisabled(btn, st !== 'affordable');
      icon.style.color = st === 'owned' || st === 'affordable' ? 'var(--lime)' : 'var(--sub)';
    };
    upd();
    openSheet(wrap, { update: upd, onClose: () => cell.classList.remove('sel') });
  }

  /** 低頻度で呼ぶ（タブ非表示でも点の判定に使う） */
  refreshStatus(): void {
    const { s, mods } = this.game;
    let aff = 0;
    let owned = 0;
    UPGRADES.forEach((u, i) => {
      const st = upgradeStatus(s, mods, u);
      if (st === 'affordable') aff++;
      if (st === 'owned') owned++;
      if (st !== this.status[i]) {
        this.status[i] = st;
        setClass(this.cells[i], `cell ${st}`);
      }
    });
    this.affordableCount = aff;
    setText(this.summary, `${owned}/${UPGRADES.length}`);
    setDisabled(this.buyAllBtn, aff === 0);
  }

  update(): void {
    /* refreshStatus で十分 */
  }
}
