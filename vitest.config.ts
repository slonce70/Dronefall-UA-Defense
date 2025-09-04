import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
