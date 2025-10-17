import type { MockConfig } from '../core/mock-config-loader.js';
import { logger } from '../utils/logger.js';

/**
 * 远程服务器代理
 */
export class RemoteProxy {
  private config: MockConfig;

  constructor(config: MockConfig) {
    this.config = config;
  }

  /**
   * 代理请求到远程服务器
   */
  async proxyRequest(req: any): Promise<any> {
    const target = this.config.target;
    const remoteUrl = `${target.replace(/\/$/, '')}${req.path}`;
    const queryString = new URLSearchParams(req.query).toString();
    const fullUrl = queryString ? `${remoteUrl}?${queryString}` : remoteUrl;

    logger.info(`代理请求: ${req.method} ${fullUrl}`);

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      };

      // 保留原始请求头
      if (req.headers) {
        const excludeHeaders = ['host', 'connection', 'content-length'];
        for (const [key, value] of Object.entries(req.headers)) {
          if (!excludeHeaders.includes(key.toLowerCase())) {
            requestHeaders[key] = value as string;
          }
        }
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: requestHeaders,
        signal: AbortSignal.timeout(10000)
      };

      if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`远程服务器响应错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.success(`代理成功: ${response.status}`);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`代理失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 检查是否配置了远程服务器
   */
  isRemoteServerConfigured(): boolean {
    return !!this.config.target;
  }
}
