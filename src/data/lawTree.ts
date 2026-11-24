// 法則の木（宇宙定数で購入する永続強化）。ビッグバンでは消えず、次元上昇でリセット。

export type LawEffect =
  | { type: 'prodMult'; mult: number }
  | { type: 'tapMult'; mult: number }
  | { type: 'costMult'; mult: number } // 生成装置の価格×
  | { type: 'startParticles'; amount: number }
  | { type: 'keepGenUpgrades'; tiers: number } // ビッグバン時に装置強化の下位tierを保持
  | { type: 'offlineHours'; add: number }
  | { type: 'starFreq'; mult: number }
  | { type: 'starAuto' } // 流れ星を自動で捕まえる
  | { type: 'constGain'; mult: number }
  | { type: 'constExp'; add: number } // 宇宙定数倍率の指数+
  | { type: 'achBonus'; add: number }
  | { type: 'autoTap'; add: number } // 自動タップ 回/秒
  | { type: 'perBigBang'; per: number } // ビッグバン回数×per の倍率
  | { type: 'perRunTime'; maxMult: number } // 周回経過時間で倍率（1時間で最大）
  | { type: 'milestoneMult'; add: number } // 節目倍率+
  | { type: 'unlockChallenges'; from: number; to: number }
  | { type: 'genPow'; add: number } // 生産量の指数+
  | { type: 'autoSpeed'; mult: number } // 自動処理の頻度
  | { type: 'constPerRunTime'; maxMult: number; seconds: number }; // 周回の経過時間で宇宙定数の獲得増

export interface LawNode {
  id: string;
  name: string;
  desc: string;
  cost: number;
  req: string[]; // いずれか1つ購入済みで購入可（ルートは空）
  /** 二択: このノードと同時には持てない法則 */
  excl?: string;
  col: number; // 0..4
  row: number;
  effects: LawEffect[];
}

export const LAW_TREE: LawNode[] = [
  { id: 'origin', name: '最初の法則', desc: 'すべての生産×3', cost: 1, req: [], col: 2, row: 0, effects: [{ type: 'prodMult', mult: 3 }] },

  { id: 'gravity', name: '引力', desc: 'すべての生産×2、自動タップ+1回/秒', cost: 2, req: ['origin'], col: 1, row: 1, effects: [{ type: 'prodMult', mult: 2 }, { type: 'autoTap', add: 1 }] },
  { id: 'impact', name: '衝突', desc: 'タップ獲得量×10', cost: 2, req: ['origin'], col: 3, row: 1, effects: [{ type: 'tapMult', mult: 10 }] },
  { id: 'memory', name: '記憶', desc: 'ビッグバン後に粒子1,000から開始', cost: 3, req: ['origin'], col: 2, row: 1, effects: [{ type: 'startParticles', amount: 1e3 }] },

  { id: 'expansion', name: '膨張', desc: 'ビッグバン1回ごとに生産+25%（30回まで）', cost: 6, req: ['gravity'], col: 0, row: 2, effects: [{ type: 'perBigBang', per: 0.25 }] },
  { id: 'inertia', name: '慣性', desc: '生成装置の価格×0.8', cost: 8, req: ['gravity', 'memory'], col: 1, row: 2, effects: [{ type: 'costMult', mult: 0.8 }] },
  { id: 'trial1', name: '試練の門', desc: '挑戦1〜4を解放', cost: 12, req: ['memory'], col: 2, row: 2, effects: [{ type: 'unlockChallenges', from: 0, to: 4 }] },
  { id: 'meteor', name: '流星の法則', desc: '流れ星の出現間隔×0.7', cost: 8, req: ['impact'], col: 3, row: 2, effects: [{ type: 'starFreq', mult: 0.7 }] },
  { id: 'echo', name: '残響', desc: '実績1個ごとの倍率+0.5%', cost: 15, req: ['impact'], col: 4, row: 2, effects: [{ type: 'achBonus', add: 0.005 }] },

  { id: 'condense', name: '凝縮', desc: '宇宙定数の獲得×1.5', cost: 60, req: ['expansion', 'inertia'], col: 0, row: 3, effects: [{ type: 'constGain', mult: 1.5 }] },
  { id: 'heritage', name: '継承', desc: 'ビッグバン時、装置強化の1〜2段目を保持', cost: 100, req: ['inertia'], col: 1, row: 3, effects: [{ type: 'keepGenUpgrades', tiers: 2 }] },
  { id: 'patience', name: '忍耐', desc: '放置上限+12時間', cost: 40, req: ['trial1'], col: 2, row: 3, effects: [{ type: 'offlineHours', add: 12 }] },
  { id: 'net', name: '星の網', desc: '流れ星を自動で捕まえる', cost: 150, req: ['meteor'], col: 3, row: 3, effects: [{ type: 'starAuto' }] },
  { id: 'rhythm', name: '律動', desc: '自動タップ+4回/秒、タップ×5', cost: 120, req: ['echo', 'meteor'], col: 4, row: 3, effects: [{ type: 'autoTap', add: 4 }, { type: 'tapMult', mult: 5 }] },

  { id: 'density', name: '密度', desc: '宇宙定数倍率の指数+0.05', cost: 2000, req: ['condense'], col: 0, row: 4, effects: [{ type: 'constExp', add: 0.05 }] },
  { id: 'momentum', name: '運動量', desc: '周回の経過時間に応じて宇宙定数の獲得増（5分で最大×3）', cost: 5000, req: ['heritage', 'condense'], col: 1, row: 4, effects: [{ type: 'constPerRunTime', maxMult: 3, seconds: 300 }] },
  { id: 'trial2', name: '試練の回廊', desc: '挑戦5〜8を解放', cost: 10000, req: ['patience'], col: 2, row: 4, effects: [{ type: 'unlockChallenges', from: 4, to: 8 }] },
  { id: 'orbit', name: '軌道', desc: '節目ボーナス×2→×2.5', cost: 8000, req: ['net', 'patience'], col: 3, row: 4, effects: [{ type: 'milestoneMult', add: 0.5 }] },
  { id: 'resonance', name: '共鳴', desc: 'すべての生産×10', cost: 20000, req: ['rhythm'], col: 4, row: 4, effects: [{ type: 'prodMult', mult: 10 }] },

  { id: 'mass', name: '質量', desc: '宇宙定数の獲得×2', cost: 500000, req: ['density'], col: 0, row: 5, effects: [{ type: 'constGain', mult: 2 }] },
  { id: 'heritage2', name: '深い継承', desc: 'ビッグバン時、装置強化の1〜4段目を保持、粒子1e6から開始', cost: 2e06, req: ['momentum'], col: 1, row: 5, effects: [{ type: 'keepGenUpgrades', tiers: 4 }, { type: 'startParticles', amount: 1e6 }] },
  { id: 'eternity', name: '永続', desc: '放置上限+24時間', cost: 500000, req: ['trial2'], col: 2, row: 5, effects: [{ type: 'offlineHours', add: 24 }] },
  { id: 'swift', name: '迅速', desc: '自動購入・自動ビッグバンの判定が毎tick（0.05秒ごと）になる', cost: 1e06, req: ['orbit'], col: 3, row: 5, effects: [{ type: 'autoSpeed', mult: 10 }] },
  { id: 'harmony', name: '調和', desc: 'ビッグバン1回ごとに生産+50%（30回まで）', cost: 5e06, req: ['resonance', 'orbit'], col: 4, row: 5, effects: [{ type: 'perBigBang', per: 0.5 }] },

  { id: 'curvature', name: '曲率', desc: '生産量の指数+0.02', cost: 1e10, req: ['mass', 'heritage2'], col: 0, row: 6, effects: [{ type: 'genPow', add: 0.02 }] },
  { id: 'entropy', name: 'エントロピー', desc: '生成装置の価格×0.5', cost: 3e09, req: ['heritage2'], col: 1, row: 6, effects: [{ type: 'costMult', mult: 0.5 }] },
  { id: 'trial3', name: '試練の深淵', desc: '挑戦9〜12を解放', cost: 5e09, req: ['eternity'], col: 2, row: 6, effects: [{ type: 'unlockChallenges', from: 8, to: 12 }] },
  { id: 'luminosity', name: '光度', desc: '【二択】すべての生産×40（星々の合唱とどちらか一方）', cost: 1e10, req: ['swift', 'harmony'], excl: 'chorus', col: 3, row: 6, effects: [{ type: 'prodMult', mult: 40 }] },
  { id: 'chorus', name: '星々の合唱', desc: '【二択】宇宙定数の獲得×4、実績1個ごとの倍率+1%（光度とどちらか一方）', cost: 1e10, req: ['harmony'], excl: 'luminosity', col: 4, row: 6, effects: [{ type: 'constGain', mult: 4 }, { type: 'achBonus', add: 0.01 }] },

  { id: 'singular', name: '特異点', desc: '宇宙定数倍率の指数+0.1', cost: 1e15, req: ['curvature'], col: 0, row: 7, effects: [{ type: 'constExp', add: 0.1 }] },
  { id: 'collapse', name: '崩壊', desc: '宇宙定数の獲得×3', cost: 5e15, req: ['entropy', 'curvature'], col: 1, row: 7, effects: [{ type: 'constGain', mult: 3 }] },
  { id: 'horizon', name: '事象の地平', desc: '放置上限+48時間', cost: 1e14, req: ['trial3'], col: 2, row: 7, effects: [{ type: 'offlineHours', add: 48 }] },
  { id: 'pulsar', name: 'パルサー', desc: '自動タップ+15回/秒、流れ星の出現間隔×0.7', cost: 1e16, req: ['luminosity', 'chorus'], col: 3, row: 7, effects: [{ type: 'autoTap', add: 15 }, { type: 'starFreq', mult: 0.7 }] },
  { id: 'quasar', name: 'クエーサー', desc: 'すべての生産×1000', cost: 1e17, req: ['luminosity', 'chorus'], col: 4, row: 7, effects: [{ type: 'prodMult', mult: 1000 }] },

  { id: 'unified', name: '統一理論', desc: '生産量の指数+0.03、節目ボーナス+0.5', cost: 1e22, req: ['singular', 'collapse', 'horizon', 'pulsar', 'quasar'], col: 2, row: 8, effects: [{ type: 'genPow', add: 0.03 }, { type: 'milestoneMult', add: 0.5 }] },
];

/** 繰り返し購入できる法則（木をすべて埋めた後の受け皿） */
export const LAW_REPEAT = {
  id: 'infinite',
  name: '無限の法則',
  desc: 'レベルごとにすべての生産×10',
  baseCost: 1e22,
  costGrowth: 400,
  mult: 10,
  /** 解放条件: このノード購入済み */
  req: 'unified',
};
