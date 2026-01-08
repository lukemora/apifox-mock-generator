import { setupContainer } from '../../../src/core/container-setup.js';
import { SERVICE_KEYS } from '../../../src/core/service-keys.js';
import type { IApifoxClient } from '../../../src/domain/interfaces.js';
import { EndpointFilterService } from '../../../src/domain/services/endpoint-filter.service.js';
import { OpenAPIConverterService } from '../../../src/domain/services/openapi-converter.service.js';
import { ApiEndpoint } from '../../../src/domain/entities/api-endpoint.entity.js';
import type { ApifoxConfig, ApiEndpoint as ApiEndpointInterface, ApiFilter } from '../../../src/types/index.js';
import type { OpenAPIDocument } from '../../../src/types/openapi.js';

/**
 * 测试辅助函数：从 Apifox 拉取 OpenAPI 数据
 */
export async function fetchOpenAPIFromApifox(config: ApifoxConfig): Promise<OpenAPIDocument> {
  const container = setupContainer();
  const client = container.resolve<IApifoxClient>(SERVICE_KEYS.APIFOX_CLIENT);
  return await client.fetchOpenAPI(config);
}

/**
 * 测试辅助函数：将 OpenAPI 转换为端点数组
 */
export function convertOpenAPIToEndpoints(openapi: OpenAPIDocument): ApiEndpointInterface[] {
  const container = setupContainer();
  const service = container.resolve<OpenAPIConverterService>(SERVICE_KEYS.OPENAPI_CONVERTER);
  const endpointEntities = service.convert(openapi);
  return endpointEntities.map(e => e.toJSON());
}

/**
 * 测试辅助函数：过滤端点
 */
export function filterEndpoints(endpoints: ApiEndpointInterface[], filter?: ApiFilter): ApiEndpointInterface[] {
  const container = setupContainer();
  const service = container.resolve<EndpointFilterService>(SERVICE_KEYS.ENDPOINT_FILTER);
  const endpointEntities = endpoints.map(e => new ApiEndpoint(e));
  const filteredEntities = service.filter(endpointEntities, filter);
  return filteredEntities.map(e => e.toJSON());
}

/**
 * 状态映射常量
 */
export const STATUS_MAPPING: Record<string, string> = {
  设计中: 'designing',
  开发中: 'developing',
  已完成: 'completed',
  已废弃: 'deprecated',
  待确定: 'pending',
  测试中: 'testing',
  已发布: 'published'
};

