import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/700.css';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Game } from './core/game.ts';
import { App } from './ui/app.ts';

const game = new Game();
const app = new App(game, document.getElementById('app')!);

const report = game.applyOffline();
if (report) app.showOffline(report);

let lastT = performance.now();
game.start(() => {
  const t = performance.now();
  app.frame((t - lastT) / 1000);
  lastT = t;
});

// 画面を離れたら保存、戻ったら差分を一括計算
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    game.save();
  } else {
    const r = game.applyOffline();
    if (r) app.showOffline(r);
  }
});
window.addEventListener('pagehide', () => game.save());

registerSW({ immediate: true });

// 開発時のデバッグ用
if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
