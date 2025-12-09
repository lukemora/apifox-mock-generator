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
   * @returns 返回完整的响应对象，包括 status、headers、data
   */
  async proxyRequest(req: any): Promise<{
    status: number;
    headers: Record<string, string>;
    data: any;
  }> {
    const target = req.__overrideTarget || this.config.target;
    const remoteUrl = `${target.replace(/\/$/, '')}${req.path}`;
    const queryString = new URLSearchParams(req.query).toString();
    const fullUrl = queryString ? `${remoteUrl}?${queryString}` : remoteUrl;

    logger.info(`🌐 代理请求到: ${fullUrl}`);

    try {
      // 准备请求头：原样转发客户端请求头，不做任何修改
      const requestHeaders: Record<string, string> = {};
      // 复制所有请求头（排除一些不应该转发的头部）
      const headersToSkip = new Set([
        'host', // 目标服务器的主机名
        'connection', // 连接管理
        'keep-alive', // 连接保持
        'transfer-encoding' // 传输编码
      ]);

      for (const [key, value] of Object.entries(req.headers || {})) {
        const lowerKey = key.toLowerCase();
        if (!headersToSkip.has(lowerKey) && value) {
          requestHeaders[key] = Array.isArray(value) ? value[0] : String(value);
        }
      }

      const response = await axios({
        method: req.method,
        url: fullUrl,
        headers: requestHeaders,
        data: req.method !== 'GET' ? req.body : undefined,
        // 禁用 axios 的状态码验证，让所有响应都被视为成功
        validateStatus: () => true
        // 不自动解压响应（如果需要完全透明，但通常自动解压是合理的）
        // decompress: false
      });

      logger.info(`📊 远程服务器响应: ${response.status}`);
      logger.success(`✅ 远程服务器响应: ${JSON.stringify(response.data).substring(0, 100)}...`);

      // 返回完整的响应对象，包括状态码、响应头和响应体
      return {
        status: response.status,
        headers: response.headers as Record<string, string>,
        data: response.data
      };
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
