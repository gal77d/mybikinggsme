import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo-name>/.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 6000, // Rapier's inlined WASM is large
  },
});
