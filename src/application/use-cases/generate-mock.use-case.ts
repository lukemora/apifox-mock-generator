import type { ILogger } from '../../domain/interfaces.js';
import type { ApifoxConfig } from '../../types/index.js';
import type { OpenAPIDocument } from '../../types/openapi.js';
import { EndpointFilterService } from '../../domain/services/endpoint-filter.service.js';
import { OpenAPIConverterService } from '../../domain/services/openapi-converter.service.js';
import { generateMockFiles } from '../../generators/mock-generator.js';
import type { ApiEndpoint } from '../../types/index.js';

/**
 * 生成 Mock 用例
 * 负责生成 Mock 文件
 */
export class GenerateMockUseCase {
  constructor(
    private readonly endpointFilter: EndpointFilterService,
    private readonly openapiConverter: OpenAPIConverterService,
    private readonly logger: ILogger
  ) {}

  /**
   * 执行用例
   * @param config Apifox 配置
   * @param openapi OpenAPI 文档
   */
  async execute(config: ApifoxConfig, openapi: OpenAPIDocument): Promise<void> {
    this.logger.title('生成 Mock 文件...');

    // 转换为端点实体
    const allEndpoints = this.openapiConverter.convert(openapi);
    this.logger.success(`✓ 解析到 ${allEndpoints.length} 个 API 接口`);

    // 应用过滤（转换为普通对象以兼容现有生成器）
    const filteredEndpoints = this.endpointFilter.filter(allEndpoints, config.apiFilter);

    if (config.apiFilter) {
      const filteredCount = allEndpoints.length - filteredEndpoints.length;
      if (filteredCount > 0) {
        this.logger.info(`  应用客户端筛选规则，过滤掉 ${filteredCount} 个接口`);
      }
      this.logger.success(`✓ 保留 ${filteredEndpoints.length} 个接口用于生成`);
    }

    if (filteredEndpoints.length === 0) {
      this.logger.warn('没有匹配的 API 接口，请检查筛选规则配置');
      return;
    }

    // 转换为普通对象以兼容现有生成器
    const endpoints: ApiEndpoint[] = filteredEndpoints.map(e => e.toJSON());

    // 生成 Mock 文件
    await generateMockFiles(config, endpoints, openapi.components?.schemas);

    this.logger.success('✓ Mock 文件生成完成');
  }
}

