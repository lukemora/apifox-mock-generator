import { logger } from '../utils/logger.js';
import { loadConfig } from '../core/config-loader.js';
import { loadMockConfig } from '../core/mock-config-loader.js';
import { RouteManager } from '../server/route-manager.js';
import { loadMockRoutes } from '../server/route-loader.js';
import { setupMockServer } from '../server/express-server.js';
import { setupHotReload } from '../server/hot-reload.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 检查并清理端口占用
 */
async function checkAndCleanPort(port: number): Promise<void> {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    if (stdout.trim()) {
      logger.warn(`端口 ${port} 被占用，正在清理...`);

      const lines = stdout.trim().split('\n');
      const pids = new Set<string>();

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
      });

      for (const pid of pids) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          logger.success(`✓ 已清理进程 ${pid}`);
        } catch (error) {
          logger.warn(`无法清理进程 ${pid}: ${error}`);
        }
      }

      // 等待端口释放
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    // 端口未被占用，这是正常情况
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 加载配置
    const apifoxConfig = await loadConfig();
    const mockConfig = await loadMockConfig();

    // 检查并清理端口占用
    await checkAndCleanPort(mockConfig.port);
    const routeManager = new RouteManager();

    logger.title('启动 Mock 服务器...');

    // 初始加载所有 Mock 路由
    const routes = await loadMockRoutes(apifoxConfig, mockConfig);
    routes.forEach(route => {
      const key = `${route.method} ${route.path}`;
      routeManager.setRoute(key, route);
    });
    logger.success(`加载了 ${routes.length} 个 Mock 路由`);

    // 创建并启动服务器
    const app = setupMockServer(routeManager, mockConfig);

    app.listen(mockConfig.port, 'localhost', () => {
      logger.success(`\n🚀 Mock 服务器已启动！`);
      logger.info(`   🌐 地址: http://localhost:${mockConfig.port}`);
      logger.info(`   ⚙️  工作模式: ${mockConfig.model}`);
      if (mockConfig.model === 'mock') {
        // 纯 mock 模式：只在存在 proxyRoutes 时提示目标服务器
        if (mockConfig.proxyRoutes?.length) {
          logger.info(`   🎯 目标服务器: ${mockConfig.target}`);
        }
        logger.info(`   📁 Mock 目录: ${apifoxConfig.mockDir}`);
        logger.info(`   📊 已加载路由: ${routes.length} 个`);
      } else {
        // 纯 proxy 模式：仅在存在 mockRoutes 时提示本地 Mock 目录和路由数
        logger.info(`   🎯 目标服务器: ${mockConfig.target}`);
        if (mockConfig.mockRoutes?.length) {
          logger.info(`   📁 Mock 目录: ${apifoxConfig.mockDir}`);
          logger.info(`   📊 已加载路由: ${routes.length} 个`);
        }
      }
      logger.info('\n💡 提示:');
      logger.info('  - 🔥 热重载已启用，修改 Mock 文件将自动生效');
      logger.info('  - 🛑 按 Ctrl+C 停止服务器\n');

      // 启动文件监听（热重载）
      setupHotReload(apifoxConfig, routeManager, mockConfig);
    });
  } catch (error) {
    logger.error('启动失败');
    if (error instanceof Error) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
