// 画面全体の組み立てと描画ループ
import type { Game, OfflineReport } from '../core/game.ts';
import { tap, catchStar } from '../core/actions.ts';
import { hasRule } from '../core/formulas.ts';
import { onEvent } from '../core/events.ts';
import { exportSave, importSave, backupLocal } from '../core/save.ts';
import { offlineCapSeconds } from '../core/formulas.ts';
import { ACHIEVEMENTS } from '../data/achievements.ts';
import { AUTOMATIONS } from '../data/automation.ts';
import { CHALLENGES } from '../data/challenges.ts';
import { h, setText, toggle } from './dom.ts';
import { fmt, fmtTime, setNotation } from './format.ts';
import { ICON, coreSvg, starSvg } from './icons.ts';
import { initFloaters, floatText, toast, toastGroup, openSheet, closeSheet, updateSheet } from './overlay.ts';
import { GeneratorsView } from './views/generators.ts';
import { UpgradesView } from './views/upgrades.ts';
import { AutomationView } from './views/automation.ts';
import { AchievementsView } from './views/achievements.ts';
import { CosmosView } from './views/cosmos.ts';
import { drawBackground } from './background.ts';

type TabId = 'gen' | 'upg' | 'auto' | 'ach' | 'cosmos';

export class App {
  private amount!: HTMLElement;
  private amountNum!: HTMLElement;
  private rate!: HTMLElement;
  private chips!: HTMLElement;
  private core!: HTMLButtonElement;
  private tabBtns = new Map<TabId, HTMLButtonElement>();
  private active: TabId = 'gen';
  private views: { gen: GeneratorsView; upg: UpgradesView; auto: AutomationView; ach: AchievementsView; cosmos: CosmosView };
  private starEl: HTMLButtonElement | null = null;
  private starAnim: Animation | null = null;
  private starId = -1;
  private slowT = 0;
  private viewT = 0;
  private achSeen: number;
  private autoSeen: number;

  private game: Game;

  constructor(game: Game, root: HTMLElement) {
    this.game = game;
    setNotation(game.s.settings.notation);
    this.views = {
      gen: new GeneratorsView(game),
      upg: new UpgradesView(game),
      auto: new AutomationView(game),
      ach: new AchievementsView(game),
      cosmos: new CosmosView(game),
    };
    this.achSeen = game.s.achievements.size;
    this.autoSeen = game.s.autoUnlocked.size;
    this.build(root);
    initFloaters();
    this.bindEvents();
    this.setTab('gen');
    this.views.upg.refreshStatus();
  }

  private build(root: HTMLElement): void {
    const bg = h('canvas', { id: 'bg' });
    document.body.prepend(bg);
    drawBackground(bg);

    this.amountNum = h('span', {});
    this.amount = h('div', { class: 'amount num' }, [this.amountNum, h('span', { class: 'unit' }, '粒子')]);
    this.rate = h('div', { class: 'rate' });
    const gear = h('button', { class: 'iconbtn', type: 'button', 'aria-label': '設定', html: ICON.gear });
    gear.addEventListener('click', () => this.openSettings());
    const top = h('header', { class: 'top' }, [h('div', { class: 'counts' }, [this.amount, this.rate]), gear]);
    this.chips = h('div', { class: 'chips' });

    this.core = h('button', { class: 'core', type: 'button', 'aria-label': '核をタップして粒子を得る', html: coreSvg() });
    const stage = h('div', { class: 'stage' }, [this.core, h('div', { class: 'core-hint' }, '核をタップ')]);
    this.core.addEventListener('pointerdown', (e) => this.onTap(e));
    this.core.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const r = this.core.getBoundingClientRect();
        this.doTap(r.left + r.width / 2, r.top + r.height / 2);
      }
    });

    const panel = h('main', { class: 'panel' });
    for (const v of Object.values(this.views)) panel.append(v.el);

    const tabs = h('nav', { class: 'tabs', 'aria-label': 'タブ' });
    const inner = h('div', { class: 'inner' });
    const defs: Array<[TabId, string, string]> = [
      ['gen', '生成', ICON.tabGen],
      ['upg', '強化', ICON.tabUpg],
      ['auto', '自動化', ICON.tabAuto],
      ['ach', '実績', ICON.tabAch],
      ['cosmos', '宇宙', ICON.tabCosmos],
    ];
    for (const [id, label, icon] of defs) {
      const b = h('button', { class: 'tab', type: 'button', 'data-tab': id }, [h('span', { html: icon, style: 'display:contents' }), h('span', {}, label), h('i', { class: 'dot' })]);
      b.addEventListener('click', () => this.setTab(id));
      this.tabBtns.set(id, b);
      inner.append(b);
    }
    tabs.append(inner);

    root.append(top, this.chips, stage, panel);
    document.body.append(tabs);
    // 核の軌道アニメーション（transform のみ）
    const o1 = this.core.querySelector('.orbit') as SVGGElement | null;
    const o2 = this.core.querySelector('.orbit2') as SVGGElement | null;
    o1?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 24000, iterations: Infinity });
    o2?.animate([{ transform: 'rotate(360deg)' }, { transform: 'rotate(0deg)' }], { duration: 17000, iterations: Infinity });
  }

  private setTab(id: TabId): void {
    this.active = id;
    for (const [k, b] of this.tabBtns) toggle(b, 'on', k === id);
    for (const [k, v] of Object.entries(this.views)) toggle(v.el, 'active', k === id);
    (this.views[id].el.parentElement as HTMLElement).scrollTop = 0;
    this.views[id].update();
    if (id === 'upg') this.views.upg.refreshStatus();
    if (id === 'auto') this.views.auto.syncInputs();
  }

  // ------------------------------------------------------------ タップ
  private onTap(e: PointerEvent): void {
    e.preventDefault();
    this.doTap(e.clientX, e.clientY);
  }

  private doTap(x: number, y: number): void {
    const { s, mods } = this.game;
    const v = tap(s, mods);
    this.core.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
    if (s.settings.floaters) floatText(x, y, hasRule(s, 'noTap') ? '0' : `+${fmt(v, 1)}`);
  }

  // ------------------------------------------------------------ 流れ星
  private spawnStar(id: number): void {
    this.removeStar();
    this.starId = id;
    const el = h('button', { class: 'shooting', type: 'button', 'aria-label': '流れ星をタップ', html: starSvg() });
    const W = window.innerWidth;
    const H = window.innerHeight;
    const fromLeft = Math.random() < 0.5;
    // 核のまわり（ステージ内）だけを横切る。リストの購入ボタンに重ならないように
    const st = this.core.parentElement!.getBoundingClientRect();
    const top = Math.max(st.top + 20, 40);
    const bottom = Math.max(top + 40, st.bottom - 20);
    const y0 = top + Math.random() * (bottom - top) * 0.5;
    const y1 = y0 + Math.random() * (bottom - y0);
    void H;
    const x0 = fromLeft ? -40 : W + 40;
    const x1 = fromLeft ? W + 40 : -40;
    const flip = fromLeft ? '' : ' scaleX(-1)';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!this.game.s.star) return;
      const r = el.getBoundingClientRect();
      catchStar(this.game.s, this.game.mods, false);
      this.game.refresh();
      floatText(r.left + r.width / 2, r.top, '流れ星', true);
      this.removeStar();
    });
    document.body.append(el);
    this.starEl = el;
    this.starAnim = el.animate(
      [
        { transform: `translate(${x0}px, ${y0}px)${flip}` },
        { transform: `translate(${x1}px, ${y1}px)${flip}` },
      ],
      { duration: 12000, easing: 'linear', fill: 'forwards' },
    );
  }

  private removeStar(): void {
    this.starAnim?.cancel();
    this.starEl?.remove();
    this.starEl = null;
    this.starAnim = null;
    this.starId = -1;
  }

  // ------------------------------------------------------------ イベント
  private bindEvents(): void {
    onEvent((e) => {
      switch (e.type) {
        case 'achievement': {
          const a = ACHIEVEMENTS.find((x) => x.id === e.id);
          if (a) toastGroup('ach', '実績を{n}個解除', `実績解除：${a.name}`, 'lime');
          break;
        }
        case 'starCaught':
          if (e.kind === 'buff') toast(`流れ星：${e.duration?.toFixed(0)}秒間 生産×${fmt(e.mult ?? 1, 1)}`, 'star');
          else toast(`流れ星：粒子 +${fmt(e.amount!)}`, 'star');
          if (e.auto) this.removeStar();
          break;
        case 'bigBang':
          toast(e.challengeDone !== null ? `挑戦「${CHALLENGES[e.challengeDone].name}」達成！ 宇宙定数 +${fmt(e.gain)}` : `ビッグバン！ 宇宙定数 +${fmt(e.gain)}`, 'purple', 3200);
          break;
        case 'ascend':
          toast(`次元上昇！ 次元の欠片 +${fmt(e.gain)}`, 'purple', 3600);
          break;
        case 'autoUnlocked': {
          const a = AUTOMATIONS.find((x) => x.id === e.id);
          if (a) toast(`自動化が解放：${a.name}`, 'lime', 3200);
          break;
        }
        case 'multiverse':
          toast('多元化した', 'purple');
          break;
        case 'starSpawn':
          break;
      }
    });
  }

  showOffline(r: OfflineReport): void {
    const ok = h('button', { class: 'btn fill block', type: 'button', style: 'margin-top:14px' }, '受け取る');
    ok.addEventListener('click', () => closeSheet());
    const kv = (k: string, v: string) => h('div', { class: 'kv' }, [h('span', {}, k), h('span', {}, v)]);
    const rows: HTMLElement[] = [kv('留守にしていた時間', fmtTime(r.elapsed))];
    if (r.capped) rows.push(kv('計算した時間（上限）', fmtTime(r.seconds)));
    if (r.bigBangs > 0) rows.push(kv('自動ビッグバン', `${r.bigBangs}回`));
    if (r.constantsGained.gt(0)) rows.push(kv('宇宙定数', `+${fmt(r.constantsGained)}`));
    if (r.ascensions > 0) rows.push(kv('次元上昇', `${r.ascensions}回`));
    if (r.shardsGained.gt(0)) rows.push(kv('次元の欠片', `+${fmt(r.shardsGained)}`));
    if (r.achievements > 0) rows.push(kv('解除した実績', `${r.achievements}個`));
    openSheet(
      h('div', {}, [
        h('h2', {}, 'おかえりなさい'),
        h('p', { class: 'desc' }, '留守中も宇宙は広がっていた。'),
        h('div', { class: 'small muted' }, r.bigBangs > 0 ? '留守中に生まれた粒子（合計）' : '留守中に'),
        h('div', { class: 'big-num lime', style: 'margin-bottom:8px' }, `+${fmt(r.gained)}`),
        ...rows,
        r.capped ? h('p', { class: 'small muted' }, `放置の上限は今 ${fmtTime(r.cap)}。法則の木・次元の刻印で延ばせる。`) : '',
        ok,
      ]),
    );
  }

  // ------------------------------------------------------------ 設定
  private openSettings(): void {
    const s = this.game.s;
    const notSeg = h('div', { class: 'seg' });
    const b1 = h('button', { type: 'button' }, '1e15 形式');
    const b2 = h('button', { type: 'button' }, 'K / M / B 形式');
    const syncN = () => {
      toggle(b1, 'on', s.settings.notation === 'sci');
      toggle(b2, 'on', s.settings.notation === 'suffix');
    };
    b1.addEventListener('click', () => {
      s.settings.notation = 'sci';
      setNotation('sci');
      syncN();
    });
    b2.addEventListener('click', () => {
      s.settings.notation = 'suffix';
      setNotation('suffix');
      syncN();
    });
    notSeg.append(b1, b2);
    syncN();

    const flSw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-label': '浮かぶ数字' }, [h('i')]);
    const syncF = () => toggle(flSw, 'on', s.settings.floaters);
    flSw.addEventListener('click', () => {
      s.settings.floaters = !s.settings.floaters;
      syncF();
    });
    syncF();

    const ta = h('textarea', { 'aria-label': 'セーブデータ', placeholder: 'エクスポートした文字列をここに貼り付けてインポート', spellcheck: 'false' }) as HTMLTextAreaElement;
    const exp = h('button', { class: 'btn', type: 'button' }, 'エクスポート');
    const imp = h('button', { class: 'btn ghost', type: 'button' }, 'インポート');
    exp.addEventListener('click', async () => {
      this.game.s.exported = true;
      this.game.save();
      ta.value = exportSave(this.game.s);
      ta.select();
      try {
        await navigator.clipboard.writeText(ta.value);
        toast('セーブをコピーした', 'lime');
      } catch {
        toast('文字列を選択してコピーしてください');
      }
    });
    imp.addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) {
        toast('文字列を貼り付けてください');
        return;
      }
      let ns: ReturnType<typeof importSave>;
      try {
        ns = importSave(text);
      } catch (e) {
        toast(e instanceof Error && /バージョン|欠け/.test(e.message) ? e.message : '読み込めなかった（文字列を確認）');
        return;
      }
      const yes = h('button', { class: 'btn fill', type: 'button' }, '上書きする');
      const no = h('button', { class: 'btn ghost', type: 'button' }, 'やめる');
      no.addEventListener('click', () => closeSheet());
      yes.addEventListener('click', () => {
        backupLocal();
        this.game.replace(ns);
        this.game.save();
        setNotation(ns.settings.notation);
        closeSheet();
        toast('インポートした（直前のデータは端末内に退避済み）', 'lime');
        this.views.auto.syncInputs();
      });
      const kv = (k: string, v: string) => h('div', { class: 'kv' }, [h('span', {}, k), h('span', {}, v)]);
      openSheet(
        h('div', {}, [
          h('h2', {}, 'このデータで上書きする？'),
          h('p', { class: 'desc' }, '今の進行はこのデータに置き換わる。'),
          kv('粒子', fmt(ns.particles)),
          kv('ビッグバン（累計）', `${ns.bigBangsEver}回`),
          kv('次元上昇', `${ns.ascensions}回`),
          kv('実績', `${ns.achievements.size}個`),
          kv('プレイ時間', fmtTime(ns.time)),
          h('div', { class: 'actions' }, [no, yes]),
        ]),
      );
    });
    const save = h('button', { class: 'btn ghost', type: 'button' }, '今すぐ保存');
    save.addEventListener('click', () => {
      this.game.save();
      toast('保存した');
    });
    let resetStep = 0;
    const reset = h('button', { class: 'btn danger', type: 'button' }, 'データを消去');
    reset.addEventListener('click', () => {
      resetStep++;
      if (resetStep === 1) {
        reset.textContent = 'もう一度押すと消去';
        return;
      }
      this.game.hardReset();
      closeSheet();
      toast('最初からやり直す');
    });

    openSheet(
      h('div', {}, [
        h('h2', {}, '設定'),
        h('div', { class: 'section-title' }, '数字の表記'),
        notSeg,
        h('div', { class: 'auto-row', style: 'margin-top:8px' }, [h('div', { class: 'grow' }, 'タップ時の浮かぶ数字'), flSw]),
        h('div', { class: 'section-title' }, 'セーブデータ（5秒ごとに自動保存）'),
        h('div', { class: 'small muted', style: 'margin-bottom:6px' }, `放置の上限：${fmtTime(offlineCapSeconds(this.game.mods))}`),
        ta,
        h('div', { class: 'actions' }, [exp, imp]),
        h('div', { class: 'actions' }, [save, reset]),
        h('p', { class: 'small muted', style: 'margin-top:14px' }, `ひとつぶ宇宙 v${__APP_VERSION__}・プレイ時間 ${fmtTime(s.time)}`),
      ]),
    );
  }

  // ------------------------------------------------------------ 描画
  frame(dt: number): void {
    const { s, mods } = this.game;
    setText(this.amountNum, fmt(s.particles));
    setText(this.rate, `毎秒 ${fmt(mods.pps, 1)}　タップ ${fmt(mods.tapValue, 1)}`);

    // 流れ星
    if (s.star && s.star.id !== this.starId) this.spawnStar(s.star.id);
    else if (!s.star && this.starEl) this.removeStar();

    this.viewT += dt;
    if (this.viewT >= 0.1) {
      this.viewT = 0;
      this.views[this.active].update();
      updateSheet();
      this.renderChips();
    }
    this.slowT += dt;
    if (this.slowT >= 0.4) {
      this.slowT = 0;
      this.views.upg.refreshStatus();
      this.views.cosmos.updateAttention();
      if (this.active === 'ach') this.achSeen = s.achievements.size;
      if (this.active === 'auto') this.autoSeen = s.autoUnlocked.size;
      toggle(this.tabBtns.get('upg')!, 'has-dot', this.views.upg.affordableCount > 0);
      toggle(this.tabBtns.get('cosmos')!, 'has-dot', this.views.cosmos.attention);
      toggle(this.tabBtns.get('ach')!, 'has-dot', s.achievements.size > this.achSeen);
      toggle(this.tabBtns.get('auto')!, 'has-dot', s.autoUnlocked.size > this.autoSeen);
    }
  }

  private chipKey = '';
  private renderChips(): void {
    const { s } = this.game;
    const parts: Array<[string, string]> = [];
    if (s.time < s.buffUntil) parts.push(['star', `流れ星 ×${fmt(s.buffMult, 1)}・残り${Math.ceil(s.buffUntil - s.time)}秒`]);
    if (s.challenge !== null) parts.push(['purple', `挑戦中：${CHALLENGES[s.challenge].name}`]);
    if (s.constants.gt(0) || s.bigBangsEver > 0) parts.push(['', `宇宙定数 ${fmt(s.constants)}`]);
    if (s.ascensions > 0) parts.push(['purple', `欠片 ${fmt(s.shards)}`]);
    const key = parts.map((p) => p.join(':')).join('|');
    if (key === this.chipKey) return;
    this.chipKey = key;
    this.chips.replaceChildren(...parts.map(([c, t]) => h('span', { class: `chip ${c}` }, t)));
  }
}
