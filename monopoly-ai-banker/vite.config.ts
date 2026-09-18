import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Hosted at https://franceschiindustries.com/monopoly-ai-banker/, not
      // the domain root -- without this, built asset URLs are root-absolute
      // (/assets/...) and 404 under the subpath.
      base: mode === 'production' ? '/monopoly-ai-banker/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Cloudflare Worker that holds the real Gemini key server-side --
        // see worker/README.md. No API key is ever defined here for the
        // client bundle.
        'process.env.PROXY_URL': JSON.stringify(
          env.PROXY_URL || 'https://monopoly-ai-banker-proxy.juan-franceschi5.workers.dev'
        ),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
