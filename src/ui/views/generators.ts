// 生成タブ: 生成装置カード（＋次元装置）
import type { Game } from '../../core/game.ts';
import { GENERATORS, DIM_GENERATORS, DIM_MILESTONE_EVERY, DIM_MILESTONE_MULT } from '../../data/generators.ts';
import { milestoneCount, genCost, nextMilestone, dimGenCost, dimGenMaxAffordable, dimGenRate, genMaxAffordable, D0 } from '../../core/formulas.ts';
import { buyGen, genLocked, buyDimGen } from '../../core/actions.ts';
import { h, setText, setBar, setDisabled, toggle } from '../dom.ts';
import { GEN_ICONS } from '../icons.ts';
import { floatText } from '../overlay.ts';
import { fmt, fmtTime } from '../format.ts';
import type Decimal from 'break_eternity.js';
import { UPGRADES, type UpgradeDef } from '../../data/upgrades.ts';
import { upgradeStatus, buyUpgrade } from '../../core/actions.ts';
import { upgradeCost, hasRule } from '../../core/formulas.ts';
import { upgradeIcon } from './upgrades.ts';

type Mode = 1 | 10 | 100 | 'max';

interface GenRow {
  root: HTMLElement;
  name: HTMLElement;
  cnt: HTMLElement;
  mult: HTMLElement;
  sub: HTMLElement;
  bar: HTMLElement;
  btn: HTMLButtonElement;
  amt: HTMLElement;
  cost: HTMLElement;
}

export class GeneratorsView {
  el: HTMLElement;
  private mode: Mode = 1;
  private rows: GenRow[] = [];
  private dimRows: GenRow[] = [];
  private dimSection: HTMLElement;
  private dimInfo: HTMLElement;
  private segBtns: HTMLButtonElement[] = [];
  private rec!: HTMLButtonElement;
  private recIcon!: HTMLElement;
  private recName!: HTMLElement;
  private recDesc!: HTMLElement;
  private recCost!: HTMLElement;
  private recId: string | null = null;

  private game: Game;

  constructor(game: Game) {
    this.game = game;
    this.el = h('section', { class: 'view', 'data-view': 'gen' });
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': '購入数' });
    const modes: Mode[] = [1, 10, 100, 'max'];
    for (const m of modes) {
      const b = h('button', { type: 'button' }, m === 'max' ? 'MAX' : `×${m}`);
      b.addEventListener('click', () => {
        this.mode = m;
        this.segBtns.forEach((x, i) => toggle(x, 'on', modes[i] === m));
      });
      this.segBtns.push(b);
      seg.append(b);
    }
    this.segBtns[0].classList.add('on');
    this.el.append(h('div', { class: 'sticky' }, [seg]));

    // おすすめ強化（いちばん安い解放済みの強化）
    this.recIcon = h('div', { class: 'ricon' });
    this.recName = h('b', {});
    this.recDesc = h('span', { class: 'muted' });
    this.recCost = h('span', { class: 'rcost' });
    this.rec = h('button', { class: 'recommend', type: 'button' }, [this.recIcon, h('div', { class: 'rtext' }, [this.recName, this.recDesc]), this.recCost]);
    this.rec.addEventListener('click', () => {
      if (this.recId === null) return;
      const u = UPGRADES.find((x) => x.id === this.recId);
      if (u && buyUpgrade(game.s, game.mods, u)) game.refresh();
    });
    this.el.append(this.rec);

    GENERATORS.forEach((g, i) => {
      const r = this.makeRow(GEN_ICONS[g.icon], g.name, false);
      r.btn.addEventListener('click', () => {
        const before = milestoneCount(game.s.gens[i]);
        const n = buyGen(game.s, game.mods, i, this.mode);
        if (n > 0) {
          game.refresh();
          const r = this.rows[i];
          r.btn.animate([{ transform: 'scale(0.95)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
          r.cnt.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
          const after = milestoneCount(game.s.gens[i]);
          if (after > before) {
            const b = r.btn.getBoundingClientRect();
            floatText(b.left + b.width / 2, b.top, `生産×${fmt(Math.pow(game.mods.milestoneMult, after - before), 1)}`, true);
            r.bar.parentElement?.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 600 });
            r.root.animate([{ borderColor: '#C6F432' }, { borderColor: '#22202f' }], { duration: 700, easing: 'ease-out' });
          }
        }
      });
      this.rows.push(r);
      this.el.append(r.root);
    });

    this.dimSection = h('div', {});
    this.dimInfo = h('div', { class: 'small muted' });
    this.dimSection.append(h('div', { class: 'section-title' }, [h('span', { class: 'purple' }, '次元装置'), h('span', { class: 'grow' }), this.dimInfo]));
    DIM_GENERATORS.forEach((d, i) => {
      const icon = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6">${'<circle cx="20" cy="20" r="' + (5 + i * 4) + '"/>'}<path d="M${8 + i} 20h${24 - i * 2}"/></svg>`;
      const r = this.makeRow(icon, d.name, true);
      r.btn.addEventListener('click', () => {
        const n = buyDimGen(game.s, i, this.mode);
        if (n > 0) game.refresh();
      });
      this.dimRows.push(r);
      this.dimSection.append(r.root);
    });
    this.el.append(this.dimSection);
  }

  private makeRow(icon: string, name: string, dim: boolean): GenRow {
    const nm = h('span', { class: 'n' }, name);
    const cnt = h('span', { class: 'cnt' }, '0');
    const mult = h('span', { class: 'mult' });
    const sub = h('div', { class: 'gsub' });
    const barI = h('i');
    const bar = h('div', { class: dim ? 'bar purple' : 'bar' }, [barI]);
    const amt = h('span', { class: 'amt' });
    const cost = h('span', { class: 'cost' });
    const btn = h('button', { class: 'buy', type: 'button' }, [amt, cost]);
    const root = h('div', { class: dim ? 'gen dim' : 'gen' }, [
      h('div', { class: 'gicon', html: icon }),
      h('div', { class: 'gmain' }, [h('div', { class: 'gname' }, [nm, cnt, mult]), sub, bar]),
      btn,
    ]);
    return { root, name: nm, cnt, mult, sub, bar: barI, btn, amt, cost };
  }

  private amountFor(i: number): number {
    const s = this.game.s;
    if (this.mode === 'max') return Math.max(1, genMaxAffordable(this.game.mods, i, s.gens[i], s.particles));
    return this.mode;
  }

  private updateRec(): void {
    const { s, mods } = this.game;
    let best: UpgradeDef | null = null;
    let bestCost: Decimal | null = null;
    const autoOn = s.autoUnlocked.has('autoUpg') && s.auto.upgrades;
    if (!autoOn && !hasRule(s, 'noUpgrades')) {
      for (const u of UPGRADES) {
        const st = upgradeStatus(s, mods, u);
        if (st !== 'affordable' && st !== 'unlocked') continue;
        const c = upgradeCost(mods, u);
        if (!bestCost || c.lt(bestCost)) {
          best = u;
          bestCost = c;
        }
      }
    }
    this.rec.style.display = best ? '' : 'none';
    if (!best || !bestCost) return;
    if (this.recId !== best.id) {
      this.recId = best.id;
      this.recIcon.innerHTML = upgradeIcon(best);
      setText(this.recName, `おすすめ強化：${best.name}`);
      setText(this.recDesc, best.desc);
    }
    const can = bestCost.lte(s.particles);
    let wait = '';
    if (!can && mods.pps.gt(0)) {
      const sec = bestCost.sub(s.particles).div(mods.pps).toNumber();
      wait = sec < 86400 ? `あと${fmtTime(sec)}` : '';
    }
    setText(this.recCost, can ? `${fmt(bestCost)} で購入` : `${fmt(bestCost)}${wait ? `\n${wait}` : ''}`);
    toggle(this.rec, 'dim-rec', !can);
    this.rec.style.opacity = can ? '1' : '0.6';
  }

  update(): void {
    const { s, mods } = this.game;
    this.updateRec();
    let revealNext = true;
    GENERATORS.forEach((g, i) => {
      const r = this.rows[i];
      const owned = s.gens[i];
      const locked = genLocked(s, i);
      const visible = owned > 0 || revealNext || s.runTotal.gte(g.baseCost * 0.5);
      revealNext = owned > 0;
      toggle(r.root, 'hidden-gen', !visible || locked);
      setText(r.name, visible ? g.name : '？？？');
      setText(r.cnt, String(owned));
      const n = this.amountFor(i);
      const cost = genCost(mods, i, owned, n);
      setText(r.amt, locked ? '封印中' : `×${n}`);
      setText(r.cost, locked ? '—' : fmt(cost));
      setDisabled(r.btn, locked || cost.gt(s.particles) || !visible);
      const ms = nextMilestone(owned);
      setText(r.mult, owned > 0 ? `次の×${fmt(mods.milestoneMult, 1)}まで ${ms.next - owned}` : '');
      setBar(r.bar, (owned - ms.prev) / (ms.next - ms.prev));
      const p: Decimal = mods.genProd[i] ?? D0;
      setText(r.sub, visible ? (owned > 0 ? `毎秒 ${fmt(p, 1)}（1台 ${fmt(owned > 0 ? p.div(owned) : D0, 2)}）` : g.desc) : '');
    });

    const showDim = s.ascensions > 0;
    this.dimSection.style.display = showDim ? '' : 'none';
    if (!showDim) return;
    setText(this.dimInfo, `欠片 ${fmt(s.shards)}`);
    DIM_GENERATORS.forEach((d, i) => {
      const r = this.dimRows[i];
      const g = s.dimGens[i];
      setText(r.cnt, fmt(g.amount, 1));
      const n = this.mode === 'max' ? Math.max(1, dimGenMaxAffordable(i, g.bought, s.shards)) : this.mode;
      const cost = dimGenCost(i, g.bought, n);
      setText(r.amt, `×${n}`);
      setText(r.cost, fmt(cost));
      setDisabled(r.btn, cost.gt(s.shards));
      const into = i === 0 ? '次元エネルギー' : DIM_GENERATORS[i - 1].name;
      setText(r.sub, `${into}を毎秒 ${fmt(dimGenRate(s, mods, i), 2)}・購入 ${g.bought}`);
      const k = g.bought % DIM_MILESTONE_EVERY;
      setText(r.mult, `次の×${DIM_MILESTONE_MULT}まで ${DIM_MILESTONE_EVERY - k}`);
      setBar(r.bar, k / DIM_MILESTONE_EVERY);
      void d;
    });
  }
}
