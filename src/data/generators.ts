// 生成装置（粒子を生む8種）
export interface GeneratorDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  costGrowth: number;
  baseProd: number; // 1台あたり毎秒
  icon: GenIcon;
}

/** アイコン形状（UIが描画する） */
export type GenIcon = 'dust' | 'pebble' | 'rock' | 'moon' | 'planet' | 'star' | 'cluster' | 'galaxy';

export const GENERATORS: GeneratorDef[] = [
  { id: 'dust', name: '塵', desc: '漂う微粒子が、少しずつ寄り集まる。', baseCost: 10, costGrowth: 1.15, baseProd: 0.15, icon: 'dust' },
  { id: 'pebble', name: '小石', desc: '固まった塵。転がるたびに粒子をこぼす。', baseCost: 120, costGrowth: 1.15, baseProd: 1.1, icon: 'pebble' },
  { id: 'rock', name: '岩塊', desc: '重さが重さを呼ぶ。', baseCost: 1600, costGrowth: 1.15, baseProd: 7.5, icon: 'rock' },
  { id: 'moon', name: '月', desc: '引力の輪が粒子を集める。', baseCost: 2.4e4, costGrowth: 1.15, baseProd: 55, icon: 'moon' },
  { id: 'planet', name: '惑星', desc: '大気が粒子を紡ぐ。', baseCost: 4e5, costGrowth: 1.15, baseProd: 400, icon: 'planet' },
  { id: 'star', name: '恒星', desc: '核融合の炉。', baseCost: 7.5e6, costGrowth: 1.15, baseProd: 3200, icon: 'star' },
  { id: 'cluster', name: '星団', desc: '恒星たちの合唱。', baseCost: 1.6e8, costGrowth: 1.15, baseProd: 2.8e4, icon: 'cluster' },
  { id: 'galaxy', name: '銀河', desc: '渦を巻く光の海。', baseCost: 4e9, costGrowth: 1.15, baseProd: 2.6e5, icon: 'galaxy' },
];

// 次元装置（次元上昇で解放される新系統）。次元の欠片で購入。
// 1段目は「次元エネルギー」を、2段目以降は1つ下の段を生む。
export interface DimGenDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  costGrowth: number;
  baseProd: number;
}

export const DIM_GENERATORS: DimGenDef[] = [
  { id: 'string', name: '弦', desc: '震える一次元。次元エネルギーを生む。', baseCost: 1, costGrowth: 1.6, baseProd: 1 },
  { id: 'brane', name: '膜', desc: '弦を編む面。', baseCost: 20, costGrowth: 2.2, baseProd: 0.4 },
  { id: 'bubble', name: '泡宇宙', desc: '膜から生まれる泡。', baseCost: 600, costGrowth: 3, baseProd: 0.15 },
  { id: 'hyper', name: '超空間', desc: 'すべての外側。', baseCost: 4e4, costGrowth: 4, baseProd: 0.05 },
];

/** 次元装置: この購入数ごとに生産×dimMilestoneMult */
export const DIM_MILESTONE_EVERY = 10;
export const DIM_MILESTONE_MULT = 3;
