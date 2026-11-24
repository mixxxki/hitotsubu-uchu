import './fonts.css';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Game } from './core/game.ts';
import { SAVE_KEY, loadStatus } from './core/save.ts';
import { toast } from './ui/overlay.ts';
import { App } from './ui/app.ts';

const game = new Game();
const app = new App(game, document.getElementById('app')!);

if (loadStatus.failed) {
  setTimeout(() => toast('セーブを読み込めなかったため新しく始めた（元のデータは端末内に退避済み）', '', 6000), 500);
}

let lastSaveWarn = 0;
game.onSaveError = () => {
  if (Date.now() - lastSaveWarn < 60000) return;
  lastSaveWarn = Date.now();
  toast('保存できなかった（端末の空き容量やプライベートモードを確認）。設定からエクスポートしておくと安心。', '', 6000);
};

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
