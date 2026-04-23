import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.spec.ts',
      'src/**/__tests__/**/*.spec.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/**'],
    root: process.cwd(),
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/__tests__/**',
        '**/*.module.ts',
        'src/main.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
