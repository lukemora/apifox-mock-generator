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
      // 1) remote 参数：从页面 Referer 中解析 ?remote
      let remoteOverride: { mode?: 'mock' | 'proxy'; target?: string } | undefined;
      if (this.config.remoteTarget) {
        const referer: string | undefined = req.headers?.referer || req.headers?.referrer;
        if (referer) {
          try {
            const u = new URL(referer);
            const remoteVal = u.searchParams.get('remote');
            if (remoteVal) {
              const val = remoteVal.trim();
              if (val.toLowerCase() === 'mock') {
                remoteOverride = { mode: 'mock' };
              } else if (/^https?:\/\//i.test(val)) {
                remoteOverride = { mode: 'proxy', target: val };
              }
            }
          } catch {}
        }
      }

      // 2) mockRoutes/proxyRoutes（按接口粒度）
      const ruleMode = this.pickModeByRoutes(req.method, req.path);

      // 3) 计算最终模式：remote > mockRoutes/proxyRoutes > config.model
      const finalMode: 'mock' | 'proxy' =
        (remoteOverride?.mode as any) || (ruleMode as any) || this.config.model;

      // 5) 处理
      if (finalMode === 'proxy') {
        // 将覆盖的 target 放到 req 上, 供 RemoteProxy 使用
        if (remoteOverride?.target) {
          req.__overrideTarget = remoteOverride.target;
        }
        return await this.handleProxyRequest(req, res);
      }
      return await this.handleMockRequest(req, res);
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

      // 直接返回远程服务器的原始响应，不做任何包装和判断
      res.json(proxyData);

      // 根据业务 code 记录不同的日志级别（仅用于日志，不影响返回）
      const successCodes = [0, 200, 100200];
      if (proxyData && typeof proxyData === 'object' && proxyData.code !== undefined) {
        if (successCodes.includes(proxyData.code)) {
          logger.success(`${req.method} ${req.path} -> code:${proxyData.code} (远程服务器)`);
        } else {
          logger.warn(`${req.method} ${req.path} -> code:${proxyData.code} (远程服务器业务错误)`);
        }
      } else {
        logger.success(`${req.method} ${req.path} -> 200 (远程服务器)`);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`代理请求失败: ${errorMessage}`);
      res.status(500).json({
        code: 500,
        message: '代理服务器错误',
        error: `代理请求失败: ${errorMessage}`,
        details: {
          target: this.config.target,
          path: req.path,
          method: req.method
        }
      });
      return true;
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
   * 路由匹配：精确匹配 path 或 "METHOD path"
   */
  private pickModeByRoutes(method: string, path: string): 'mock' | 'proxy' | undefined {
    const candidateKeys = [path, `${method.toUpperCase()} ${path}`];

    const match = (routes?: string[]): boolean => {
      if (!routes || routes.length === 0) return false;
      return candidateKeys.some(key => routes.includes(key));
    };

    if (match(this.config.proxyRoutes)) return 'proxy';
    if (match(this.config.mockRoutes)) return 'mock';
    return undefined;
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

      // 判断数据来源
      const dataSource =
        responseData && typeof responseData === 'object' && responseData.code !== undefined
          ? responseData.code === 0
            ? '本地Mock'
            : '远程服务器'
          : '本地Mock';

      logger.success(`${route.method} ${route.path} -> ${route.status || 200} (${dataSource})`);
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
