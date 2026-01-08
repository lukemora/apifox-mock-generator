import type { ILogger } from '../domain/interfaces.js';
import {
  ApifoxError,
  ConfigError,
  NetworkError,
  ApifoxApiError
} from './errors.js';

/**
 * 处理错误并输出日志
 * @param error 错误对象
 * @param logger 日志接口
 */
export function handleError(error: unknown, logger: ILogger): void {
  if (error instanceof ConfigError) {
    logger.error(`❌ 配置错误: ${error.message}`);
    if (error.details?.suggestion) {
      logger.info(`💡 建议: ${error.details.suggestion}`);
    }
    if (error.details?.path) {
      logger.info(`📁 配置文件路径: ${error.details.path}`);
    }
  } else if (error instanceof NetworkError) {
    logger.error(`❌ 网络错误: ${error.message}`);
    if (error.details?.suggestion) {
      logger.info(`💡 建议: ${error.details.suggestion}`);
    }
  } else if (error instanceof ApifoxApiError) {
    logger.error(`❌ Apifox API 错误: ${error.message}`);
    if (error.details?.suggestion) {
      logger.info(`💡 建议: ${error.details.suggestion}`);
    }
  } else if (error instanceof ApifoxError) {
    logger.error(`❌ ${error.name}: ${error.message}`);
    if (error.details) {
      logger.info(`详情: ${JSON.stringify(error.details, null, 2)}`);
    }
  } else {
    logger.error('❌ 未知错误');
    if (error instanceof Error) {
      console.error(error);
    } else {
      console.error('未知错误:', error);
    }
  }
}

