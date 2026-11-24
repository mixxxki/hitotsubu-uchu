import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/700.css';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Game } from './core/game.ts';
import { SAVE_KEY } from './core/save.ts';
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

// 別のタブで同じデータが保存されたら、二重進行を防ぐためこのタブを止める
window.addEventListener('storage', (e) => {
  if (e.key !== SAVE_KEY) return;
  game.stop();
  game.save = () => {};
  document.body.classList.add('stale');
  const msg = document.createElement('div');
  msg.className = 'stale-msg';
  msg.textContent = '別のタブで遊んでいます。このタブは止まりました。タップで再読み込み。';
  msg.addEventListener('click', () => location.reload());
  document.body.append(msg);
});

registerSW({ immediate: true });

// 開発時のデバッグ用
if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
