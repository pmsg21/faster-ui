import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ['src'],
      exclude: [
        '**/*.test.*',
        '**/*.stories.*',
        '**/*.cy.*',
        // Build-time machinery, not public API. Nothing in src/index.ts references
        // it, so shipping its declaration only advertises an import we never
        // promised to keep working.
        '**/contrast-contract.ts',
      ],
    }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    // No CSS comes out of this build on purpose. `src/index.ts` does not import the
    // stylesheet — that would make every consumer pay for it as a side effect and
    // hand them our compiled utilities instead of our tokens. The publishable
    // stylesheet is emitted by `scripts/emit-styles.mjs`, which copies the token
    // layer verbatim and asserts it landed where package.json says it did.
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      // React stays external and is declared as a peer dependency.
      // Bundling it is how a component library ships two Reacts into a consumer's app.
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    sourcemap: true,
  },
});
