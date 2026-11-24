// ゲーム全体のバランス定数。数値調整は基本的にこのファイルと src/data/*.ts で行う。

export const BALANCE = {
  /** ロジック更新回数（回/秒） */
  tickRate: 20,
  /** 自動保存の間隔（ミリ秒） */
  autosaveMs: 5000,

  // ---- タップ ----
  /** タップ1回の基本獲得量 */
  tapBase: 1,

  // ---- 生成装置の節目 ----
  /** この所持数に達するたびに生産×milestoneMult。最後の値以降は milestoneEvery 台ごと */
  milestones: [25, 50, 100] as number[],
  milestoneEvery: 100,
  milestoneMult: 2,

  // ---- 流れ星 ----
  starIntervalMin: 70, // 秒
  starIntervalMax: 160,
  starLifetime: 12, // 画面に残る秒数
  starBuffMult: 7, // 一定時間の倍率
  starBuffDuration: 30, // 秒
  starBuffChance: 0.65, // 倍率になる確率（残りは粒子の塊）
  starLumpSeconds: 900, // 塊: 毎秒生産の何秒分
  starLumpBankFrac: 0.15, // 塊: 所持粒子の何割まで

  // ---- 実績 ----
  achievementBonus: 0.01, // 1個ごとの全体倍率

  // ---- ビッグバン ----
  bigBangReq: 1e15,
  /** 宇宙定数 = floor(gainMult * (粒子/req)^gainExp) */
  bigBangGainMult: 2,
  bigBangGainExp: 0.4,
  /** 宇宙定数（累計）1個ごとの生産倍率 */
  constantEffectPer: 1,
  /** 宇宙定数倍率の指数（法則の木で上昇） */
  constantEffectExp: 0.75,
  /** 法則「膨張」「調和」で数えるビッグバン回数の上限（連打が最適にならないように） */
  perBigBangCap: 30,

  // ---- 次元上昇 ----
  ascendReq: 1e100,
  /** 次元の欠片 = floor(ascendGainMult * 10^((log10(粒子) - 100) / ascendGainDiv)) */
  ascendGainMult: 10,
  ascendGainDiv: 26,
  /** 次元エネルギーの効果: 粒子生産 ×(1+E)^energyExp */
  energyExp: 0.5,
  /** 次元エネルギーの効果: 宇宙定数獲得 ×(1+E)^energyConstExp */
  energyConstExp: 0.15,
  /** 次元エネルギーの効果: 次元の欠片獲得 ×(1+E)^energyShardExp */
  energyShardExp: 0.02,

  // ---- 多元宇宙（枠のみ） ----
  multiverseReqShardsEver: 3e15,
  multiverseReqAscensions: 10,

  // ---- 放置 ----
  offlineCapHours: 24,
  offlineMinSeconds: 30, // これ未満の留守は表示しない
  offlineSteps: 4000, // 一括計算の最大分割数
  offlineMaxDt: 5, // 1ステップの最大秒数（超える場合は分割数の上限で打ち切り）
} as const;
