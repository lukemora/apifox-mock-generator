import { logger } from '../utils/logger.js';
import { loadConfig } from '../core/config-loader.js';
import { fetchOpenAPIFromApifox } from '../core/apifox-client.js';
import { convertOpenAPIToEndpoints } from '../core/openapi-converter.js';
import { filterEndpoints } from '../core/endpoint-filter.js';
import { generateMockFiles } from '../generators/mock-generator.js';
import { generateTypeFiles } from '../generators/type-generator.js';
import { ApifoxError, ConfigError, NetworkError, ApifoxApiError } from '../core/errors.js';

/**
 * 主函数
 */
async function main() {
  try {
    logger.title('🚀 开始生成 Mock/类型文件...');

    const config = await loadConfig();

    // 从 Apifox 拉取 OpenAPI 数据（直接在内存中处理）
    const openapi = await fetchOpenAPIFromApifox(config);

    // 转换为端点数据
    const allEndpoints = convertOpenAPIToEndpoints(openapi);
    logger.success(`✓ 解析到 ${allEndpoints.length} 个 API 接口`);

    // 应用客户端筛选
    const endpoints = filterEndpoints(allEndpoints, config.apiFilter);

    if (config.apiFilter) {
      const filteredCount = allEndpoints.length - endpoints.length;
      if (filteredCount > 0) {
        logger.info(`  应用客户端筛选规则，过滤掉 ${filteredCount} 个接口`);
      }
      logger.success(`✓ 保留 ${endpoints.length} 个接口用于生成`);
    }

    if (endpoints.length === 0) {
      logger.warn('没有匹配的 API 接口，请检查筛选规则配置');
      return;
    }

    const mode = config.generate ?? 'all';

    if (mode === 'all' || mode === 'mock') {
      await generateMockFiles(config, endpoints, openapi.components?.schemas);
      logger.success('✓ Mock 文件生成完成');
    } else {
      logger.info('跳过 Mock 文件生成');
    }

    if (mode === 'all' || mode === 'types') {
      await generateTypeFiles(config, openapi, endpoints);
      logger.success('✓ 类型文件生成完成');
    } else {
      logger.info('跳过 TypeScript 类型文件生成');
    }

    logger.success('\n✨ 所有文件生成完成！');
  } catch (error) {
    // 处理不同类型的错误
    if (error instanceof ConfigError) {
      logger.error(`❌ 配置错误: ${error.message}`);
      if (error.details?.suggestion) {
        logger.info(`💡 建议: ${error.details.suggestion}`);
      }
      if (error.details?.path) {
        logger.info(`📁 配置文件路径: ${error.details.path}`);
      }
    } else if (error instanceof NetworkError) {
      logger.error(`❌ 网络错误: ${error.message}`);
      if (error.details?.suggestion) {
        logger.info(`💡 建议: ${error.details.suggestion}`);
      }
    } else if (error instanceof ApifoxApiError) {
      logger.error(`❌ Apifox API 错误: ${error.message}`);
      if (error.details?.suggestion) {
        logger.info(`💡 建议: ${error.details.suggestion}`);
      }
    } else if (error instanceof ApifoxError) {
      logger.error(`❌ ${error.name}: ${error.message}`);
      if (error.details) {
        logger.info(`详情: ${JSON.stringify(error.details, null, 2)}`);
      }
    } else {
      logger.error('❌ 生成失败');
      if (error instanceof Error) {
        console.error(error);
      } else {
        console.error('未知错误:', error);
      }
    }
    process.exit(1);
  }
}

main();
