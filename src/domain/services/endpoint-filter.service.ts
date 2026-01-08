import type { ILogger } from '../interfaces.js';
import type { ApiFilter } from '../../types/index.js';
import { ApiEndpoint } from '../entities/api-endpoint.entity.js';

/**
 * 中文状态到英文状态的映射
 */
export const STATUS_MAPPING: Record<string, string> = {
  设计中: 'designing',
  开发中: 'developing',
  已完成: 'completed',
  已废弃: 'deprecated',
  待确定: 'pending',
  测试中: 'testing',
  已发布: 'published'
};

/**
 * 端点过滤器服务
 * 负责根据筛选配置过滤 API 端点
 */
export class EndpointFilterService {
  constructor(private readonly logger: ILogger) {}

  /**
   * 根据筛选配置过滤端点
   * @param endpoints 端点列表
   * @param filter 筛选配置
   * @returns 过滤后的端点列表
   */
  filter(endpoints: ApiEndpoint[], filter?: ApiFilter): ApiEndpoint[] {
    if (!filter) {
      return endpoints;
    }

    return endpoints.filter(endpoint => {
      return this.shouldInclude(endpoint, filter);
    });
  }

  /**
   * 检查端点是否应该包含
   * @param endpoint 端点
   * @param filter 筛选配置
   * @returns 是否应该包含
   */
  private shouldInclude(endpoint: ApiEndpoint, filter: ApiFilter): boolean {
    // 1. 检查 includePaths（如果配置了，必须匹配其中之一）
    if (filter.includePaths && filter.includePaths.length > 0) {
      const matched = filter.includePaths.some(pattern =>
        this.matchPath(endpoint.path, pattern)
      );
      if (!matched) {
        this.logger.debug(`[Filter] 路径不匹配 includePaths: ${endpoint.path}`);
        return false;
      }
    }

    // 2. 检查 excludePaths（如果匹配，则排除）
    if (filter.excludePaths && filter.excludePaths.length > 0) {
      const matched = filter.excludePaths.some(pattern =>
        this.matchPath(endpoint.path, pattern)
      );
      if (matched) {
        this.logger.debug(`[Filter] 路径匹配 excludePaths，已排除: ${endpoint.path}`);
        return false;
      }
    }

    // 3. 检查 excludeDeprecated（排除废弃接口）
    if (endpoint.isDeprecated()) {
      this.logger.debug(`[Filter] 废弃接口已排除: ${endpoint.path}`);
      return false;
    }

    // 4. 检查 includeMethods（如果配置了，必须匹配）
    if (filter.includeMethods && filter.includeMethods.length > 0) {
      const includeMethodsUpper = filter.includeMethods.map(m => m.toUpperCase());
      if (!includeMethodsUpper.includes(endpoint.method.toUpperCase())) {
        this.logger.debug(`[Filter] 方法不匹配 includeMethods: ${endpoint.method}`);
        return false;
      }
    }

    // 5. 检查 excludeMethods（如果匹配，则排除）
    if (filter.excludeMethods && filter.excludeMethods.length > 0) {
      const excludeMethodsUpper = filter.excludeMethods.map(m => m.toUpperCase());
      if (excludeMethodsUpper.includes(endpoint.method.toUpperCase())) {
        this.logger.debug(`[Filter] 方法匹配 excludeMethods，已排除: ${endpoint.method}`);
        return false;
      }
    }

    // 6. 检查 includedByTags（基于接口状态过滤）
    if (filter.scope?.includedByTags && filter.scope.includedByTags.length > 0) {
      const includedStatuses = filter.scope.includedByTags.map(this.translateStatus);

      if (!endpoint.status || !includedStatuses.includes(endpoint.status)) {
        this.logger.debug(
          `[Filter] 接口状态不匹配 includedByTags，已排除: ${endpoint.status} (期望: ${includedStatuses.join(', ')})`
        );
        return false;
      }
    }

    // 7. 检查 excludedByTags（基于接口状态过滤）
    if (filter.scope?.excludedByTags && filter.scope.excludedByTags.length > 0) {
      const excludedStatuses = filter.scope.excludedByTags.map(this.translateStatus);

      if (endpoint.status && excludedStatuses.includes(endpoint.status)) {
        this.logger.debug(`[Filter] 接口状态匹配 excludedByTags，已排除: ${endpoint.status}`);
        return false;
      }
    }

    // 8. 检查 folderPaths（基于文件夹路径过滤，支持前缀匹配）
    if (filter.scope?.folderPaths && filter.scope.folderPaths.length > 0) {
      if (!endpoint.folderPath) {
        this.logger.debug(`[Filter] 接口缺少文件夹路径，已排除: ${endpoint.path}`);
        return false;
      }

      const matched = filter.scope.folderPaths.some(folderPath =>
        endpoint.isInFolder(folderPath)
      );

      if (!matched) {
        this.logger.debug(
          `[Filter] 文件夹路径不匹配，已排除: ${endpoint.folderPath} (期望: ${filter.scope.folderPaths.join(', ')})`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * 路径模式匹配（支持通配符 * 和 **）
   * * 匹配单层路径
   * ** 匹配多层路径
   * @param path 路径
   * @param pattern 模式
   * @returns 是否匹配
   */
  private matchPath(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '<<<DOUBLE_STAR>>>') // 临时替换 **
      .replace(/\*/g, '[^/]+') // * 匹配单层路径（不包含 /）
      .replace(/<<<DOUBLE_STAR>>>/g, '.*') // ** 匹配多层路径（包含 /）
      .replace(/\//g, '\\/'); // 转义斜杠

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * 转换状态值（支持中文到英文的映射）
   * @param status 状态值
   * @returns 转换后的状态值
   */
  private translateStatus(status: string): string {
    return STATUS_MAPPING[status] || status;
  }
}

/**
 * 路径模式匹配函数（向后兼容导出）
 * @param path 路径
 * @param pattern 模式
 * @returns 是否匹配
 */
export function matchPath(path: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\*\*/g, '<<<DOUBLE_STAR>>>')
    .replace(/\*/g, '[^/]+')
    .replace(/<<<DOUBLE_STAR>>>/g, '.*')
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

