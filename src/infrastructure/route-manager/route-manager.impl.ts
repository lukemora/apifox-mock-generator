import type { IRouteManager } from '../../domain/interfaces.js';
import type { MockRoute } from '../../types/index.js';

/**
 * 路由管理器实现
 */
export class RouteManagerImpl implements IRouteManager {
  private routes = new Map<string, MockRoute>();

  setRoute(key: string, route: MockRoute): void {
    this.routes.set(key, route);
  }

  getRoute(method: string, path: string): MockRoute | undefined {
    const key = `${method.toUpperCase()} ${path}`;
    return this.routes.get(key);
  }

  getAllRoutes(): MockRoute[] {
    return Array.from(this.routes.values());
  }

  removeRoute(key: string): void {
    this.routes.delete(key);
  }

  clear(): void {
    this.routes.clear();
  }
}

