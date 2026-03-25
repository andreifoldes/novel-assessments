import { defineConfig } from 'vite';
import { resolve } from 'path';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProd ? '/novel-assessments/moodline-os/' : '/',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
