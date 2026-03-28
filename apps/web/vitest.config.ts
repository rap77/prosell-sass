import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./tests/setup.tsx'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/types/**',
      ],
      // 80% coverage target for Phase 8 Vehicle CRUD
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },

    // Include files
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],

    // Exclude files
    exclude: ['node_modules/', 'dist/', '.next/', 'out/'],

    // Global aliases
    alias: {
      '@': path.resolve(__dirname, './src'),
    },

    // Timeout for tests (ms)
    testTimeout: 10000,

    // Threads for parallel execution
    threads: true,

    // Watch mode (enabled by default in dev)
    watch: true,

    // Globals (optional, for jest-like globals)
    globals: true,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
