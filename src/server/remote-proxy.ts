import type { MockConfig } from '../core/mock-config-loader.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

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
    const target = req.__overrideTarget || this.config.target;
    const remoteUrl = `${target.replace(/\/$/, '')}${req.path}`;
    const queryString = new URLSearchParams(req.query).toString();
    const fullUrl = queryString ? `${remoteUrl}?${queryString}` : remoteUrl;

    logger.info(`🌐 代理请求到: ${fullUrl}`);

    try {
      const response = await axios({
        method: req.method,
        url: fullUrl,
        headers: {
          'Content-Type': 'application/json',
          ...req.headers
        },
        data: req.method !== 'GET' ? req.body : undefined,
        // 禁用 axios 的状态码验证，让所有响应都被视为成功
        validateStatus: () => true
      });

      logger.info(`📊 远程服务器响应: ${response.status}`);
      logger.success(`✅ 远程服务器响应: ${JSON.stringify(response.data).substring(0, 100)}...`);
      // 直接返回原始响应数据，不做任何处理
      return response.data;
    } catch (error) {
      // 只处理网络错误或其他异常（非 HTTP 响应错误）
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`❌ 代理请求失败: ${errorMessage}`);

      // 返回更详细的错误信息
      throw new Error(`代理请求失败: ${errorMessage} (目标: ${fullUrl})`);
    }
  }

  /**
   * 检查远程服务器是否已配置
   */
  isRemoteServerConfigured(): boolean {
    return !!this.config.target;
  }
}
