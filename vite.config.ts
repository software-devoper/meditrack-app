import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildTimestamp = Date.now();
const buildVersion = `v${new Date(buildTimestamp).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`;

function versionPlugin(): Plugin {
  return {
    name: 'version-generator',
    buildStart() {
      const versionPayload = {
        version: buildVersion,
        buildTime: buildTimestamp,
        builtAt: new Date(buildTimestamp).toISOString(),
      };
      try {
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(
          path.resolve(publicDir, 'version.json'),
          JSON.stringify(versionPayload, null, 2),
          'utf-8'
        );
      } catch (err) {
        console.error('Failed to write public/version.json', err);
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: buildVersion,
            buildTime: buildTimestamp,
            builtAt: new Date(buildTimestamp).toISOString(),
          },
          null,
          2
        ),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    define: {
      __APP_BUILD_TIME__: JSON.stringify(buildTimestamp),
      __APP_VERSION__: JSON.stringify(buildVersion),
    },
    assetsInclude: ['**/*.glb', '**/*.gltf'],
    plugins: [react(), tailwindcss(), versionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'firebase/app': path.resolve(__dirname, 'src/lib/firebase-mock.ts'),
        'firebase/auth': path.resolve(__dirname, 'src/lib/firebase-mock.ts'),
        'firebase/firestore': path.resolve(__dirname, 'src/lib/firebase-mock.ts'),
      },
      dedupe: ['react', 'react-dom', 'react-is'],
    },
    optimizeDeps: {
      include: ['react-is', 'recharts'],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
