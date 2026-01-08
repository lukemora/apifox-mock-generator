import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.e2e.test.ts'],
    // e2e 共享 mock.config.js，禁止并行以避免互相覆盖
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // 使用 fork 模式而不是线程模式，以支持 process.chdir()
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // 单进程运行，避免并发问题
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
});

