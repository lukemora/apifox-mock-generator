/**
 * 统一的错误类型系统
 */

/**
 * 基础错误类
 */
export class ApifoxError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ApifoxError';
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApifoxError);
    }
  }

  /**
   * 序列化方法，便于日志记录
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * 配置相关错误
 */
export class ConfigError extends ApifoxError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super('CONFIG_ERROR', message, details, cause);
    this.name = 'ConfigError';
  }
}

/**
 * 网络相关错误
 */
export class NetworkError extends ApifoxError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super('NETWORK_ERROR', message, details, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Apifox API 特定错误
 */
export class ApifoxApiError extends ApifoxError {
  constructor(
    message: string,
    public statusCode?: number,
    public apiErrorCode?: string,
    details?: Record<string, any>,
    cause?: Error
  ) {
    super('APIFOX_API_ERROR', message, details, cause);
    this.name = 'ApifoxApiError';
  }
}

/**
 * 验证相关错误
 */
export class ValidationError extends ApifoxError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super('VALIDATION_ERROR', message, details, cause);
    this.name = 'ValidationError';
  }
}

