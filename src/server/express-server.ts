import express from 'express';
import cors from 'cors';
import { logger } from '../utils/logger.js';
import { RouteHandler } from './route-handler.js';
import { ApifoxError } from '../core/errors.js';
import { ERROR_TO_HTTP_STATUS } from '../core/error-codes.js';
import type { RouteManager } from './route-manager.js';
import type { MockConfig } from '../core/mock-config-loader.js';

/**
 * 设置 Mock 服务器
 */
export function setupMockServer(
  routeManager: RouteManager,
  mockConfig: MockConfig
): express.Application {
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 请求日志中间件
  app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    logger.info(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });

  // 创建路由处理器
  const routeHandler = new RouteHandler(mockConfig, routeManager);

  // 动态路由处理中间件
  app.use(async (req, res, next) => {
    // 使用路由处理器处理请求
    const handled = await routeHandler.handleRequest(req, res);

    if (!handled) {
      // 如果请求未被处理，继续到 404 处理
      return next();
    }
  });

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      code: 404,
      message: 'API not found',
      data: null
    });
  });

  // 错误处理中间件
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 如果是 ApifoxError，使用统一的错误响应格式
    if (err instanceof ApifoxError) {
      const statusCode = ERROR_TO_HTTP_STATUS[err.code] || 500;
      logger.error(`[${err.code}] ${err.message}`);
      
      res.status(statusCode).json({
        code: statusCode,
        errorCode: err.code,
        message: err.message,
        details: err.details
      });
      return;
    }

    // 其他类型的错误
    logger.error(`服务器错误: ${err.message}`);
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: err.message
    });
  });

  return app;
}
