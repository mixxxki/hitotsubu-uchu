import type Decimal from 'break_eternity.js';
// 宇宙タブ: ビッグバン／法則の木／挑戦／次元上昇／多元宇宙
import type { Game } from '../../core/game.ts';
import { LAW_TREE, LAW_REPEAT, type LawNode } from '../../data/lawTree.ts';
import { CHALLENGES } from '../../data/challenges.ts';
import { DIM_UPGRADES, DIM_REPEAT } from '../../data/dimension.ts';
import { BALANCE } from '../../data/balance.ts';
import { MULTIVERSE_UPGRADES } from '../../data/multiverse.ts';
import {
  canBigBang, constantsGain, bigBangRequirement, nextConstantAt, canAscend, shardsGain, lawRepeatCost, dimRepeatCost, multiverseReady,
} from '../../core/formulas.ts';
import {
  bigBang, buyLaw, lawAvailable, buyLawRepeat, lawRepeatAvailable, enterChallenge, exitChallenge, ascend, buyDimUpgrade, buyDimRepeat,
  multiverse, potentialGain, respecLaws, swapExclusive, buyAllLaws,
} from '../../core/actions.ts';
import { h, setText, setClass, setDisabled, setBar, toggle } from '../dom.ts';
import { fmt, fmtTime } from '../format.ts';
import { ICON } from '../icons.ts';
import { openSheet, closeSheet, toast } from '../overlay.ts';

const DIM_UPGRADES_SORTED = [...DIM_UPGRADES].sort((a, b) => a.cost - b.cost);

type Sub = 'bb' | 'law' | 'chal' | 'dim' | 'multi';
const ROW_H = 88;

function confirmSheet(title: string, body: string, okLabel: string, tone: 'purple' | 'lime', onOk: () => void): void {
  const ok = h('button', { class: `btn fill ${tone === 'purple' ? 'purple' : ''}`, type: 'button' }, okLabel);
  const cancel = h('button', { class: 'btn ghost', type: 'button' }, 'やめる');
  ok.addEventListener('click', () => {
    closeSheet();
    onOk();
  });
  cancel.addEventListener('click', () => closeSheet());
  openSheet(h('div', {}, [h('h2', {}, title), h('p', { class: 'desc' }, body), h('div', { class: 'actions' }, [cancel, ok])]));
}

export class CosmosView {
  el: HTMLElement;
  private sub: Sub = 'bb';
  private subBtns = new Map<Sub, HTMLButtonElement>();
  private panes = new Map<Sub, HTMLElement>();
  /** 点表示用 */
  attention = false;

  // ビッグバン
  private bbGain!: HTMLElement;
  private bbBtn!: HTMLButtonElement;
  private bbBar!: HTMLElement;
  private bbReq!: HTMLElement;
  private bbNext!: HTMLElement;
  private bbHint!: HTMLElement;
  private peak: Decimal | null = null;
  private peakRun = -1;
  private bbStats!: HTMLElement[];
  private chalNote!: HTMLElement;

  // 法則
  private lawConst!: HTMLElement;
  private nodes = new Map<string, HTMLButtonElement>();
  private nodeCosts = new Map<string, HTMLElement>();
  private links: Array<{ el: SVGLineElement; a: string; b: string }> = [];
  private repeatBtn!: HTMLButtonElement;
  private repeatInfo!: HTMLElement;
  private repeatCard!: HTMLElement;

  // 挑戦
  private chalCards: Array<{ root: HTMLElement; tag: HTMLElement; btn: HTMLButtonElement; prog: HTMLElement; best: HTMLElement }> = [];

  // 次元
  private dimLocked!: HTMLElement;
  private dimBody!: HTMLElement;
  private ascGain!: HTMLElement;
  private ascBtn!: HTMLButtonElement;
  private ascBar!: HTMLElement;
  private ascReq!: HTMLElement;
  private dimStats!: HTMLElement[];
  private dimUpgBtns: HTMLButtonElement[] = [];
  private dimRepBtn!: HTMLButtonElement;
  private dimRepInfo!: HTMLElement;

  // 多元
  private multiBody!: HTMLElement;

  private game: Game;

  constructor(game: Game) {
    this.game = game;
    this.el = h('section', { class: 'view', 'data-view': 'cosmos' });
    const seg = h('div', { class: 'seg purple scroll', role: 'tablist' });
    const subs: Array<[Sub, string]> = [['bb', 'ビッグバン'], ['law', '法則の木'], ['chal', '挑戦'], ['dim', '次元'], ['multi', '多元宇宙']];
    for (const [k, l] of subs) {
      const b = h('button', { type: 'button', role: 'tab' }, l);
      b.addEventListener('click', () => this.setSub(k));
      this.subBtns.set(k, b);
      seg.append(b);
    }
    this.el.append(h('div', { class: 'sticky' }, [seg]));
    this.panes.set('bb', this.buildBigBang());
    this.panes.set('law', this.buildLaw());
    this.panes.set('chal', this.buildChallenges());
    this.panes.set('dim', this.buildDim());
    this.panes.set('multi', this.buildMulti());
    for (const p of this.panes.values()) this.el.append(p);
    this.setSub('bb');
  }

  private setSub(k: Sub): void {
    this.sub = k;
    for (const [kk, b] of this.subBtns) toggle(b, 'on', kk === k);
    for (const [kk, p] of this.panes) p.style.display = kk === k ? '' : 'none';
    if (k === 'law') requestAnimationFrame(() => this.layoutLinks());
  }

  // ------------------------------------------------------------ ビッグバン
  private buildBigBang(): HTMLElement {
    const p = h('div', {});
    this.bbGain = h('div', { class: 'big-num purple' });
    this.bbReq = h('div', { class: 'small muted' });
    const barI = h('i');
    this.bbBar = barI;
    this.bbNext = h('div', { class: 'small muted', style: 'margin-top:6px' });
    this.bbHint = h('div', { class: 'small muted' });
    this.bbBtn = h('button', { class: 'btn purple fill block', type: 'button', style: 'margin-top:12px' }, 'ビッグバン');
    this.bbBtn.addEventListener('click', () => {
      const s = this.game.s;
      if (!canBigBang(s)) return;
      const g = constantsGain(s, this.game.mods);
      const after = s.constantsEver.add(g).mul(BALANCE.constantEffectPer).add(1).pow(this.game.mods.constExp);
      const ratio = after.div(this.game.mods.constMult);
      confirmSheet('ビッグバン', `粒子・生成装置・強化をリセットし、宇宙定数 ${fmt(g)} を得る。定数による永続倍率は ×${fmt(this.game.mods.constMult, 2)} → ×${fmt(after, 2)}（次の周回の生産 約${fmt(ratio, 2)}倍）。宇宙定数は「法則の木」で強力な法則に使える。`, '実行', 'purple', () => {
        if (bigBang(this.game.s, this.game.mods)) {
          this.game.refresh();
          if (LAW_TREE.some((n) => lawAvailable(this.game.s, n) && this.game.s.constants.gte(n.cost))) this.setSub('law');
        }
      });
    });
    this.chalNote = h('div', { class: 'small purple', style: 'margin-top:8px' });
    p.append(
      h('div', { class: 'card purple' }, [
        h('div', { class: 'small muted' }, '獲得する宇宙定数'),
        this.bbGain,
        this.bbReq,
        h('div', { class: 'bar purple' }, [barI]),
        this.bbNext,
        this.bbHint,
        this.chalNote,
        this.bbBtn,
      ]),
    );
    const labels = ['今ビッグバンした場合の定数/時', 'この周回のピーク（定数/時）', '宇宙定数（所持）', '宇宙定数（累計）', '定数による倍率', 'ビッグバン回数', 'この周回の経過', '最速ビッグバン'];
    this.bbStats = labels.map(() => h('span', {}));
    p.append(h('div', { class: 'card' }, labels.map((l, i) => h('div', { class: 'kv' }, [h('span', {}, l), this.bbStats[i]]))));
    p.append(h('p', { class: 'small muted' }, `この周回で粒子を累計 ${fmt(BALANCE.bigBangReq)} 集めるとビッグバンできる。宇宙定数は累計量に応じて永続倍率になり、法則の木で使える（使っても倍率は減らない）。「定数/時」がこの周回のピークから下がり始めたら、ビッグバンの目安。`));
    return p;
  }

  // ------------------------------------------------------------ 法則の木
  private buildLaw(): HTMLElement {
    const p = h('div', {});
    this.lawConst = h('span', { class: 'num purple' });
    p.append(h('div', { class: 'section-title' }, [h('span', {}, '宇宙定数'), this.lawConst, h('span', { class: 'grow' }), h('span', {}, `${LAW_TREE.length}の法則`)]));
    p.append(
      h('div', { class: 'legend' }, [
        h('span', {}, [h('i', { class: 'l-pown' }), '解明済み']),
        h('span', {}, [h('i', { class: 'l-paff' }), '解明できる']),
        h('span', {}, [h('i', { class: 'l-unl' }), '定数が足りない']),
        h('span', {}, [h('i', { class: 'l-lock' }), '前提が必要']),
      ]),
    );
    const rows = Math.max(...LAW_TREE.map((n) => n.row)) + 1;
    const tree = h('div', { class: 'tree', style: `height:${rows * ROW_H + 10}px` });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'links');
    tree.append(svg);
    for (const n of LAW_TREE) {
      for (const r of n.req) {
        const line = document.createElementNS(svgNS, 'line');
        svg.append(line);
        this.links.push({ el: line, a: r, b: n.id });
      }
      if (n.excl && n.id < n.excl) {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('class', 'excl');
        svg.append(line);
        this.links.push({ el: line, a: n.id, b: n.excl });
      }
    }
    for (const n of LAW_TREE) {
      const b = h('button', { class: 'node locked', type: 'button', 'aria-label': n.name, style: `left:${((n.col + 0.5) / 5) * 100}%;top:${n.row * ROW_H + 34}px`, html: ICON.law });
      b.addEventListener('click', () => this.openLaw(n));
      this.nodes.set(n.id, b);
      if (n.excl) b.classList.add('excl');
      const labName = h('span', { class: 'nc-name' }, n.name);
      const labCost = h('span', { class: 'nc-cost' }, fmt(n.cost));
      const lab = h('div', { class: 'node-cost', style: `left:${((n.col + 0.5) / 5) * 100}%;top:${n.row * ROW_H + 34}px` }, [labName, labCost]);
      this.nodeCosts.set(n.id, lab);
      tree.append(b, lab);
    }
    p.append(tree);
    this.repeatInfo = h('div', { class: 'small muted' });
    this.repeatBtn = h('button', { class: 'btn purple', type: 'button', style: 'margin-top:8px' }, '購入');
    this.repeatBtn.addEventListener('click', () => {
      if (buyLawRepeat(this.game.s)) this.game.refresh();
    });
    this.repeatCard = h('div', { class: 'card purple' }, [h('h3', {}, LAW_REPEAT.name), h('div', { class: 'small' }, LAW_REPEAT.desc), this.repeatInfo, this.repeatBtn]);
    p.append(this.repeatCard);
    const buyAll = h('button', { class: 'btn purple block', type: 'button', style: 'margin-bottom:8px' }, '解明できる法則を安い順にまとめて解明');
    buyAll.addEventListener('click', () => {
      const n = buyAllLaws(this.game.s);
      if (n) {
        this.game.refresh();
        toast(`法則を${n}個解明した`, 'purple');
      }
    });
    p.insertBefore(buyAll, p.querySelector('.tree'));
    const respec = h('button', { class: 'btn ghost block', type: 'button' }, '法則を振り直す（今の周回はリセット）');
    respec.addEventListener('click', () =>
      confirmSheet('法則を振り直す', '解明した法則をすべて戻し、使った宇宙定数を全額返す。今の周回はリセットされる（定数は得られない）。', '振り直す', 'purple', () => {
        const r = respecLaws(this.game.s);
        this.game.refresh();
        toast(`宇宙定数 ${fmt(r)} を返した`, 'purple');
      }),
    );
    p.append(respec, h('p', { class: 'small muted' }, '「光度」と「星々の合唱」は二択。どちらか一方しか解明できない。'));
    window.addEventListener('resize', () => this.layoutLinks());
    return p;
  }

  private layoutLinks(): void {
    const tree = this.nodes.get('origin')?.parentElement;
    if (!tree) return;
    const w = tree.clientWidth;
    if (!w) return;
    const pos = (id: string) => {
      const n = LAW_TREE.find((x) => x.id === id)!;
      return { x: ((n.col + 0.5) / 5) * w, y: n.row * ROW_H + 34 };
    };
    for (const l of this.links) {
      const a = pos(l.a);
      const b = pos(l.b);
      l.el.setAttribute('x1', String(a.x));
      l.el.setAttribute('y1', String(a.y));
      l.el.setAttribute('x2', String(b.x));
      l.el.setAttribute('y2', String(b.y));
    }
  }

  private openLaw(n: LawNode): void {
    const btn = h('button', { class: 'btn purple fill block', type: 'button', style: 'margin-top:12px' });
    const cost = h('span', {});
    const reqNames = n.req.map((r) => LAW_TREE.find((x) => x.id === r)!.name).join('・');
    const swap = h('button', { class: 'btn purple block', type: 'button', style: 'margin-top:8px' }, 'こちらに入れ替える（今の周回はリセット）');
    swap.addEventListener('click', () => {
      if (swapExclusive(this.game.s, n.id)) {
        this.game.refresh();
        closeSheet();
        toast(`「${n.name}」に入れ替えた`, 'purple');
      }
    });
    btn.addEventListener('click', () => {
      if (buyLaw(this.game.s, n)) {
        this.game.refresh();
        closeSheet();
      }
    });
    const upd = () => {
      const s = this.game.s;
      const owned = s.laws.has(n.id);
      const avail = lawAvailable(s, n);
      setText(cost, `${fmt(n.cost)}`);
      const blocked = !!n.excl && s.laws.has(n.excl);
      setText(btn, owned ? '解明済み' : blocked ? '二択のもう一方を解明済み（振り直しで変更可）' : !avail ? '前提の法則が必要' : s.constants.gte(n.cost) ? '解明する' : '宇宙定数が足りない');
      const canSwap = blocked && s.constants.add(LAW_TREE.find((x) => x.id === n.excl)!.cost).gte(n.cost);
      swap.style.display = blocked ? '' : 'none';
      setDisabled(swap, !canSwap);
      setDisabled(btn, owned || !avail || s.constants.lt(n.cost));
    };
    upd();
    openSheet(
      h('div', {}, [
        h('div', { class: 'sheet-icon', html: ICON.law, style: 'color:var(--purple)' }),
        h('h2', {}, n.name),
        h('p', { class: 'desc' }, n.desc),
        h('div', { class: 'kv' }, [h('span', {}, '宇宙定数'), cost]),
        reqNames ? h('div', { class: 'kv' }, [h('span', {}, '前提（いずれか）'), h('span', { style: 'font-family:var(--sans)' }, reqNames)]) : '',
        btn,
        swap,
      ]),
      { update: upd },
    );
  }

  // ------------------------------------------------------------ 挑戦
  private buildChallenges(): HTMLElement {
    const p = h('div', {});
    p.append(h('p', { class: 'small muted' }, '挑戦を始めると今の周回はリセットされる（宇宙定数は得られない）。目標に達してビッグバンすると達成。'));
    CHALLENGES.forEach((c, i) => {
      const tag = h('span', { class: 'tag' });
      const btn = h('button', { class: 'btn purple', type: 'button', style: 'margin-top:6px' });
      const prog = h('i');
      const best = h('div', { class: 'small muted num' });
      btn.addEventListener('click', () => {
        const s = this.game.s;
        if (s.challenge === i) {
          confirmSheet('挑戦を中断', 'この周回をリセットして通常に戻る。', '中断する', 'purple', () => {
            exitChallenge(this.game.s);
            this.game.refresh();
          });
        } else {
          confirmSheet(`挑戦：${c.name}`, `${c.ruleDesc}。目標：粒子 ${fmt(c.goal)}。報酬：${c.rewardDesc}。${s.challengeBest[i] ? `これまでの最高 1e${Math.floor(s.challengeBest[i])}。` : ''}今の周回はリセットされる。`, '開始', 'purple', () => {
            if (enterChallenge(this.game.s, i)) {
              this.game.refresh();
              toast(`挑戦「${c.name}」開始`, 'purple');
            }
          });
        }
      });
      const root = h('div', { class: 'card chal' }, [
        h('div', { class: 'head' }, [h('h3', {}, `${i + 1}. ${c.name}`), tag]),
        h('div', { class: 'small' }, `縛り：${c.ruleDesc}`),
        h('div', { class: 'small muted' }, `目標：粒子 ${fmt(c.goal)}`),
        h('div', { class: 'small lime' }, `報酬：${c.rewardDesc}`),
        h('div', { class: 'bar purple' }, [prog]),
        best,
        btn,
      ]);
      this.chalCards.push({ root, tag, btn, prog, best });
      p.append(root);
    });
    return p;
  }

  // ------------------------------------------------------------ 次元
  private buildDim(): HTMLElement {
    const p = h('div', {});
    this.dimLocked = h('div', { class: 'card locked-box' }, [h('h3', {}, '次元上昇'), h('p', { class: 'small' }, `この周回で粒子 ${fmt(BALANCE.ascendReq)} に到達すると解放。ビッグバンの層（宇宙定数・法則の木・挑戦）ごとリセットし、「次元の欠片」と新しい生成装置の系統を得る。`)]);
    this.ascGain = h('div', { class: 'big-num purple' });
    this.ascBar = h('i');
    this.ascReq = h('div', { class: 'small muted' });
    this.ascBtn = h('button', { class: 'btn purple fill block', type: 'button', style: 'margin-top:12px' }, '次元上昇');
    this.ascBtn.addEventListener('click', () => {
      const s = this.game.s;
      if (!canAscend(s)) return;
      const reset = ['粒子', '生成装置', '強化', '宇宙定数'];
      if (!s.dimUpgrades.has('d_tree')) reset.push('法則の木');
      if (!s.dimUpgrades.has('d_chal')) reset.push('挑戦の達成');
      const keep = ['次元装置', '次元エネルギー', '次元の刻印', '実績', '自動化'];
      if (s.dimUpgrades.has('d_tree')) keep.push('法則の木');
      if (s.dimUpgrades.has('d_chal')) keep.push('挑戦の達成');
      confirmSheet('次元上昇', `次元の欠片 ${fmt(shardsGain(s, this.game.mods))} を得る。リセット：${reset.join('・')}。残る：${keep.join('・')}。`, '上昇する', 'purple', () => {
        if (ascend(this.game.s, this.game.mods)) this.game.refresh();
      });
    });
    const labels = ['次元の欠片', '欠片（累計）', '次元エネルギー', 'エネルギー→粒子の生産', 'エネルギー→宇宙定数の獲得', 'エネルギー→欠片の獲得', '次元上昇回数'];
    this.dimStats = labels.map(() => h('span', {}));
    this.dimBody = h('div', {}, [
      h('div', { class: 'card purple' }, [h('div', { class: 'small muted' }, '獲得する次元の欠片'), this.ascGain, this.ascReq, h('div', { class: 'bar purple' }, [this.ascBar]), this.ascBtn]),
      h('div', { class: 'card' }, labels.map((l, i) => h('div', { class: 'kv' }, [h('span', {}, l), this.dimStats[i]]))),
      h('div', { class: 'section-title' }, '次元の刻印（次元上昇でも消えない）'),
    ]);
    this.dimRepInfo = h('div', { class: 'small muted' });
    this.dimRepBtn = h('button', { class: 'btn purple', type: 'button' });
    this.dimRepBtn.addEventListener('click', () => {
      if (buyDimRepeat(this.game.s)) this.game.refresh();
    });
    this.dimBody.append(h('div', { class: 'card purple' }, [h('div', { class: 'auto-row' }, [h('div', { class: 'grow' }, [h('h3', {}, DIM_REPEAT.name), h('div', { class: 'small muted' }, DIM_REPEAT.desc), this.dimRepInfo]), this.dimRepBtn])]));
    DIM_UPGRADES_SORTED.forEach((u) => {
      const b = h('button', { class: 'btn purple', type: 'button' });
      b.addEventListener('click', () => {
        if (buyDimUpgrade(this.game.s, u.id)) this.game.refresh();
      });
      this.dimUpgBtns.push(b);
      this.dimBody.append(h('div', { class: 'card' }, [h('div', { class: 'auto-row' }, [h('div', { class: 'grow' }, [h('h3', {}, u.name), h('div', { class: 'small muted' }, u.desc)]), b])]));
    });
    this.dimBody.append(h('p', { class: 'small muted' }, '次元装置は「生成」タブに並ぶ。'));
    p.append(this.dimLocked, this.dimBody);
    return p;
  }

  // ------------------------------------------------------------ 多元宇宙（枠）
  private buildMulti(): HTMLElement {
    const p = h('div', {});
    this.multiBody = h('div', {});
    p.append(this.multiBody);
    return p;
  }

  private renderMulti(): void {
    const s = this.game.s;
    const ready = multiverseReady(s);
    const key = `${ready}|${s.multiverse.count}|${Math.floor(s.shardsEver.max(1).log10().toNumber())}|${s.ascensions}`;
    if (this.multiBody.dataset.key === key) return;
    this.multiBody.dataset.key = key;
    this.multiBody.replaceChildren();
    const card = h('div', { class: ready ? 'card purple' : 'card locked-box' }, [
      h('h3', {}, '多元宇宙'),
      h('p', { class: 'small' }, '3層目。次元の層ごとリセットして、別の宇宙の「可能性」を得る。'),
      h('div', { class: 'kv' }, [h('span', {}, `次元の欠片（累計）`), h('span', {}, `${fmt(s.shardsEver)} / ${fmt(BALANCE.multiverseReqShardsEver)}`)]),
      h('div', { class: 'kv' }, [h('span', {}, '次元上昇回数'), h('span', {}, `${s.ascensions} / ${BALANCE.multiverseReqAscensions}`)]),
    ]);
    if (s.multiverse.unlocked) card.append(h('div', { class: 'kv' }, [h('span', {}, '可能性'), h('span', {}, fmt(s.multiverse.potential))]));
    const btn = h('button', { class: 'btn purple fill block', type: 'button', style: 'margin-top:12px' }, ready ? `多元化（可能性 +${fmt(potentialGain(s))}）` : '未解放');
    const empty = MULTIVERSE_UPGRADES.length === 0;
    btn.disabled = !ready || empty;
    if (ready && empty) btn.textContent = '準備中（今後のアップデートで追加）';
    btn.addEventListener('click', () =>
      confirmSheet('多元化', '次元の層を含むほぼすべてをリセットする（実績と自動化の解放は残る）。この層の中身は今後のアップデートで追加される。', '多元化する', 'purple', () => {
        if (multiverse(this.game.s)) this.game.refresh();
      }),
    );
    card.append(btn);
    this.multiBody.append(card, h('p', { class: 'small muted' }, 'この層の強化・装置は準備中。'));
  }

  // ------------------------------------------------------------ 更新
  update(): void {
    const { s, mods } = this.game;
    this.updateAttention();
    switch (this.sub) {
      case 'bb': {
        const ok = canBigBang(s);
        const req = bigBangRequirement(s);
        setText(this.bbGain, ok ? `+${fmt(constantsGain(s, mods))}` : '—');
        let reqText = `この周回の粒子 ${fmt(s.runTotal)} / ${fmt(req)}`;
        if (!ok) {
          const pct = s.runTotal.div(req).toNumber() * 100;
          const lg = Math.floor(s.runTotal.max(1).log10().toNumber());
          reqText += pct < 1 ? `（${lg}/${Math.round(req.log10().toNumber())}桁` : `（${pct.toFixed(1)}%`;
          if (mods.pps.gt(0)) {
            const eta = req.sub(s.runTotal).div(mods.pps).toNumber();
            reqText += eta < 86400 ? `・今のペースで あと約${fmtTime(eta)}` : '・装置と強化を増やして加速しよう';
          }
          reqText += '）';
        }
        setText(this.bbReq, reqText);
        setBar(this.bbBar, ok ? 1 : Math.max(s.runTotal.div(req).toNumber(), s.runTotal.max(1).log10().toNumber() / req.log10().toNumber() * 0.25));
        setText(this.bbNext, ok ? `次の+1まで あと粒子 ${fmt(nextConstantAt(s, mods).sub(s.runTotal).max(0))}` : '');
        setText(this.chalNote, s.challenge !== null ? `挑戦中：${CHALLENGES[s.challenge].name}（目標に達してビッグバンで達成）` : '');
        setDisabled(this.bbBtn, !ok);
        setText(this.bbBtn, s.challenge !== null ? 'ビッグバンして挑戦達成' : 'ビッグバン');
        const rt = Math.max(1, s.time - s.runStart);
        const rate = ok ? constantsGain(s, mods).div(rt / 3600) : null;
        if (s.runStart !== this.peakRun) {
          this.peakRun = s.runStart;
          this.peak = null;
        }
        if (rate && (!this.peak || rate.gt(this.peak))) this.peak = rate;
        const falling = !!(rate && this.peak && rate.lt(this.peak.mul(0.9)));
        setText(this.bbHint, !ok ? '' : falling ? '定数/時がこの周回のピークから下がってきた。ビッグバンの目安。' : 'まだ定数/時が伸びている。待つほど効率が上がる。');
        toggle(this.bbHint, 'lime', falling);
        const st = [rate ? fmt(rate, 2) : '—', this.peak ? fmt(this.peak, 2) : '—', fmt(s.constants), fmt(s.constantsEver), `×${fmt(mods.constMult, 2)}`, `${s.bigBangs}（累計 ${s.bigBangsEver}）`, fmtTime(s.time - s.runStart), fmtTime(s.fastestBigBang)];
        st.forEach((v, i) => setText(this.bbStats[i], v));
        break;
      }
      case 'law': {
        setText(this.lawConst, fmt(s.constants));
        for (const n of LAW_TREE) {
          const b = this.nodes.get(n.id)!;
          const owned = s.laws.has(n.id);
          const avail = lawAvailable(s, n);
          const cls = owned ? 'node owned' : avail ? (s.constants.gte(n.cost) ? 'node afford' : 'node avail') : 'node locked';
          if (b.className !== cls) {
            setClass(b, cls);
            b.innerHTML = owned ? ICON.lawOwned : ICON.law;
            setClass(this.nodeCosts.get(n.id)!, owned ? 'node-cost owned' : avail ? 'node-cost' : 'node-cost locked');
            if (n.excl) b.classList.add('excl');
          }
        }
        for (const l of this.links) {
          const on = s.laws.has(l.a) && s.laws.has(l.b);
          if (l.el.classList.contains('on') !== on) l.el.classList.toggle('on', on);
        }
        const ra = lawRepeatAvailable(s);
        this.repeatCard.style.display = ra ? '' : 'none';
        if (ra) {
          const c = lawRepeatCost(s);
          setText(this.repeatInfo, `レベル ${s.lawRepeat}・価格 ${fmt(c)}`);
          setDisabled(this.repeatBtn, s.constants.lt(c));
        }
        break;
      }
      case 'chal': {
        CHALLENGES.forEach((c, i) => {
          const card = this.chalCards[i];
          const unlocked = mods.challengesUnlocked[i];
          const done = s.challengesDone.has(i);
          const active = s.challenge === i;
          toggle(card.root, 'collapsed', done && !active);
          setText(card.tag, active ? '挑戦中' : done ? '達成' : unlocked ? '挑戦可' : '未解放');
          setClass(card.tag, active ? 'tag active' : done ? 'tag done' : 'tag');
          toggle(card.root, 'locked-box', !unlocked);
          setText(card.btn, active ? '中断する' : !unlocked ? '法則の木で解放' : done ? 'もう一度挑む' : '挑戦する');
          setDisabled(card.btn, !unlocked || (s.challenge !== null && !active));
          const b = s.challengeBest[i] ?? 0;
          setText(card.best, b > 0 ? `最高到達 1e${Math.floor(b)}${done ? '' : `（目標 1e${Math.round(Math.log10(c.goal))}）`}` : '');
          const prog = active ? (s.runTotal.max(1).log10().toNumber() - 10) / (Math.log10(c.goal) - 10) : done ? 1 : (b - 10) / (Math.log10(c.goal) - 10);
          setBar(card.prog, prog);
        });
        break;
      }
      case 'dim': {
        const show = s.ascensions > 0 || s.runTotal.gte(BALANCE.ascendReq);
        this.dimLocked.style.display = show ? 'none' : '';
        this.dimBody.style.display = show ? '' : 'none';
        if (!show) break;
        const ok = canAscend(s);
        setText(this.ascGain, ok ? `+${fmt(shardsGain(s, mods))}` : '—');
        if (ok && s.lastAscGain.gt(0)) {
          const r = shardsGain(s, mods).div(s.lastAscGain);
          setText(this.ascReq, `前回の獲得（${fmt(s.lastAscGain)}）の ${fmt(r, 2)} 倍・この次元上昇周回 ${fmtTime(s.time - s.ascStart)}`);
          setBar(this.ascBar, Math.min(1, r.toNumber() / 2));
        } else {
          setText(this.ascReq, `この周回の粒子 ${fmt(s.runTotal)} / ${fmt(BALANCE.ascendReq)}`);
          setBar(this.ascBar, ok ? 1 : s.runTotal.max(1).log10().toNumber() / 100);
        }
        setDisabled(this.ascBtn, !ok);
        const e1 = s.energy.add(1);
        const st = [fmt(s.shards), fmt(s.shardsEver), fmt(s.energy, 1), `×${fmt(mods.energyMult, 2)}`, `×${fmt(e1.pow(BALANCE.energyConstExp), 2)}`, `×${fmt(e1.pow(BALANCE.energyShardExp), 2)}`, String(s.ascensions)];
        st.forEach((v, i) => setText(this.dimStats[i], v));
        DIM_UPGRADES_SORTED.forEach((u, i) => {
          const b = this.dimUpgBtns[i];
          const owned = s.dimUpgrades.has(u.id);
          setText(b, owned ? '取得済み' : `${fmt(u.cost)} 欠片`);
          setDisabled(b, owned || s.shards.lt(u.cost));
        });
        const rc = dimRepeatCost(s);
        setText(this.dimRepInfo, `レベル ${s.dimRepeat}`);
        setText(this.dimRepBtn, `${fmt(rc)} 欠片`);
        setDisabled(this.dimRepBtn, s.shards.lt(rc));
        break;
      }
      case 'multi':
        this.renderMulti();
        break;
    }
  }

  /** タブの点: 何か行動できるとき */
  updateAttention(): void {
    const { s, mods } = this.game;
    const nLaw = LAW_TREE.filter((n) => lawAvailable(s, n) && s.constants.gte(n.cost)).length;
    setText(this.subBtns.get('law')!, nLaw > 0 ? `法則の木 ${nLaw}` : '法則の木');
    let a = canBigBang(s) && s.bigBangsEver === 0;
    if (!a) a = LAW_TREE.some((n) => lawAvailable(s, n) && s.constants.gte(n.cost));
    if (!a && lawRepeatAvailable(s)) a = s.constants.gte(lawRepeatCost(s));
    if (!a) a = canAscend(s) && s.ascensions === 0;
    if (!a && s.ascensions > 0) a = DIM_UPGRADES.some((u) => !s.dimUpgrades.has(u.id) && s.shards.gte(u.cost));
    if (!a && s.challenge !== null) a = canBigBang(s);
    void mods;
    this.attention = a;
  }
}

