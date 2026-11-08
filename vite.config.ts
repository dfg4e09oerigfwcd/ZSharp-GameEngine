import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  base: './',
  server: { host: '0.0.0.0' },
  test: { environment: 'node' }
});
