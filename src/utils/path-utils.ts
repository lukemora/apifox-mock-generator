import type { ApiEndpoint } from '../types/index.js';

/**
 * 将路径转换为文件名
 * 直接使用 API 路径作为文件名，移除开头的斜杠和路径参数占位符
 * 路径参数（如 {id}）会被移除，因为它们是动态的，不应出现在文件名中
 * 例如: /v1/report-evaluation/detail -> v1/report-evaluation/detail
 *       /users/{id} -> users
 *       /users/{id}/posts/{postId} -> users/posts
 */
export function pathToFileName(apiPath: string, method: string, operationId?: string): string {
  // 直接使用路径，移除开头的斜杠
  let cleanPath = apiPath.replace(/^\//, '');

  // 移除路径参数占位符（如 {id}, {userId} 等）
  // 这些是动态参数，不应出现在文件名中
  cleanPath = cleanPath.replace(/\{[^}]+\}/g, '');

  // 清理可能出现的连续斜杠（移除参数后可能产生 //）
  cleanPath = cleanPath.replace(/\/+/g, '/');

  // 移除末尾的斜杠
  cleanPath = cleanPath.replace(/\/$/, '');

  // 确保路径分隔符使用正斜杠（跨平台兼容）
  cleanPath = cleanPath.replace(/\\/g, '/');

  return cleanPath;
}

/**
 * 按路径分组接口，相同路径的接口放在同一个文件中
 */
export function groupEndpointsByPath(endpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]> {
  const groups: Record<string, ApiEndpoint[]> = {};

  for (const endpoint of endpoints) {
    // 直接使用路径作为分组键，不添加方法后缀
    const resourcePath = pathToFileName(endpoint.path, endpoint.method, (endpoint as unknown as { operationId?: string }).operationId);

    if (!groups[resourcePath]) {
      groups[resourcePath] = [];
    }

    groups[resourcePath].push(endpoint);
  }

  return groups;
}
