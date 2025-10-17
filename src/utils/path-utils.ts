import type { ApiEndpoint } from '../types/index.js';

/**
 * 将路径和方法转换为文件名
 * 例如: GET /users -> users/list.js
 *       POST /users -> users/create.js
 *       GET /users/{id} -> users/detail.js
 */
export function pathToFileName(apiPath: string, method: string, operationId?: string): string {
  // 如果有 operationId，优先使用
  if (operationId) {
    // getUserList -> users/list
    // createUser -> users/create
    const match = operationId.match(/^(get|post|put|delete|patch)?(.+)$/i);
    if (match) {
      const resource = match[2];

      // 将驼峰转换为路径
      const fileName = resource
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

      return fileName;
    }
  }

  // 移除开头的斜杠和参数占位符
  let cleanPath = apiPath.replace(/^\//, '').replace(/\{[^}]+\}/g, 'detail');

  // 替换斜杠为路径分隔符
  cleanPath = cleanPath.replace(/\//g, '/');

  // 根据方法名添加后缀
  const methodSuffix: Record<string, string> = {
    'GET': cleanPath.endsWith('detail') ? '' : '/list',
    'POST': '/create',
    'PUT': '/update',
    'DELETE': '/delete',
    'PATCH': '/patch'
  };

  const suffix = methodSuffix[method.toUpperCase()] || '';
  return cleanPath + suffix;
}

/**
 * 按路径分组接口，相同资源的接口放在同一个文件中
 */
export function groupEndpointsByPath(endpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]> {
  const groups: Record<string, ApiEndpoint[]> = {};

  for (const endpoint of endpoints) {
    const fileName = pathToFileName(endpoint.path, endpoint.method, (endpoint as any).operationId);

    // 提取资源路径（去除方法后缀）
    let resourcePath = fileName
      .replace(/\/list$/, '')
      .replace(/\/create$/, '')
      .replace(/\/update$/, '')
      .replace(/\/delete$/, '')
      .replace(/\/detail$/, '')
      .replace(/\/patch$/, '');

    // 如果路径为空，使用文件名本身
    if (!resourcePath || resourcePath === fileName) {
      resourcePath = fileName;
    }

    if (!groups[resourcePath]) {
      groups[resourcePath] = [];
    }

    groups[resourcePath].push(endpoint);
  }

  return groups;
}
