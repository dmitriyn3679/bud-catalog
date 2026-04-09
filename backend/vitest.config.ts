import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/utils/pricing.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
