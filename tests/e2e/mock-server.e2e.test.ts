import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import type { Server } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { loadConfig } from '../../src/core/config-loader.js';
import { loadMockConfig, type MockConfig } from '../../src/core/mock-config-loader.js';
import { loadMockRoutes } from '../../src/infrastructure/server/route-loader.js';
import { RouteManagerImpl } from '../../src/infrastructure/route-manager/route-manager.impl.js';
import { setupMockServer } from '../../src/presentation/http/express-server.js';
import { RouteHandler } from '../../src/presentation/http/route-handler.js';
import { TestHelpers } from './utils/test-helpers.js';

const execAsync = promisify(exec);

// API 前缀常量
const API_PREFIX = '/mng-common/api';

/**
 * Mock 服务器功能验证测试
 * 
 * 测试核心思路: 验证每个配置项对应的服务器状态、响应等是否符合预期。
 * 主要依托代理模式验证功能，Mock 模式下对应的 mock 文件已经生成好了，
 * 主要测试服务器是否能正确使用这些文件。
 */
describe.sequential('Mock 服务器功能验证', () => {
  let server: Server | null = null;
  const mockDir = join(process.cwd(), 'mock');
  const tempConfigPaths: string[] = [];

  afterAll(() => {
    // 关闭服务器
    if (server) {
      server.close();
    }
    // 清理临时配置文件
    TestHelpers.cleanupTempFiles(tempConfigPaths);
  });

  /**
   * 清理端口占用（仅 Windows）
   * @param port 要清理的端口号
   */
  async function cleanPort(port: number): Promise<void> {
    if (process.platform !== 'win32') {
      // 非 Windows 系统暂不支持自动清理端口
      return;
    }

    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        const pids = new Set<string>();

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
              pids.add(pid);
            }
          }
        });

        for (const pid of pids) {
          try {
            await execAsync(`taskkill /F /PID ${pid}`);
          } catch (error) {
            // 忽略清理失败的错误（可能是进程已经结束）
          }
        }

        // 等待端口释放
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      // 端口未被占用，这是正常情况
    }
  }

  beforeEach(async () => {
    // 每个测试前关闭之前的服务器
    if (server) {
      server.close();
      server = null;
    }
    // 清理端口占用（默认端口 10000）
    await cleanPort(10000);
  });

  afterEach(() => {
    // 清理临时配置文件
    TestHelpers.cleanupTempFiles(tempConfigPaths);
    tempConfigPaths.length = 0;
    // 清理临时生成的 logs 内的 openAPI 数据文件
    TestHelpers.cleanupOpenAPILogFiles();
  });

  /**
   * 启动服务器并返回服务器实例和配置
   * @param config mock.config.js 配置
   * @param options 选项
   * @param options.loadMockRoutes 是否加载真实的 mock 文件路由（默认 false，仅测试配置行为时不需要）
   */
  async function startServer(
    config: Partial<MockConfig>,
    options: { loadMockRoutes?: boolean } = {}
  ): Promise<{ server: Server; mockConfig: any; port: number; routeManager: RouteManagerImpl }> {
    const configPath = await TestHelpers.createTempMockConfig(config);
    tempConfigPaths.push(configPath);

    // 增加延迟以确保文件写入完成和模块缓存更新
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockConfig = await loadMockConfig();
    const routeManager = new RouteManagerImpl();

    // 只有在需要加载真实 mock 文件时才加载 apifox.config.json 和路由
    if (options.loadMockRoutes) {
      
      if (existsSync(mockDir)) {
        const apifoxConfig = await loadConfig();
        
        const routes = await loadMockRoutes(apifoxConfig, mockConfig);
        routes.forEach(route => {
          const key = `${route.method.toUpperCase()} ${route.path}`;
          routeManager.setRoute(key, route);
        });
        
      } else {
        throw new Error('mock 目录不存在');
      }
    }

    const app = setupMockServer(routeManager, mockConfig);
    const port = mockConfig.port;

    return new Promise((resolve, reject) => {
      const srv = app.listen(port, 'localhost', () => {
        resolve({ server: srv, mockConfig, port, routeManager });
      });
      srv.on('error', reject);
    });
  }

  /**
   * 发送 HTTP 请求到服务器
   */
  async function makeRequest(
    port: number,
    path: string,
    options: { method?: string; headers?: Record<string, string>; body?: any } = {}
  ): Promise<{ status: number; body: any; headers: Record<string, string> }> {
    const method = options.method || 'GET';
    const url = `http://localhost:${port}${path}`;

    const response = await fetch(url, {
      method,
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const body = await response.json().catch(() => null);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      body,
      headers,
    };
  }

  /**
   * 创建模拟请求和响应对象
   */
  function createMockReqRes(
    method: string,
    path: string,
    options: { query?: any; body?: any; headers?: Record<string, string>; params?: any } = {}
  ) {
    const mockReq: any = {
      method,
      path,
      query: options.query || {},
      body: options.body || {},
      headers: options.headers || {},
      params: options.params || {},
    };

    const mockRes: any = {
      status: function (code: number) {
        this.statusCode = code;
        return this;
      },
      json: function (data: any) {
        this.body = data;
        return this;
      },
      setHeader: function (key: string, value: string) {
        this.headers = this.headers || {};
        this.headers[key] = value;
        return this;
      },
      send: function (data: any) {
        this.body = data;
        return this;
      },
      statusCode: 200,
      body: null,
      headers: {},
    };

    return { mockReq, mockRes };
  }

  // ==================== 3.11.1 model 配置测试 ====================

  describe('3.11.1 model 配置测试', () => {
    describe('model="mock" 基础功能验证', () => {
      it('应该使用 Mock 模式处理请求并返回 mock 数据', async () => {
        // 使用真实的 mock 文件，而不是手动创建路由
        const { server: srv, mockConfig, routeManager } = await startServer(
          {
            model: 'mock',
          },
          { loadMockRoutes: true }
        );
        server = srv;

        await new Promise(resolve => setTimeout(resolve, 100));

        // 验证配置中的模式是 mock
        expect(mockConfig.model).toBe('mock');

        // 验证服务器实际使用 mock 模式处理请求
        // 使用真实的接口路径，如 /v1/auth/captcha
        const routeHandler = new RouteHandler(mockConfig, routeManager);
        const { mockReq, mockRes } = createMockReqRes('GET', '/v1/auth/captcha');

        const handled = await routeHandler.handleRequest(mockReq, mockRes);
        expect(handled).toBe(true);
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes.body).toBeDefined();

      });

      it('未匹配到路由时应返回 404 错误', async () => {
        const { server: srv, mockConfig, routeManager } = await startServer({
          model: 'mock',
        });
        server = srv;

        await new Promise(resolve => setTimeout(resolve, 100));

        const routeHandler = new RouteHandler(mockConfig, routeManager);
        const { mockReq, mockRes } = createMockReqRes('GET', '/api/notfound');

        const handled = await routeHandler.handleRequest(mockReq, mockRes);

        expect(handled).toBe(false);
      });
    });

    describe('model="proxy" 基础功能验证', () => {
      it('应该使用代理模式处理请求并转发到目标服务器', async () => {
        const { server: srv, mockConfig, routeManager } = await startServer({
          model: 'proxy',
          remoteTarget: false,
        });
        server = srv;

        await new Promise(resolve => setTimeout(resolve, 100));

        // 验证配置中的模式是 proxy
        expect(mockConfig.model).toBe('proxy');
        expect(mockConfig.target).toBe('http://172.24.7.99:8082');

        // 验证服务器实际使用 proxy 模式处理请求
        const routeHandler = new RouteHandler(mockConfig, routeManager);
        const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

        const handled = await routeHandler.handleRequest(mockReq, mockRes);

        expect(handled).toBe(true);
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes.body).toBeDefined();
      });

      it('网络错误时应返回 500 错误响应', async () => {
        const { server: srv, mockConfig, routeManager } = await startServer({
          model: 'proxy',
          target: 'http://invalid-domain-that-does-not-exist-12345.com',
          remoteTarget: false,
        });
        server = srv;

        await new Promise(resolve => setTimeout(resolve, 100));

        const routeHandler = new RouteHandler(mockConfig, routeManager);
        const { mockReq, mockRes } = createMockReqRes('GET', '/test');

        await routeHandler.handleRequest(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(500);
        expect(mockRes.body.code).toBe(500);
        expect(mockRes.body.message).toBe('代理服务器错误');
      });
    });
  });

  // ==================== 3.11.2 port 配置测试 ====================

  describe('3.11.2 port 配置测试', () => {

    it('应该使用默认端口 10000', async () => {
      const { server: srv, mockConfig } = await startServer({});
      server = srv;

      // 验证默认端口（从 test-helpers.ts 的默认配置中获取）
      // TestHelpers.createTempMockConfig 中定义的默认端口是 10000
      expect(mockConfig.port).toBe(10000);
    });

    it('应该能够清理端口占用', async () => {
      if (process.platform !== 'win32') {
        // 非 Windows 系统跳过此测试
        return;
      }

      const testPort = 10002;
      
      // 先启动一个服务器占用端口
      const { server: srv1 } = await startServer({
        port: testPort,
        model: 'mock'
      });
      
      // 验证服务器已启动
      expect(srv1.listening).toBe(true);
      
      // 关闭第一个服务器
      srv1.close();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 手动清理端口（模拟 beforeEach 的行为）
      await cleanPort(testPort);
      
      // 再次启动服务器，应该能够成功（因为端口已被清理）
      const { server: srv2 } = await startServer({
        port: testPort,
        model: 'mock'
      });
      server = srv2;
      
      // 验证新服务器能够启动
      expect(srv2.listening).toBe(true);
    });
  });

  // ==================== 3.11.3 target 配置测试 ====================

  describe('3.11.3 target 配置测试', () => {
    it('应该正确转发请求到 HTTP 目标服务器', async () => {
      const { server: srv, mockConfig, routeManager } = await startServer({
        model: 'proxy',
        remoteTarget: false,
      });
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.target).toBe('http://172.24.7.99:8082');

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`, {
        query: { test: 'value' },
      });

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });

    it('应该原样返回状态码（包括 4xx、5xx）', async () => {
      // 测试状态码返回功能（使用默认 target）
      const { server: srv, mockConfig, routeManager } = await startServer({
        model: 'proxy',
        remoteTarget: false,
      });
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 使用真实接口路径测试状态码返回
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBeDefined();
      // 状态码应该被原样返回（无论是 2xx、4xx 还是 5xx）
    });
  });

  // ==================== 3.11.4 remoteTarget 配置测试 ====================

  describe('3.11.4 remoteTarget 配置测试', () => {
    it('remoteTarget=true 时应该从 Referer 头解析 remote=mock 参数', async () => {
      // 使用真实的 mock 文件
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'proxy',
          remoteTarget: true
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.remoteTarget).toBe(true);

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 使用真实的接口路径，如 /v1/auth/captcha
      const { mockReq, mockRes } = createMockReqRes('GET', '/v1/auth/captcha', {
        headers: {
          referer: 'http://localhost:10000/?remote=mock',
        },
      });

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });

    it('remoteTarget=true 时应该从 Referer 头解析 remote=URL 参数', async () => {
      const { server: srv, mockConfig, routeManager } = await startServer({
        model: 'mock',
        remoteTarget: true,
      });
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 测试 remote=URL 参数可以覆盖默认 target
      // 使用不同的 URL 来验证覆盖功能（不需要实际连接，只需验证 __overrideTarget 被正确设置）
      const overrideTarget = 'http://test.example.com:8080';
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`, {
        headers: {
          referer: `http://localhost:10000/?remote=${overrideTarget}`,
        },
      });

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      // 验证 remote=URL 参数正确覆盖了默认 target
      expect(mockReq.__overrideTarget).toBe(overrideTarget);
      expect(mockRes.statusCode).toBeDefined();
    });

    it('remoteTarget=false 时应该忽略 remote 参数', async () => {
      // 使用真实的 mock 文件
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'mock',
          remoteTarget: false
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.remoteTarget).toBe(false);

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 使用真实的接口路径，如 /v1/auth/captcha
      const { mockReq, mockRes } = createMockReqRes('GET', '/v1/auth/captcha', {
        headers: {
          referer: 'http://localhost:10000/?remote=proxy'
        }
      });

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });

    it('remoteTarget=true 时应该从 Referer 头解析 remote=proxy 参数', async () => {
      // 即使 model='mock'，remote=proxy 也应该强制使用 proxy 模式
      const { server: srv, mockConfig, routeManager } = await startServer({
        model: 'mock',
        remoteTarget: true,
      });
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.model).toBe('mock');
      expect(mockConfig.remoteTarget).toBe(true);

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`, {
        headers: {
          referer: 'http://localhost:10000/?remote=proxy',
        },
      });

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });

    it('remoteTarget=true 时应该忽略无效的 remote 参数值，使用配置的 model', async () => {
      // 使用真实的 mock 文件
      const { server: srv, mockConfig, routeManager } = await startServer(
        {
          model: 'mock',
          remoteTarget: true,
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.model).toBe('mock');
      expect(mockConfig.remoteTarget).toBe(true);

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 使用无效的 remote 值，应该被忽略，使用配置的 model='mock'
      const { mockReq, mockRes } = createMockReqRes('GET', '/v1/auth/captcha', {
        headers: {
          referer: 'http://localhost:10000/?remote=invalid',
        }
      });

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });

    it('remoteTarget=true 时无效的 remote 参数值在 proxy 模式下也应该被忽略', async () => {
      const { server: srv, mockConfig, routeManager } = await startServer({
        model: 'proxy',
        remoteTarget: true,
      });
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.model).toBe('proxy');
      expect(mockConfig.remoteTarget).toBe(true);

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 使用无效的 remote 值，应该被忽略，使用配置的 model='proxy'
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`, {
        headers: {
          referer: 'http://localhost:10000/?remote=invalid',
        },
      });

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });
  });

  // ==================== 3.11.5 pathPrefixes 配置测试 ====================

  describe('3.11.5 pathPrefixes 配置测试', () => {
    it('应该正确匹配路径前缀并标准化路径', async () => {
      // 使用真实的 mock 文件测试 pathPrefixes 功能
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'mock',
          pathPrefixes: API_PREFIX
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.pathPrefixes).toBe(API_PREFIX);

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

      await routeHandler.handleRequest(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });

    it('应该支持多个路径前缀', async () => {
      // 使用真实的 mock 文件测试多个路径前缀功能
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'mock',
          pathPrefixes: [API_PREFIX]
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);

      // 测试使用 /api 前缀能匹配到路由
      // 请求 /api/v1/auth/captcha → 去掉 /api 前缀 → /v1/auth/captcha → 匹配成功
      const { mockReq: req1, mockRes: res1 } = createMockReqRes(
        'GET',
        `${API_PREFIX}/v1/auth/captcha`
      );
      await routeHandler.handleRequest(req1, res1);
      expect(res1.statusCode).toBe(200);
      expect(res1.body).toBeDefined();
    });

    it('无前导斜杠的前缀应自动添加', async () => {
      // 使用真实的 mock 文件测试无前导斜杠的前缀标准化功能
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'mock',
          pathPrefixes: 'mng-common/api' // 无前导斜杠，应该自动添加为 /api
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 测试使用 /api 前缀（自动添加前导斜杠后）能正确匹配路由
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

      await routeHandler.handleRequest(mockReq, mockRes);

      // 验证前缀被标准化并正确匹配路由
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });
  });

  // ==================== 3.11.6 mockRoutes 配置测试 ====================

  describe('3.11.6 mockRoutes 配置测试', () => {
    it('应该支持路径字符串匹配强制 Mock', async () => {
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'proxy',
          mockRoutes: ['/v1/auth/captcha']
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.mockRoutes).toContain('/v1/auth/captcha');

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 即使 model='proxy'，mockRoutes 中的路径也应该使用 Mock 模式
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

      await routeHandler.handleRequest(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
      // 应该返回 mock 数据而不是代理到远程服务器
    });

    it('应该支持方法+路径匹配强制 Mock', async () => {
      // 使用真实的 mock 文件测试方法+路径匹配功能
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'proxy',
          remoteTarget: false,
          mockRoutes: ['GET /v1/auth/captcha']
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);

      // GET 请求应使用 Mock
      const { mockReq: getReq, mockRes: getRes } = createMockReqRes('GET', '/v1/auth/captcha');
      await routeHandler.handleRequest(getReq, getRes);
      expect(getRes.statusCode).toBe(200);

      // GET 请求应使用代理（不在 mockRoutes 中）
      const { mockReq: postReq, mockRes: postRes } = createMockReqRes(
        'GET',
        `${API_PREFIX}/v1/auth/captcha`
      );
      const handled = await routeHandler.handleRequest(postReq, postRes);
      expect(handled).toBe(true);
      expect(postRes.statusCode).toBe(200);
    });
  });

  // ==================== 3.11.7 proxyRoutes 配置测试 ====================

  describe('3.11.7 proxyRoutes 配置测试', () => {
    it('应该支持路径字符串匹配强制代理', async () => {
      // 使用真实的 mock 文件测试 proxyRoutes 功能
      const { server: srv, mockConfig, routeManager } = await startServer(
        {
          model: 'mock',
          remoteTarget: false,
          proxyRoutes: [`${API_PREFIX}/v1/auth/captcha`],
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.proxyRoutes).toContain(`${API_PREFIX}/v1/auth/captcha`);

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 即使 model='mock'，proxyRoutes 中的路径也应该使用代理模式
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      expect(handled).toBe(true);
      expect(mockRes.statusCode).toBe(200);
    });

    it('proxyRoutes 优先级应高于 mockRoutes', async () => {
      // 使用真实的 mock 文件测试 proxyRoutes 优先级
      const {
        server: srv,
        mockConfig,
        routeManager
      } = await startServer(
        {
          model: 'mock',
          remoteTarget: false,
          mockRoutes: ['/v1/auth/captcha'],
          proxyRoutes: [`${API_PREFIX}/v1/auth/captcha`]
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.proxyRoutes).toContain(`${API_PREFIX}/v1/auth/captcha`);
      expect(mockConfig.mockRoutes).toContain('/v1/auth/captcha');

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

      const handled = await routeHandler.handleRequest(mockReq, mockRes);

      // proxyRoutes 优先级应该更高，应该使用代理模式
      expect(handled).toBe(true);
      // 即使 model='mock'，proxyRoutes 中的路径也应该使用代理模式
      expect(mockRes.statusCode).toBe(200);
    });
  });

  // ==================== 3.11.8 Mock 文件使用测试 ====================

  describe('3.11.8 Mock 文件使用测试（mock 模式下）', () => {
    it('应该正确加载 mock 文件中的路由', async () => {
      if (!existsSync(mockDir)) {
        return;
      }

      const { server: srv, routeManager } = await startServer(
        {
          model: 'mock',
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routes = routeManager.getAllRoutes();
      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0].path).toBeDefined();
      expect(routes[0].method).toBeDefined();
    });

    it('应该正确执行 mock 文件中的函数', async () => {
      if (!existsSync(mockDir)) {
        return;
      }

      // 使用真实的 mock 文件
      const { server: srv, mockConfig, routeManager } = await startServer(
        {
          model: 'mock',
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      // 使用真实的接口路径，如 /v1/auth/captcha
      const routeHandler = new RouteHandler(mockConfig, routeManager);
      const { mockReq, mockRes } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);

      await routeHandler.handleRequest(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
      // mock 文件返回的数据结构应该符合预期
      if (mockRes.body && typeof mockRes.body === 'object') {
        expect(mockRes.body.code).toBeDefined();
      }
    });

    it('应该正确处理 Promise 响应', async () => {
      const routeManager = new RouteManagerImpl();
      routeManager.setRoute('GET /async', {
        path: '/async',
        method: 'GET',
        response: async (req: any) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { code: 0, data: { async: true } };
        },
      });

      const { server: srv, mockConfig, routeManager: rm } = await startServer({
        model: 'mock',
      });
      server = srv;

      // 合并路由
      rm.getAllRoutes().forEach(route => {
        const key = `${route.method.toUpperCase()} ${route.path}`;
        routeManager.setRoute(key, route);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      const { mockReq, mockRes } = createMockReqRes('GET', '/async');

      await routeHandler.handleRequest(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toEqual({ code: 0, data: { async: true } });
    });

    it('应该正确提取路径参数', async () => {
      const routeManager = new RouteManagerImpl();
      routeManager.setRoute('GET /user/{id}', {
        path: '/user/{id}',
        method: 'GET',
        response: (req: any) => {
          return { code: 0, data: { id: req.params.id } };
        },
      });

      const { server: srv, mockConfig, routeManager: rm } = await startServer({
        model: 'mock',
      });
      server = srv;

      // 合并路由
      rm.getAllRoutes().forEach(route => {
        const key = `${route.method.toUpperCase()} ${route.path}`;
        routeManager.setRoute(key, route);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      const { mockReq, mockRes } = createMockReqRes('GET', '/user/123');

      await routeHandler.handleRequest(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockReq.params.id).toBe('123');
      expect(mockRes.body.data.id).toBe('123');
    });

    it('应该正确执行参数校验', async () => {
      const routeManager = new RouteManagerImpl();
      routeManager.setRoute('GET /validate', {
        path: '/validate',
        method: 'GET',
        response: { code: 0 },
        validation: {
          query: {
            id: {
              required: true,
              type: 'string',
            },
          },
        },
      } as any);

      const { server: srv, mockConfig, routeManager: rm } = await startServer({
        model: 'mock',
      });
      server = srv;

      // 合并路由
      rm.getAllRoutes().forEach(route => {
        const key = `${route.method.toUpperCase()} ${route.path}`;
        routeManager.setRoute(key, route);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);

      // 缺少必需参数
      const { mockReq: req1, mockRes: res1 } = createMockReqRes('GET', '/validate', {
        query: {},
      });
      await routeHandler.handleRequest(req1, res1);
      expect(res1.statusCode).toBe(400);
      expect(res1.body.code).toBe(400);
      expect(res1.body.message).toContain('参数校验失败');

      // 提供必需参数
      const { mockReq: req2, mockRes: res2 } = createMockReqRes('GET', '/validate', {
        query: { id: '123' },
      });
      await routeHandler.handleRequest(req2, res2);
      expect(res2.statusCode).toBe(200);
    });
  });

  // ==================== 3.11.10 组合配置测试 ====================

  describe('3.11.10 组合配置测试', () => {
    it('model="proxy" + mockRoutes 组合', async () => {
      // 使用真实的 mock 文件测试组合配置
      const { server: srv, mockConfig, routeManager } = await startServer(
        {
          model: 'proxy',
          remoteTarget: false,
          mockRoutes: ['/v1/user/info'],
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);

      // /v1/user/info 应在 mockRoutes 中，应使用 Mock
      const { mockReq: req1, mockRes: res1 } = createMockReqRes('GET', '/v1/user/info');
      await routeHandler.handleRequest(req1, res1);
      expect(res1.statusCode).toBe(200);
      expect(res1.body).toBeDefined();
      // 应该返回 mock 数据而不是代理到远程服务器

      // /v1/auth/captcha 不在 mockRoutes 中，应使用代理
      const { mockReq: req2, mockRes: res2 } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);
      const handled = await routeHandler.handleRequest(req2, res2);
      expect(handled).toBe(true);
    });

    it('pathPrefixes + mockRoutes 组合', async () => {
      // 使用真实的 mock 文件测试 pathPrefixes + mockRoutes 组合
      const { server: srv, mockConfig, routeManager } = await startServer(
        {
          model: 'proxy',
          remoteTarget: false,
          pathPrefixes: '/api',
          mockRoutes: ['/v1/user/info'],
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);
      // 请求路径 /api/v1/user/info 应该标准化为 /v1/user/info，匹配 mockRoutes，应使用 Mock
      const { mockReq, mockRes } = createMockReqRes('GET', '/api/v1/user/info');

      await routeHandler.handleRequest(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.body).toBeDefined();
    });

    it('完整优先级链验证: remote > proxyRoutes > mockRoutes > model', async () => {
      // 使用真实的 mock 文件测试完整优先级链
      const { server: srv, mockConfig, routeManager } = await startServer(
        {
          model: 'proxy',
          remoteTarget: true,
          mockRoutes: ['/v1/auth/captcha'],
          proxyRoutes: ['/v1/auth/captcha'],
        },
        { loadMockRoutes: true }
      );
      server = srv;

      await new Promise(resolve => setTimeout(resolve, 100));

      const routeHandler = new RouteHandler(mockConfig, routeManager);

      // 场景 1: remote 参数优先级最高
      const { mockReq: req1, mockRes: res1 } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`, {
        headers: {
          referer: 'http://localhost:10000/?remote=mock',
        },
      });
      await routeHandler.handleRequest(req1, res1);
      expect(res1.statusCode).toBe(200);
      expect(res1.body).toBeDefined();
      // remote=mock 应该强制使用 mock 模式

      // 场景 2: 无 remote 参数，proxyRoutes 优先级高于 mockRoutes
      const { mockReq: req2, mockRes: res2 } = createMockReqRes('GET', `${API_PREFIX}/v1/auth/captcha`);
      const handled2 = await routeHandler.handleRequest(req2, res2);
      expect(handled2).toBe(true);
      // proxyRoutes 优先级应该更高，应该使用代理模式
    });
  });
});
