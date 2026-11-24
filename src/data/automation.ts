// 自動化の解放条件（周回の進み具合で順に解放）。一度解放されたら永続。
export type AutoId = 'autoTap' | 'autoGen' | 'autoUpg' | 'autoBigBang' | 'autoDim' | 'autoAscend';

export type AutoCond =
  | { type: 'bigBangsEver'; n: number }
  | { type: 'ascensions'; n: number };

export interface AutomationDef {
  id: AutoId;
  name: string;
  desc: string;
  cond: AutoCond;
  condDesc: string;
}

export const AUTOMATIONS: AutomationDef[] = [
  { id: 'autoTap', name: '自動タップ', desc: '核を自動でタップする（基本2回/秒、法則の木で増加）', cond: { type: 'bigBangsEver', n: 1 }, condDesc: 'ビッグバン1回' },
  { id: 'autoGen', name: '自動購入：生成装置', desc: '選んだ生成装置を買えるだけ買う', cond: { type: 'bigBangsEver', n: 3 }, condDesc: 'ビッグバン累計3回' },
  { id: 'autoUpg', name: '自動購入：強化', desc: '買える強化を安い順に買う', cond: { type: 'bigBangsEver', n: 8 }, condDesc: 'ビッグバン累計8回' },
  { id: 'autoBigBang', name: '自動ビッグバン', desc: '条件を満たしたら自動でビッグバン', cond: { type: 'bigBangsEver', n: 15 }, condDesc: 'ビッグバン累計15回' },
  { id: 'autoDim', name: '自動購入：次元装置', desc: '次元装置を買えるだけ買う', cond: { type: 'ascensions', n: 1 }, condDesc: '次元上昇1回' },
  { id: 'autoAscend', name: '自動次元上昇', desc: '条件を満たしたら自動で次元上昇', cond: { type: 'ascensions', n: 5 }, condDesc: '次元上昇5回' },
];

export const AUTO_TAP_BASE_RATE = 2; // 回/秒
export const AUTO_BUY_INTERVAL = 0.5; // 秒
