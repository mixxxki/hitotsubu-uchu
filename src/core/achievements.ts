// 実績の判定
import type { GameState } from './state.ts';
import type { Mods } from './formulas.ts';
import { ACHIEVEMENTS, type AchCond } from '../data/achievements.ts';
import { emit } from './events.ts';

export function achMet(s: GameState, m: Mods, c: AchCond): boolean {
  switch (c.type) {
    case 'gen': return s.gens[c.gen] >= c.n;
    case 'allTotal': return s.allTotal.gte(c.amount);
    case 'pps': return m.pps.gte(c.amount);
    case 'taps': return s.taps >= c.n;
    case 'stars': return s.starsCaught >= c.n;
    case 'upgrades': return s.upgrades.size >= c.n;
    case 'bigBangs': return s.bigBangsEver >= c.n;
    case 'constants': return s.constantsAllTime.gte(c.amount);
    case 'challenge': return s.challengesDone.has(c.index);
    case 'ascensions': return s.ascensions >= c.n;
    case 'dimGen': return s.dimGens[c.index].bought > 0;
    case 'laws': return s.laws.size >= c.n;
    case 'offline': return s.longestOffline >= c.seconds;
    case 'exported': return s.exported;
    case 'fastBigBang': return s.fastestBigBang <= c.seconds;
  }
}

export function checkAchievements(s: GameState, m: Mods): void {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.has(a.id)) continue;
    if (achMet(s, m, a.cond)) {
      s.achievements.add(a.id);
      emit({ type: 'achievement', id: a.id });
    }
  }
}
