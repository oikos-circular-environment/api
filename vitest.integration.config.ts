import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    root: './',
    globalSetup: './src/test/integration-setup.ts',
    include: ['src/**/*.integration.spec.ts'],
    fileParallelism: false,
  },
});
