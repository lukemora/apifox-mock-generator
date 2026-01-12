import type { IApifoxClient, ILogger } from '../../domain/interfaces.js';
import type { ApifoxConfig } from '../../types/index.js';
import type { OpenAPIDocument } from '../../types/openapi.js';

/**
 * 获取 Apifox 数据用例
 * 负责从 Apifox 获取 OpenAPI 文档
 */
export class FetchApifoxDataUseCase {
  constructor(
    private readonly apifoxClient: IApifoxClient,
    private readonly logger: ILogger
  ) {}

  /**
   * 执行用例
   * @param config Apifox 配置
   * @returns OpenAPI 文档
   */
  async execute(config: ApifoxConfig): Promise<OpenAPIDocument> {

    try {
      const openapi = await this.apifoxClient.fetchOpenAPI(config);

      const endpointCount = Object.keys(openapi.paths || {}).length;
      this.logger.success(
        `✓ 从 Apifox 拉取成功（${endpointCount} 个接口）`
      );

      return openapi;
    } catch (error) {
      this.logger.error(
        `❌ 拉取失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
      throw error;
    }
  }
}

