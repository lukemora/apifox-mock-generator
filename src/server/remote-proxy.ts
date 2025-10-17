import type { ApifoxConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * 远程服务器代理
 */
export class RemoteProxy {
  private config: ApifoxConfig

  constructor(config: ApifoxConfig) {
    this.config = config
  }

  /**
   * 代理请求到远程服务器
   */
  async proxyRequest(req: any): Promise<any> {
    if (!this.config.remoteServer) {
      throw new Error('远程服务器配置未设置')
    }

    const {
      target,
      timeout = 10000,
      headers = {},
      changeOrigin = true,
      secure = true,
      rewrite,
      logLevel = 'info',
    } = this.config.remoteServer

    // 处理路径重写
    let targetPath = req.path
    if (rewrite) {
      for (const [pattern, replacement] of Object.entries(rewrite)) {
        const regex = new RegExp(pattern)
        if (regex.test(targetPath)) {
          if (typeof replacement === 'function') {
            targetPath = replacement(targetPath)
          } else {
            targetPath = targetPath.replace(regex, replacement)
          }
          if (logLevel !== 'silent') {
            logger.info(`路径重写: ${req.path} -> ${targetPath}`)
          }
          break
        }
      }
    }

    // 构建完整的远程 URL
    const remoteUrl = `${target.replace(/\/$/, '')}${targetPath}`

    // 构建查询字符串
    const queryString = new URLSearchParams(req.query).toString()
    const fullUrl = queryString ? `${remoteUrl}?${queryString}` : remoteUrl

    if (logLevel !== 'silent') {
      logger.info(`代理请求到远程服务器: ${req.method} ${fullUrl}`)
    }

    try {
      // 构建请求头
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      }

      // 处理 changeOrigin
      if (changeOrigin && req.headers?.origin) {
        requestHeaders['Origin'] = target
      }

      // 保留原始请求头（如果需要）
      if (req.headers) {
        // 过滤掉一些不需要代理的头部
        const excludeHeaders = ['host', 'connection', 'content-length']
        for (const [key, value] of Object.entries(req.headers)) {
          if (!excludeHeaders.includes(key.toLowerCase())) {
            requestHeaders[key] = value as string
          }
        }
      }

      // 构建请求选项
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: requestHeaders,
        signal: AbortSignal.timeout(timeout),
      }

      // 处理 secure 选项（跳过 SSL 验证）
      if (!secure) {
        // 注意：在 Node.js 环境中，这里可能需要额外的配置
        // 对于 fetch API，我们无法直接控制 SSL 验证
        if (logLevel !== 'silent') {
          logger.warn('SSL 证书验证已禁用')
        }
      }

      // 如果有请求体，添加到选项中
      if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body)
      }

      // 发送请求到远程服务器
      const response = await fetch(fullUrl, fetchOptions)

      // 检查响应状态
      if (!response.ok) {
        throw new Error(
          `远程服务器响应错误: ${response.status} ${response.statusText}`,
        )
      }

      // 解析响应数据
      const data = await response.json()

      if (logLevel !== 'silent') {
        logger.success(`远程服务器响应成功: ${response.status}`)
      }
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      if (logLevel === 'error' || logLevel === 'warn' || logLevel === 'info') {
        logger.error(`远程服务器请求失败: ${errorMessage}`)
      }
      throw error
    }
  }

  /**
   * 检查是否配置了远程服务器
   */
  isRemoteServerConfigured(): boolean {
    return !!this.config.remoteServer?.target
  }
}
