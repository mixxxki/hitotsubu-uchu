import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: true,
  },
  build: {
    target: 'es2022',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'screenshot-1.png'],
      manifest: {
        name: 'ひとつぶ宇宙',
        short_name: 'ひとつぶ宇宙',
        description: '核をタップして粒子を集め、宇宙を育てるインクリメンタルゲーム',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#07070C',
        theme_color: '#07070C',
        id: '/',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [{ src: 'screenshot-1.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: 'ひとつぶ宇宙のプレイ画面' }],
      },
      workbox: {
        // 本文フォント（日本語のサブセット）まで含めてオフラインで動くようにする
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['**/screenshot-*.png'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
