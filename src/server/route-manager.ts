import type { MockRoute } from '../types/index.js'

/**
 * 路由存储，支持动态更新
 */
export class RouteManager {
  private routes: Map<string, MockRoute> = new Map()

  setRoute(key: string, route: MockRoute) {
    this.routes.set(key, route)
  }

  removeRoute(key: string) {
    this.routes.delete(key)
  }

  getRoute(method: string, path: string): MockRoute | undefined {
    const key = `${method.toUpperCase()} ${path}`
    return this.routes.get(key)
  }

  getAllRoutes(): MockRoute[] {
    return Array.from(this.routes.values())
  }

  clear() {
    this.routes.clear()
  }
}

