/**
 * Vitest 全局测试配置
 * 在所有测试文件之前运行
 */

// 可以在这里配置全局的 mock、polyfill 等

// 示例：模拟环境变量
process.env.NODE_ENV = 'test';

// 示例：全局超时设置
// vi.setConfig({ testTimeout: 10000 });

// 导出一些测试辅助函数
export function createMockEndpoint(overrides = {}) {
  return {
    path: '/api/test',
    method: 'GET',
    name: 'Test endpoint',
    ...overrides
  };
}

export function createMockOpenAPI(overrides = {}) {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {},
    ...overrides
  };
}

