import type express from 'express';
import type { ILogger } from '../../../domain/interfaces.js';
import { ApifoxError } from '../../../core/errors.js';
import { ERROR_TO_HTTP_STATUS } from '../../../core/error-codes.js';

/**
 * 创建错误处理中间件
 * @param logger 日志接口
 * @returns Express 错误处理中间件
 */
export function createErrorHandler(logger: ILogger) {
  return (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
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
  };
}

