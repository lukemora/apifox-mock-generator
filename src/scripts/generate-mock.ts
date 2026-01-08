import { setupContainer } from '../core/container-setup.js';
import { SERVICE_KEYS } from '../core/service-keys.js';
import { loadConfig } from '../core/config-loader.js';
import { handleError } from '../core/error-handler.js';
import { FetchApifoxDataUseCase } from '../application/use-cases/fetch-apifox-data.use-case.js';
import { GenerateMockUseCase } from '../application/use-cases/generate-mock.use-case.js';
import { GenerateTypesUseCase } from '../application/use-cases/generate-types.use-case.js';
import type { ILogger } from '../domain/interfaces.js';

/**
 * 主函数
 */
async function main() {
  const container = setupContainer();
  const logger = container.resolve<ILogger>(SERVICE_KEYS.LOGGER);

  try {
    logger.title('🚀 开始生成 Mock/类型文件...');

    const config = await loadConfig();

    // 获取 OpenAPI 数据
    const fetchUseCase = container.resolve<FetchApifoxDataUseCase>(
      SERVICE_KEYS.FETCH_APIFOX_DATA_USE_CASE
    );
    const openapi = await fetchUseCase.execute(config);

    const mode = config.generate ?? 'all';

    // 生成 Mock 文件
    if (mode === 'all' || mode === 'mock') {
      const generateMockUseCase = container.resolve<GenerateMockUseCase>(
        SERVICE_KEYS.GENERATE_MOCK_USE_CASE
      );
      await generateMockUseCase.execute(config, openapi);
    } else {
      logger.info('跳过 Mock 文件生成');
    }

    // 生成类型文件
    if (mode === 'all' || mode === 'types') {
      const generateTypesUseCase = container.resolve<GenerateTypesUseCase>(
        SERVICE_KEYS.GENERATE_TYPES_USE_CASE
      );
      await generateTypesUseCase.execute(config, openapi);
    } else {
      logger.info('跳过 TypeScript 类型文件生成');
    }

    logger.success('\n✨ 所有文件生成完成！');
  } catch (error) {
    handleError(error, logger);
    process.exit(1);
  }
}

main();
