import type express from 'express';
import type { MockConfig } from '../core/mock-config-loader.js';
import type { RouteManager } from './route-manager.js';
import type { MockRoute } from '../types/index.js';
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
  async handleRequest(req: express.Request, res: express.Response): Promise<boolean> {
    try {
      const { normalizedPath } = this.normalizePath(req.path);

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
      const ruleMode = this.pickModeByRoutes(req.method, req.path, normalizedPath);

      // 3) 计算最终模式：remote > mockRoutes/proxyRoutes > config.model
      const finalMode: 'mock' | 'proxy' =
        remoteOverride?.mode || ruleMode || this.config.model;

      // 5) 处理
      if (finalMode === 'proxy') {
        // 将覆盖的 target 放到 req 上, 供 RemoteProxy 使用
        if (remoteOverride?.target) {
          req.__overrideTarget = remoteOverride.target;
        }
        return await this.handleProxyRequest(req, res);
      }
      return await this.handleMockRequest(req, res, normalizedPath);
    } catch (error) {
      logger.error(`请求处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  /**
   * 处理代理请求（纯代理模式）
   */
  private async handleProxyRequest(req: express.Request, res: express.Response): Promise<boolean> {
    try {
      const proxyResponse = await this.remoteProxy.proxyRequest(req);

      // 原样返回远程服务器的状态码
      res.status(proxyResponse.status);

      // 复制远程服务器的所有响应头（只排除连接层头部，这些不应该转发给客户端）
      const headersToSkip = new Set([
        'content-length', // Express 会自动计算，避免长度不匹配
        'transfer-encoding', // HTTP/1.1 传输层特性，不应转发
        'connection', // 连接管理，描述的是代理和远程服务器之间的连接
        'keep-alive' // 连接保持，描述的是代理和远程服务器之间的连接
      ]);

      for (const [key, value] of Object.entries(proxyResponse.headers)) {
        const lowerKey = key.toLowerCase();
        if (!headersToSkip.has(lowerKey)) {
          // 保留所有其他响应头，包括 content-type, content-encoding 等
          res.setHeader(key, value);
        }
      }

      // 原样返回响应体，不做任何处理
      // 使用 send() 而不是 json()，这样可以发送原始数据，不会强制设置 Content-Type
      res.send(proxyResponse.data);

      // 记录实际返回的状态码（用于调试）
      logger.info(`📤 代理返回状态码: ${proxyResponse.status}`);

      // 根据业务 code 记录不同的日志级别（仅用于日志，不影响返回）
      const successCodes = [0, 200, 100200];
      if (
        proxyResponse.data &&
        typeof proxyResponse.data === 'object' &&
        proxyResponse.data.code !== undefined
      ) {
        if (successCodes.includes(proxyResponse.data.code)) {
          logger.success(
            `${req.method} ${req.path} -> code:${proxyResponse.data.code} (远程服务器)`
          );
        } else {
          logger.warn(
            `${req.method} ${req.path} -> code:${proxyResponse.data.code} (远程服务器业务错误)`
          );
        }
      } else {
        logger.success(`${req.method} ${req.path} -> ${proxyResponse.status} (远程服务器)`);
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
  private async handleMockRequest(req: express.Request, res: express.Response, normalizedPath: string): Promise<boolean> {
    let matchedPath = req.path;
    let route = findMatchingRoute(this.routeManager.getAllRoutes(), req.method, req.path);

    if (!route && normalizedPath && normalizedPath !== req.path) {
      route = findMatchingRoute(this.routeManager.getAllRoutes(), req.method, normalizedPath);
      matchedPath = normalizedPath;
    }

    if (!route) {
      logger.warn(`Mock 模式：未找到路由 ${req.method} ${normalizedPath}`);
      return false;
    }

    return await this.executeMockRoute(route, req, res, matchedPath);
  }

  /**
   * 路由匹配：精确匹配 path 或 "METHOD path"
   */
  private pickModeByRoutes(
    method: string,
    path: string,
    normalizedPath: string
  ): 'mock' | 'proxy' | undefined {
    const paths = [path];
    if (normalizedPath && normalizedPath !== path) {
      paths.push(normalizedPath);
    }
    const candidateKeys = paths.flatMap(p => [p, `${method.toUpperCase()} ${p}`]);

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
  private async executeMockRoute(
    route: MockRoute,
    req: express.Request,
    res: express.Response,
    normalizedPath: string
  ): Promise<boolean> {
    try {
      // 提取路径参数
      const params = extractPathParams(route.path, normalizedPath);
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

      // Mock 模式下，数据来源都是本地Mock
      logger.success(`${route.method} ${route.path} -> ${route.status || 200} (本地Mock)`);
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

  /**
   * 标准化请求路径：若配置了 pathPrefixes（单个前缀为主），尝试去掉该前缀以兼容无前缀的路由
   */
  private normalizePath(path: string): { normalizedPath: string; matchedPrefix?: string } {
    const prefixes = this.config.pathPrefixes
      ? Array.isArray(this.config.pathPrefixes)
        ? this.config.pathPrefixes
        : [this.config.pathPrefixes]
      : [];

    if (prefixes.length === 0) {
      return { normalizedPath: path };
    }

    for (const rawPrefix of prefixes) {
      if (!rawPrefix) continue;
      // 规范化：确保有前导斜杠，移除末尾斜杠
      const prefix = rawPrefix.startsWith('/') ? rawPrefix : `/${rawPrefix}`;
      const normalizedPrefix = prefix.replace(/\/+$/, '');

      if (normalizedPrefix && normalizedPrefix !== '/' && path.startsWith(normalizedPrefix)) {
        const normalizedPath =
          path === normalizedPrefix ? '/' : path.slice(normalizedPrefix.length) || '/';
        return { normalizedPath, matchedPrefix: normalizedPrefix };
      }
    }

    return { normalizedPath: path };
  }
}
