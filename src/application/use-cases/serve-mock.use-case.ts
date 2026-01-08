import type { ILogger } from '../../domain/interfaces.js';
import type { ApifoxConfig } from '../../types/index.js';
import type { MockConfig } from '../../core/mock-config-loader.js';
import { RouteManagerImpl } from '../../infrastructure/route-manager/route-manager.impl.js';
import { loadMockRoutes } from '../../infrastructure/server/route-loader.js';
import { setupMockServer } from '../../presentation/http/express-server.js';
import { setupHotReload } from '../../infrastructure/server/hot-reload.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 启动 Mock 服务器用例
 * 负责启动 Mock 服务器并加载路由
 * 
 * 注意：这里暂时直接使用 RouteManager 类，因为现有代码依赖具体类型
 * Phase 4 中将重构服务器代码以使用接口
 */
export class ServeMockUseCase {
  constructor(private readonly logger: ILogger) {
  }

  /**
   * 检查并清理端口占用
   * @param port 端口号
   */
  async checkAndCleanPort(port: number): Promise<void> {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      if (stdout.trim()) {
        this.logger.warn(`端口 ${port} 被占用，正在清理...`);

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
            this.logger.success(`✓ 已清理进程 ${pid}`);
          } catch (error) {
            this.logger.warn(`无法清理进程 ${pid}: ${error}`);
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
   * 执行用例
   * @param apifoxConfig Apifox 配置
   * @param mockConfig Mock 配置
   */
  async execute(
    apifoxConfig: ApifoxConfig,
    mockConfig: MockConfig
  ): Promise<void> {
    // 检查并清理端口占用
    await this.checkAndCleanPort(mockConfig.port);

    this.logger.title('启动 Mock 服务器...');

    // 初始加载所有 Mock 路由
    const routes = await loadMockRoutes(apifoxConfig, mockConfig);
    const routeManager = new RouteManagerImpl();
    routes.forEach(route => {
      const key = `${route.method} ${route.path}`;
      routeManager.setRoute(key, route);
    });
    this.logger.success(`加载了 ${routes.length} 个 Mock 路由`);

    // 创建并启动服务器
    const app = setupMockServer(routeManager, mockConfig);

    app.listen(mockConfig.port, 'localhost', () => {
      this.logger.success(`\n🚀 Mock 服务器已启动！`);
      this.logger.info(`   🌐 地址: http://localhost:${mockConfig.port}`);
      this.logger.info(`   ⚙️  工作模式: ${mockConfig.model}`);
      if (mockConfig.model === 'mock') {
        // 纯 mock 模式：只在存在 proxyRoutes 时提示目标服务器
        if (mockConfig.proxyRoutes?.length) {
          this.logger.info(`   🎯 目标服务器: ${mockConfig.target}`);
        }
        this.logger.info(`   📁 Mock 目录: ${apifoxConfig.mockDir}`);
        this.logger.info(`   📊 已加载路由: ${routes.length} 个`);
      } else {
        // 纯 proxy 模式：仅在存在 mockRoutes 时提示本地 Mock 目录和路由数
        this.logger.info(`   🎯 目标服务器: ${mockConfig.target}`);
        if (mockConfig.mockRoutes?.length) {
          this.logger.info(`   📁 Mock 目录: ${apifoxConfig.mockDir}`);
          this.logger.info(`   📊 已加载路由: ${routes.length} 个`);
        }
      }
      this.logger.info('\n💡 提示:');
      this.logger.info('  - 🔥 热重载已启用，修改 Mock 文件将自动生效');
      this.logger.info('  - 🛑 按 Ctrl+C 停止服务器\n');

      // 启动文件监听（热重载）
      setupHotReload(apifoxConfig, routeManager, mockConfig);
    });
  }
}

