import path from 'path';
import chokidar from 'chokidar';
import { watch } from 'fs';
import { logger } from '../utils/logger.js';
import { loadRouteFromFile, clearModuleCache } from './route-loader.js';
import type { RouteManager } from './route-manager.js';
import type { ApifoxConfig } from '../types/index.js';
import type { MockConfig } from '../core/mock-config-loader.js';

/**
 * 设置热重载
 */
export function setupHotReload(
  config: ApifoxConfig,
  routeManager: RouteManager,
  mockConfig: MockConfig
): void {
  const mockDir = path.resolve(config.mockDir);

  logger.info('🔥 监听 Mock 文件变化...');
  logger.info(`   监听目录: ${mockDir}`);
  logger.info('');

  // 使用标准化的路径格式
  const watchPattern = path.join(mockDir, '**', '*.js').replace(/\\/g, '/');

  const watcher = chokidar.watch(watchPattern, {
    ignored: ['**/index.js', '**/node_modules/**'],
    persistent: true,
    ignoreInitial: true, // 忽略初始扫描
    awaitWriteFinish: {
      stabilityThreshold: 1000, // 增加稳定性阈值
      pollInterval: 100
    },
    usePolling: true, // 启用轮询以确保文件变化被检测到
    atomic: true,
    depth: 10, // 限制监听深度
    followSymlinks: false // 不跟随符号链接
  });

  // 添加备用的原生文件监听
  try {
    const nativeWatcher = watch(mockDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.js') && !filename.includes('index.js')) {
        const fullPath = path.join(mockDir, filename);
        handleFileChange(fullPath, mockDir, config, routeManager, mockConfig);
      }
    });
  } catch (error) {
    logger.warn(`原生文件监听启动失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  // 处理文件变化的通用函数
  async function handleFileChange(
    filePath: string,
    mockDir: string,
    config: ApifoxConfig,
    routeManager: RouteManager,
    mockConfig: MockConfig
  ) {
    try {
      const relativePath = path.relative(mockDir, filePath);
      logger.info(`🔥 检测到文件变化: ${relativePath}`);

      // 清除该文件的模块缓存
      clearModuleCache(filePath);

      const result = await loadRouteFromFile(filePath, mockDir, config, mockConfig);
      if (result) {
        routeManager.setRoute(result.key, result.route);
        logger.success(`✅ 热重载成功: ${result.key}`);

        // 显示路由的详细信息
        const routeInfo = result.route;
        const methodName =
          routeInfo.method.charAt(0).toUpperCase() + routeInfo.method.slice(1).toLowerCase();
        const checkFunctionName = `check${methodName}`;
        logger.info(`   📍 路由: ${routeInfo.method} ${routeInfo.path}`);
        logger.info(`   🔧 检查函数: ${checkFunctionName}`);
        logger.info(`   🎯 数据源: ${mockConfig.target || '本地Mock'}`);
      } else {
        logger.warn(`⚠️  无法从修改的文件加载路由: ${relativePath}`);
      }
    } catch (error) {
      logger.error(`❌ 热重载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  watcher
    .on('add', async filePath => {
      logger.info(`📝 检测到新文件: ${path.relative(mockDir, filePath)}`);
      try {
        const result = await loadRouteFromFile(filePath, mockDir, config, mockConfig);
        if (result) {
          routeManager.setRoute(result.key, result.route);
          logger.success(`✓ 已加载路由: ${result.key}`);
        } else {
          logger.warn(`⚠️  无法从文件加载路由: ${path.relative(mockDir, filePath)}`);
        }
      } catch (error) {
        logger.error(`❌ 加载新文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    })
    .on('change', async filePath => {
      logger.info(`📝 文件已修改: ${path.relative(mockDir, filePath)}`);
      console.log(`[热重载] 检测到文件变化: ${filePath}`);
      try {
        // 清除该文件的模块缓存
        clearModuleCache(filePath);

        const result = await loadRouteFromFile(filePath, mockDir, config, mockConfig);
        if (result) {
          routeManager.setRoute(result.key, result.route);
          logger.success(`✓ 已更新路由: ${result.key}`);
          console.log(`[热重载] 路由已更新: ${result.key}`);
        } else {
          logger.warn(`⚠️  无法从修改的文件加载路由: ${path.relative(mockDir, filePath)}`);
        }
      } catch (error) {
        logger.error(`❌ 更新文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
        console.error(`[热重载] 更新失败:`, error);
      }
    })
    .on('unlink', async filePath => {
      logger.info(`🗑️  文件已删除: ${path.relative(mockDir, filePath)}`);

      // 尝试从文件路径推断路由信息
      // 这里简化处理，实际应该存储文件路径到路由的映射
      const allRoutes = routeManager.getAllRoutes();
      let removedCount = 0;

      allRoutes.forEach(route => {
        const key = `${route.method} ${route.path}`;
        // 简单判断：如果找不到对应的物理文件，则移除
        routeManager.removeRoute(key);
        removedCount++;
      });

      if (removedCount > 0) {
        logger.warn(`⚠️  已移除 ${removedCount} 个相关路由`);
      }
    })
    .on('error', error => {
      logger.error(`❌ 文件监听错误: ${error instanceof Error ? error.message : '未知错误'}`);
    });
}
