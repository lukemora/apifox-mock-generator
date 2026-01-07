import type { MockRoute } from '../types/index.js';

/**
 * 查找匹配的路由
 */
export function findMatchingRoute(
  routes: MockRoute[],
  method: string,
  path: string
): MockRoute | undefined {
  // 去掉查询参数和哈希
  const pathWithoutQuery = path.split('?')[0].split('#')[0];
  
  return routes.find(route => {
    if (route.method.toUpperCase() !== method.toUpperCase()) {
      return false;
    }

    // 将 OpenAPI 路径格式转换为正则表达式
    const pattern = route.path.replace(/\{(\w+)\}/g, '([^/]+)');
    const regex = new RegExp(`^${pattern}$`);

    return regex.test(pathWithoutQuery);
  });
}

/**
 * 提取路径参数
 */
export function extractPathParams(routePath: string, actualPath: string): Record<string, string> {
  const params: Record<string, string> = {};

  // 提取参数名
  const paramNames: string[] = [];
  const pattern = routePath.replace(/\{(\w+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });

  const regex = new RegExp(`^${pattern}$`);
  const match = actualPath.match(regex);

  if (match) {
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
  }

  return params;
}
