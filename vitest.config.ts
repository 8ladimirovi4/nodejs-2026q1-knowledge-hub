import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.unit.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/**'],
    root: process.cwd(),
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // 08a-testing score.md: user/article/auth services, guards, DTOs (class-validator);
      // + optional custom pipes, interceptors, exception filters when added under src/.
      include: [
        'src/user/user.service.ts',
        'src/article/app.service.ts',
        'src/auth/auth.service.ts',
        'src/auth/refresh-token-blacklist.service.ts',
        'src/auth/guards/**/*.ts',
        'src/user/dto/*.dto.ts',
        'src/article/dto/*.dto.ts',
        'src/auth/dto/*.ts',
        'src/**/pipes/**/*.ts',
        'src/**/*.interceptor.ts',
        'src/**/*.filter.ts',
      ],
      exclude: [
        '**/*.unit.spec.ts',
        '**/*.module.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
