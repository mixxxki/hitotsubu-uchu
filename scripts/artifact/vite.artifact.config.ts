// claude.ai Artifact 向けの単一 HTML ビルド（PWA なし・アセットはすべて埋め込み）
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import pkg from '../../package.json' with { type: 'json' };

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { 'virtual:pwa-register': fileURLToPath(new URL('./pwa-stub.ts', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    outDir: 'dist-artifact',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
