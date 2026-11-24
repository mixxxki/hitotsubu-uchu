// 背景の星（静止画。リサイズ時のみ再描画）
export function drawBackground(canvas: HTMLCanvasElement): void {
  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(hgt * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#07070C';
    ctx.fillRect(0, 0, w, hgt);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = Math.floor((w * hgt) / 2600);
    for (let i = 0; i < n; i++) {
      const x = rnd() * w;
      const y = rnd() * hgt;
      const r = rnd() < 0.92 ? 0.6 : 1.1;
      const a = 0.15 + rnd() * 0.45;
      const tint = rnd();
      ctx.fillStyle = tint < 0.08 ? `rgba(167,139,250,${a})` : tint < 0.12 ? `rgba(255,209,102,${a})` : `rgba(232,230,240,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  draw();
  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = window.setTimeout(draw, 150);
  });
}
