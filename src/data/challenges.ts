// 挑戦（縛りルール付きの周回）。目標粒子に達した状態でビッグバンすると達成。

export type ChallengeRule =
  | 'noTap'
  | 'noUpgrades'
  | 'lowGensOnly'
  | 'heavyCost'
  | 'noStars'
  | 'noMilestones'
  | 'noAchievements'
  | 'decay'
  | 'weakPow'
  | 'lastBoughtOnly'
  | 'noLaws'
  | 'vacuum';

export type ChallengeReward =
  | { type: 'genMult'; mult: number }
  | { type: 'upgradeCost'; mult: number }
  | { type: 'lowGenMult'; mult: number }
  | { type: 'costGrowth'; sub: number }
  | { type: 'starPow'; mult: number }
  | { type: 'milestoneMult'; add: number }
  | { type: 'achBonus'; add: number }
  | { type: 'runTimeMult'; maxMult: number }
  | { type: 'prodMult'; mult: number }
  | { type: 'synergyMult'; mult: number }
  | { type: 'constGain'; mult: number }
  | { type: 'constExp'; add: number };

export interface ChallengeDef {
  id: string;
  name: string;
  rule: ChallengeRule;
  ruleDesc: string;
  goal: number; // この周回の累計粒子
  reward: ChallengeReward;
  rewardDesc: string;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: 'c1', name: '無音の宇宙', rule: 'noTap', ruleDesc: 'タップと自動タップで粒子を得られない', goal: 1e15, reward: { type: 'genMult', mult: 3 }, rewardDesc: '生成装置の生産×3' },
  { id: 'c2', name: '貧しい星屑', rule: 'noUpgrades', ruleDesc: '強化を購入できない', goal: 1e15, reward: { type: 'upgradeCost', mult: 0.5 }, rewardDesc: '強化の価格×0.5' },
  { id: 'c3', name: '小さな世界', rule: 'lowGensOnly', ruleDesc: '塵・小石・岩塊・月しか購入できない', goal: 1e15, reward: { type: 'lowGenMult', mult: 25 }, rewardDesc: '塵〜月の生産×25' },
  { id: 'c4', name: '重力の枷', rule: 'heavyCost', ruleDesc: '生成装置の価格増加率+0.1', goal: 1e20, reward: { type: 'costGrowth', sub: 0.01 }, rewardDesc: '生成装置の価格増加率-0.01' },
  { id: 'c5', name: '暗い空', rule: 'noStars', ruleDesc: '流れ星が現れない', goal: 1e26, reward: { type: 'starPow', mult: 3 }, rewardDesc: '流れ星の効果×3' },
  { id: 'c6', name: '平坦な道', rule: 'noMilestones', ruleDesc: '25・50・100台の節目ボーナスが無効', goal: 1e30, reward: { type: 'milestoneMult', add: 0.5 }, rewardDesc: '節目ボーナス+0.5' },
  { id: 'c7', name: '忘却', rule: 'noAchievements', ruleDesc: '実績ボーナスが無効', goal: 1e34, reward: { type: 'achBonus', add: 0.01 }, rewardDesc: '実績1個ごとの倍率+1%' },
  { id: 'c8', name: '減衰', rule: 'decay', ruleDesc: '生産が時間とともに落ちる（10分で半分）', goal: 1e40, reward: { type: 'runTimeMult', maxMult: 20 }, rewardDesc: '周回の経過時間で生産増（最大×20）' },
  { id: 'c9', name: '萎縮', rule: 'weakPow', ruleDesc: '生産量が0.8乗になる', goal: 1e42, reward: { type: 'prodMult', mult: 1e4 }, rewardDesc: 'すべての生産×10000' },
  { id: 'c10', name: '一点集中', rule: 'lastBoughtOnly', ruleDesc: '最後に購入した種類の装置しか生産しない', goal: 1e50, reward: { type: 'synergyMult', mult: 3 }, rewardDesc: '相乗効果×3' },
  { id: 'c11', name: '無法', rule: 'noLaws', ruleDesc: '法則の木の効果が無効', goal: 1e58, reward: { type: 'constGain', mult: 5 }, rewardDesc: '宇宙定数の獲得×5' },
  { id: 'c12', name: '真空', rule: 'vacuum', ruleDesc: 'タップ・強化・流れ星がすべて無効', goal: 1e68, reward: { type: 'constExp', add: 0.15 }, rewardDesc: '宇宙定数倍率の指数+0.15' },
];
