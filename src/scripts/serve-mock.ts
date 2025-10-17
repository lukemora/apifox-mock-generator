import { logger } from '../utils/logger.js';
import { loadConfig } from '../core/config-loader.js';
import { RouteManager } from '../server/route-manager.js';
import { loadMockRoutes } from '../server/route-loader.js';
import { setupMockServer } from '../server/express-server.js';
import { setupHotReload } from '../server/hot-reload.js';

/**
 * 主函数
 */
async function main() {
  try {
    const config = await loadConfig();
    const routeManager = new RouteManager();

    logger.title('启动 Mock 服务器...');

    // 初始加载所有 Mock 路由
    const routes = await loadMockRoutes(config);
    routes.forEach(route => {
      const key = `${route.method} ${route.path}`;
      routeManager.setRoute(key, route);
    });
    logger.success(`加载了 ${routes.length} 个 Mock 路由`);

    // 创建并启动服务器
    const app = setupMockServer(routeManager);

    app.listen(config.mockPort, () => {
      logger.success(`\n🚀 Mock 服务器已启动！`);
      logger.info(`   地址: http://localhost:${config.mockPort}`);
      logger.info(`   路由数: ${routes.length}`);
      logger.info('\n可用的 API 接口:');

      routes.forEach(route => {
        const method = route.method.padEnd(6);
        console.log(`   ${method} http://localhost:${config.mockPort}${route.path}`);
      });

      logger.info('\n提示:');
      logger.info('  - 🔥 热重载已启用，修改 Mock 文件将自动生效');
      logger.info('  - 按 Ctrl+C 停止服务器\n');

      // 启动文件监听（热重载）
      setupHotReload(config, routeManager);
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
