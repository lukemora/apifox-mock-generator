import type { MockConfig } from '../core/mock-config-loader.js';
import type { RouteManager } from './route-manager.js';
import { RemoteProxy } from './remote-proxy.js';
import { findMatchingRoute, extractPathParams } from './route-matcher.js';
import { validateRequest } from './validation.js';
import { logger } from '../utils/logger.js';

/**
 * 路由处理器 - 根据工作模式处理请求
 */
export class RouteHandler {
  private config: MockConfig;
  private routeManager: RouteManager;
  private remoteProxy: RemoteProxy;

  constructor(config: MockConfig, routeManager: RouteManager) {
    this.config = config;
    this.routeManager = routeManager;
    this.remoteProxy = new RemoteProxy(config);
  }

  /**
   * 处理请求
   */
  async handleRequest(req: any, res: any): Promise<boolean> {
    try {
      // 检查 URL 参数中的模式覆盖
      const urlMode = req.query._mock || req.query._proxy;
      const effectiveMode =
        urlMode === '_mock' ? 'mock' : urlMode === '_proxy' ? 'proxy' : this.config.model;

      // 检查 remote 参数
      if (this.config.remoteTarget && req.query.remote === 'mock') {
        return await this.handleMockRequest(req, res);
      }

      // 根据模式处理请求
      if (effectiveMode === 'proxy') {
        return await this.handleProxyRequest(req, res);
      } else {
        return await this.handleMockRequest(req, res);
      }
    } catch (error) {
      logger.error(`请求处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  /**
   * 处理代理请求（纯代理模式）
   */
  private async handleProxyRequest(req: any, res: any): Promise<boolean> {
    try {
      const proxyData = await this.remoteProxy.proxyRequest(req);
      res.json(proxyData);
      logger.info(`代理请求成功: ${req.method} ${req.path}`);
      return true;
    } catch (error) {
      logger.error(`代理请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  /**
   * 处理 Mock 请求（纯 Mock 模式）
   */
  private async handleMockRequest(req: any, res: any): Promise<boolean> {
    const route = findMatchingRoute(this.routeManager.getAllRoutes(), req.method, req.path);

    if (!route) {
      logger.warn(`Mock 模式：未找到路由 ${req.method} ${req.path}`);
      return false;
    }

    return await this.executeMockRoute(route, req, res);
  }

  /**
   * 执行 Mock 路由
   */
  private async executeMockRoute(route: any, req: any, res: any): Promise<boolean> {
    try {
      // 提取路径参数
      const params = extractPathParams(route.path, req.path);
      req.params = params;

      // 参数校验
      if (route.validation) {
        const validationError = validateRequest(req, route.validation);
        if (validationError) {
          res.status(400).json({
            code: 400,
            message: '参数校验失败',
            error: validationError
          });
          logger.error(`${route.method} ${route.path} -> 400 (参数校验失败: ${validationError})`);
          return true;
        }
      }

      // 判断 response 是函数还是静态数据
      let responseData =
        typeof route.response === 'function'
          ? route.response(req) // 动态生成数据
          : route.response; // 静态数据

      // 处理 Promise
      if (responseData && typeof responseData.then === 'function') {
        responseData = await responseData;
      }

      // 返回 Mock 数据
      res.status(route.status || 200).json(responseData);
      logger.success(`${route.method} ${route.path} -> ${route.status || 200}`);
      return true;
    } catch (error) {
      logger.error(
        `${route.method} ${route.path} -> 500 (${error instanceof Error ? error.message : '未知错误'})`
      );
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : '未知错误'
      });
      return true;
    }
  }
}
