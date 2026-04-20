import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      // The app is shipped natively via Capacitor (iOS/Android) and assets
      // live in the app bundle, so we deliberately do NOT want a service
      // worker caching anything — stale SW caches were the source of
      // "wrong game shows up" bugs on installed devices.
      //
      // selfDestroying:true generates a SW whose only job is to call
      // registration.unregister() and clear all caches. This cleans up any
      // SW that older builds (which used registerType:'autoUpdate') left
      // installed on users' devices. Once we're confident every active
      // user has loaded a build with selfDestroying enabled, this whole
      // VitePWA block can be removed; until then, leave it in place.
      VitePWA({
        selfDestroying: true,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Phillies Story Quest',
          short_name: 'Phillies Quest',
          description: 'Philadelphia Phillies interactive game recap quiz',
          theme_color: '#080e10',
          background_color: '#080e10',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        }
      })
    ],
    server: {
      proxy: {
        '/api/claude': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/claude/, '/v1/messages'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-api-key', env.VITE_ANTHROPIC_API_KEY);
              proxyReq.setHeader('anthropic-version', '2023-06-01');
              proxyReq.setHeader('content-type', 'application/json');
            });
          }
        }
      }
    }
  };
});
