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

    logger.info(`🌐 代理请求到: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...req.headers
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`远程服务器响应错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`✅ 远程服务器响应成功: ${response.status}`);
      return data;
    } catch (error) {
      logger.error(`❌ 代理请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 检查远程服务器是否已配置
   */
  isRemoteServerConfigured(): boolean {
    return !!this.config.target;
  }
}
