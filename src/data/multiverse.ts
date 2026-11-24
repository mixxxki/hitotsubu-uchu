// 3層目「多元宇宙」— 枠のみ。中身（強化・装置など）はここに追加していく。
// 解放条件は balance.ts の multiverseReq* を参照。

export interface MultiverseUpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
}

/** 多元宇宙で買える強化（未実装・今後追加） */
export const MULTIVERSE_UPGRADES: MultiverseUpgradeDef[] = [];

/** 多元化で得る通貨「可能性」の計算式パラメータ */
export const MULTIVERSE_GAIN = {
  /** 可能性 = floor(mult * (次元の欠片(この次元上昇周回で累計) / req)^exp) */
  mult: 1,
  exp: 0.25,
};
