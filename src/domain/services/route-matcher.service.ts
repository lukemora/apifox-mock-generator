import { MockRoute } from '../entities/mock-route.entity.js';

/**
 * 路由匹配器服务
 * 负责路由匹配和参数提取
 */
export class RouteMatcherService {
  /**
   * 查找匹配的路由
   * @param routes 路由列表
   * @param method HTTP 方法
   * @param path 路径
   * @returns 匹配的路由，如果不存在则返回 undefined
   */
  findMatchingRoute(
    routes: MockRoute[],
    method: string,
    path: string
  ): MockRoute | undefined {
    return routes.find(route => route.matches(method, path));
  }

  /**
   * 提取路径参数
   * @param routePath 路由路径（带参数占位符）
   * @param actualPath 实际路径
   * @returns 路径参数对象
   */
  extractPathParams(routePath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const paramNames: string[] = [];

    const pattern = routePath.replace(/\{(\w+)\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${pattern}$`);
    const pathWithoutQuery = actualPath.split('?')[0].split('#')[0];
    const match = pathWithoutQuery.match(regex);

    if (match) {
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
    }

    return params;
  }
}

/**
 * 查找匹配的路由（向后兼容导出）
 * @param routes 路由列表
 * @param method HTTP 方法
 * @param path 路径
 * @returns 匹配的路由
 */
export function findMatchingRoute(
  routes: MockRoute[],
  method: string,
  path: string
): MockRoute | undefined {
  const service = new RouteMatcherService();
  return service.findMatchingRoute(routes, method, path);
}

/**
 * 提取路径参数（向后兼容导出）
 * @param routePath 路由路径
 * @param actualPath 实际路径
 * @returns 路径参数对象
 */
export function extractPathParams(
  routePath: string,
  actualPath: string
): Record<string, string> {
  const service = new RouteMatcherService();
  return service.extractPathParams(routePath, actualPath);
}

