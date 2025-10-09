import axios from 'axios'
import https from 'https'
import { logger } from '../utils/logger.js'
import type { ApifoxConfig } from '../types/index.js'

/**
 * 从 Apifox 拉取 OpenAPI 数据
 */
export async function fetchOpenAPIFromApifox(config: ApifoxConfig): Promise<any> {
  logger.info('从 Apifox 拉取 API 数据...')

  try {
    const apiUrl = `https://api.apifox.com/v1/projects/${config.projectId}/export-openapi?locale=zh-CN`

    // 构建请求体
    const requestBody = buildRequestBody(config)

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-Apifox-Api-Version': '2024-03-28'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 30000
    })

    logger.success(`✓ 从 Apifox 拉取成功（${Object.keys(response.data.paths || {}).length} 个接口）`)

    return response.data

  } catch (error) {
    handleApifoxError(error)
    throw error
  }
}

/**
 * 构建请求体
 */
function buildRequestBody(config: ApifoxConfig): any {
  const requestBody: any = {
    oasVersion: '3.0',
    exportFormat: 'JSON'
  }

  // 应用服务端过滤配置
  if (config.apiFilter) {
    if (config.apiFilter.scope) {
      const scope: any = {}

      if (config.apiFilter.scope.type) {
        scope.type = config.apiFilter.scope.type
      }
      if (config.apiFilter.scope.includedByTags && config.apiFilter.scope.includedByTags.length > 0) {
        scope.includedByTags = config.apiFilter.scope.includedByTags
      }
      if (config.apiFilter.scope.excludedByTags && config.apiFilter.scope.excludedByTags.length > 0) {
        scope.excludedByTags = config.apiFilter.scope.excludedByTags
      }
      if (config.apiFilter.scope.folderPath) {
        scope.folderPath = config.apiFilter.scope.folderPath
      }
      if (config.apiFilter.scope.apiIdList && config.apiFilter.scope.apiIdList.length > 0) {
        scope.apiIdList = config.apiFilter.scope.apiIdList
      }

      if (Object.keys(scope).length > 0) {
        requestBody.scope = scope
      }
    }

    if (config.apiFilter.options) {
      const options: any = {}

      if (config.apiFilter.options.includeApifoxExtensionProperties !== undefined) {
        options.includeApifoxExtensionProperties = config.apiFilter.options.includeApifoxExtensionProperties
      }
      if (config.apiFilter.options.addFoldersToTags !== undefined) {
        options.addFoldersToTags = config.apiFilter.options.addFoldersToTags
      }

      if (Object.keys(options).length > 0) {
        requestBody.options = options
      }
    }
  }

  return requestBody
}

/**
 * 处理 Apifox API 错误
 */
function handleApifoxError(error: unknown): void {
  // 网络连接错误处理
  if (axios.isAxiosError(error)) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      logger.errorSimple('网络连接失败，无法连接到 api.apifox.com')
      logger.info('请检查网络连接或代理设置')
      return
    }

    if (error.response) {
      const errorData = error.response.data as any

      if (error.response.status === 403 && errorData?.errorCode === '403012') {
        logger.errorSimple('权限不足: 当前 Access Token 没有「项目维护者」权限')
        logger.info('请在 Apifox 中更新 Token 权限')
      } else if (error.response.status === 401) {
        logger.errorSimple('认证失败: Access Token 无效或已过期')
        logger.info('请检查 apifox.config.json 中的 token 配置')
      } else {
        logger.errorSimple(`API 请求失败 (HTTP ${error.response.status})`)
        if (errorData?.message) {
          logger.info(`错误详情: ${errorData.message}`)
        }
      }
      return
    }
  }

  // 其他类型的错误
  logger.errorSimple('从 Apifox 拉取 API 数据失败')
  if (error instanceof Error && !axios.isAxiosError(error)) {
    logger.info(error.message)
  }
}

