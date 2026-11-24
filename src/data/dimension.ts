// 次元上昇の層: 次元の欠片で買う「次元の刻印」。次元上昇でも消えない（多元宇宙でリセット予定）。

export type DimUpgradeEffect =
  | { type: 'prodMult'; mult: number }
  | { type: 'keepTree' }
  | { type: 'keepChallenges' }
  | { type: 'startConstants'; amount: number }
  | { type: 'startBigBangs'; n: number }
  | { type: 'constGain'; mult: number }
  | { type: 'dimGenMult'; mult: number }
  | { type: 'energyExp'; add: number }
  | { type: 'offlineHours'; add: number }
  | { type: 'shardGain'; mult: number };

export interface DimUpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  effect: DimUpgradeEffect;
}

export const DIM_UPGRADES: DimUpgradeDef[] = [
  { id: 'd_prod', name: '高次の視点', desc: 'すべての生産×1000', cost: 1, effect: { type: 'prodMult', mult: 1000 } },
  { id: 'd_const', name: '定数の泉', desc: '次元上昇後、宇宙定数100から開始', cost: 2, effect: { type: 'startConstants', amount: 100 } },
  { id: 'd_tree', name: '法則の記憶', desc: '次元上昇しても法則の木を保持', cost: 4, effect: { type: 'keepTree' } },
  { id: 'd_bb', name: '膨張の記憶', desc: '次元上昇後、ビッグバン回数10から開始', cost: 6, effect: { type: 'startBigBangs', n: 10 } },
  { id: 'd_chal', name: '試練の記憶', desc: '次元上昇しても挑戦の達成を保持', cost: 10, effect: { type: 'keepChallenges' } },
  { id: 'd_cgain', name: '定数の奔流', desc: '宇宙定数の獲得×10', cost: 25, effect: { type: 'constGain', mult: 10 } },
  { id: 'd_dim', name: '次元の厚み', desc: '次元装置の生産×3', cost: 60, effect: { type: 'dimGenMult', mult: 3 } },
  { id: 'd_off', name: '時の外側', desc: '放置上限+72時間', cost: 150, effect: { type: 'offlineHours', add: 72 } },
  { id: 'd_exp', name: '次元の浸透', desc: '次元エネルギー効果の指数+0.1', cost: 400, effect: { type: 'energyExp', add: 0.1 } },
  { id: 'd_shard', name: '欠片の共鳴', desc: '次元の欠片の獲得×3', cost: 2000, effect: { type: 'shardGain', mult: 3 } },
  { id: 'd_dim2', name: '次元の深み', desc: '次元装置の生産×10', cost: 2e4, effect: { type: 'dimGenMult', mult: 10 } },
  { id: 'd_prod2', name: '超越の視点', desc: 'すべての生産×1e10', cost: 2e5, effect: { type: 'prodMult', mult: 1e10 } },
];

/** 繰り返し購入: 次元エネルギー獲得×2 */
export const DIM_REPEAT = {
  id: 'd_repeat',
  name: '次元の共鳴',
  desc: 'レベルごとに次元エネルギーの生成×2',
  baseCost: 5,
  costGrowth: 4,
  mult: 2,
};
