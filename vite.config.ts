import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({ include: ['src'], exclude: ['**/*.test.*', '**/*.stories.*', '**/*.cy.*'] }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      // React stays external and is declared as a peer dependency.
      // Bundling it is how a component library ships two Reacts into a consumer's app.
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // TODO(styles.css export): nothing imports the stylesheet while
        // src/index.ts is empty, so the build emits no CSS and the
        // "./styles.css" package.json export was removed to avoid a dangling
        // subpath. When the first component imports ./styles/index.css and
        // dist/styles.css is actually emitted, restore that export and verify
        // the emitted asset name matches (Vite may name it index.css).
        assetFileNames: (asset) => (asset.name === 'style.css' ? 'styles.css' : asset.name!),
      },
    },
    sourcemap: true,
  },
});
