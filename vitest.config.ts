import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 25, functions: 15, statements: 25, branches: 15 },
      exclude: ['src/generated/**', 'tests/**'],
    },
  },
})
