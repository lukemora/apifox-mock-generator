import path from 'path'
import chokidar from 'chokidar'
import { logger } from '../utils/logger.js'
import { loadRouteFromFile } from './route-loader.js'
import type { RouteManager } from './route-manager.js'
import type { ApifoxConfig } from '../types/index.js'

/**
 * 设置热重载
 */
export function setupHotReload(config: ApifoxConfig, routeManager: RouteManager): void {
  const mockDir = path.resolve(config.mockDir)

  logger.info('🔥 监听 Mock 文件变化...')
  logger.info(`   监听目录: ${mockDir}`)
  logger.info('')

  // 使用标准化的路径格式
  const watchPattern = path.join(mockDir, '**', '*.js').replace(/\\/g, '/')

  const watcher = chokidar.watch(watchPattern, {
    ignored: ['**/index.js', '**/node_modules/**'],
    persistent: true,
    ignoreInitial: true, // 忽略初始扫描
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    },
    usePolling: false,
    atomic: true
  })

  watcher
    .on('add', async (filePath) => {
      logger.info(`📝 检测到新文件: ${path.relative(mockDir, filePath)}`)
      const result = await loadRouteFromFile(filePath, mockDir)
      if (result) {
        routeManager.setRoute(result.key, result.route)
        logger.success(`✓ 已加载路由: ${result.key}`)
      }
    })
    .on('change', async (filePath) => {
      logger.info(`📝 文件已修改: ${path.relative(mockDir, filePath)}`)
      const result = await loadRouteFromFile(filePath, mockDir)
      if (result) {
        routeManager.setRoute(result.key, result.route)
        logger.success(`✓ 已更新路由: ${result.key}`)
      }
    })
    .on('unlink', async (filePath) => {
      logger.info(`🗑️  文件已删除: ${path.relative(mockDir, filePath)}`)

      // 尝试从文件路径推断路由信息
      // 这里简化处理，实际应该存储文件路径到路由的映射
      const allRoutes = routeManager.getAllRoutes()
      allRoutes.forEach(route => {
        const key = `${route.method} ${route.path}`
        // 简单判断：如果找不到对应的物理文件，则移除
        routeManager.removeRoute(key)
      })

      logger.warn(`⚠️  已移除相关路由`)
    })
    .on('error', error => logger.error(`监听错误: ${error}`))
}

