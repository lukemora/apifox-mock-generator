import { setupContainer } from '../core/container-setup.js';
import { SERVICE_KEYS } from '../core/service-keys.js';
import { loadConfig } from '../core/config-loader.js';
import { loadMockConfig } from '../core/mock-config-loader.js';
import { handleError } from '../core/error-handler.js';
import { ServeMockUseCase } from '../application/use-cases/serve-mock.use-case.js';
import type { ILogger } from '../domain/interfaces.js';

/**
 * 主函数
 */
async function main() {
  const container = setupContainer();
  const logger = container.resolve<ILogger>(SERVICE_KEYS.LOGGER);

  try {
    // 加载配置
    const apifoxConfig = await loadConfig();
    const mockConfig = await loadMockConfig();

    // 启动服务器
    const serveUseCase = container.resolve<ServeMockUseCase>(
      SERVICE_KEYS.SERVE_MOCK_USE_CASE
    );
    await serveUseCase.execute(apifoxConfig, mockConfig);
  } catch (error) {
    handleError(error, logger);
    process.exit(1);
  }
}

main();
