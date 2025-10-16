import { logger } from '../utils/logger.js'
import type { ApiEndpoint, ApiFilter } from '../types/index.js'

/**
 * 中文状态到英文状态的映射
 */
const STATUS_MAPPING: Record<string, string> = {
  设计中: 'designing',
  开发中: 'developing',
  已完成: 'completed',
  已废弃: 'deprecated',
  待定: 'pending',
  测试中: 'testing',
  已发布: 'published',
}

/**
 * 转换状态值（支持中文到英文的映射）
 */
function translateStatus(status: string): string {
  return STATUS_MAPPING[status] || status
}

/**
 * 路径模式匹配（支持通配符 * 和 **）
 * * 匹配单层路径
 * ** 匹配多层路径
 */
export function matchPath(path: string, pattern: string): boolean {
  // 将模式转换为正则表达式
  const regexPattern = pattern
    .replace(/\*\*/g, '<<<DOUBLE_STAR>>>') // 临时替换 **
    .replace(/\*/g, '[^/]+') // * 匹配单层路径（不包含 /）
    .replace(/<<<DOUBLE_STAR>>>/g, '.*') // ** 匹配多层路径（包含 /）
    .replace(/\//g, '\\/') // 转义斜杠

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(path)
}

/**
 * 根据筛选配置过滤 API 端点
 */
export function filterEndpoints(
  endpoints: ApiEndpoint[],
  filter?: ApiFilter,
): ApiEndpoint[] {
  if (!filter) {
    return endpoints
  }

  return endpoints.filter((endpoint) => {
    // 1. 检查 includePaths（如果配置了，必须匹配其中之一）
    if (filter.includePaths && filter.includePaths.length > 0) {
      const matched = filter.includePaths.some((pattern) =>
        matchPath(endpoint.path, pattern),
      )
      if (!matched) {
        logger.debug(`[Filter] 路径不匹配 includePaths: ${endpoint.path}`)
        return false
      }
    }

    // 2. 检查 excludePaths（如果匹配，则排除）
    if (filter.excludePaths && filter.excludePaths.length > 0) {
      const matched = filter.excludePaths.some((pattern) =>
        matchPath(endpoint.path, pattern),
      )
      if (matched) {
        logger.debug(`[Filter] 路径匹配 excludePaths，已排除: ${endpoint.path}`)
        return false
      }
    }

    // 3. 检查 includeOperationIds（如果配置了，必须匹配）
    if (filter.includeOperationIds && filter.includeOperationIds.length > 0) {
      if (
        !endpoint.operationId ||
        !filter.includeOperationIds.includes(endpoint.operationId)
      ) {
        logger.debug(
          `[Filter] operationId 不匹配 includeOperationIds: ${endpoint.operationId}`,
        )
        return false
      }
    }

    // 4. 检查 excludeOperationIds（如果匹配，则排除）
    if (filter.excludeOperationIds && filter.excludeOperationIds.length > 0) {
      if (
        endpoint.operationId &&
        filter.excludeOperationIds.includes(endpoint.operationId)
      ) {
        logger.debug(
          `[Filter] operationId 匹配 excludeOperationIds，已排除: ${endpoint.operationId}`,
        )
        return false
      }
    }

    // 5. 检查 excludeDeprecated（排除废弃接口）
    if (filter.excludeDeprecated && endpoint.deprecated) {
      logger.debug(`[Filter] 废弃接口已排除: ${endpoint.path}`)
      return false
    }

    // 6. 检查 includeMethods（如果配置了，必须匹配）
    if (filter.includeMethods && filter.includeMethods.length > 0) {
      if (!filter.includeMethods.includes(endpoint.method.toUpperCase())) {
        logger.debug(`[Filter] 方法不匹配 includeMethods: ${endpoint.method}`)
        return false
      }
    }

    // 7. 检查 excludeMethods（如果匹配，则排除）
    if (filter.excludeMethods && filter.excludeMethods.length > 0) {
      if (filter.excludeMethods.includes(endpoint.method.toUpperCase())) {
        logger.debug(
          `[Filter] 方法匹配 excludeMethods，已排除: ${endpoint.method}`,
        )
        return false
      }
    }

    // 8. 检查 excludedByTags（基于接口状态过滤）
    if (
      filter.scope?.excludedByTags &&
      filter.scope.excludedByTags.length > 0
    ) {
      // 转换配置中的状态值（支持中文）
      const excludedStatuses = filter.scope.excludedByTags.map(translateStatus)

      if (endpoint.status && excludedStatuses.includes(endpoint.status)) {
        logger.debug(
          `[Filter] 接口状态匹配 excludedByTags，已排除: ${endpoint.status}`,
        )
        return false
      }
    }

    return true
  })
}
