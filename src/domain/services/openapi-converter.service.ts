import type {
  OpenAPIDocument,
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPIParameter,
  HttpMethod
} from '../../types/openapi.js';
import { isParameterReference } from '../../types/openapi.js';
import { ApiEndpoint } from '../entities/api-endpoint.entity.js';
import type { ApiEndpoint as ApiEndpointInterface } from '../../types/index.js';

/**
 * OpenAPI 转换器服务
 * 负责将 OpenAPI 文档转换为 ApiEndpoint 实体
 */
export class OpenAPIConverterService {
  /**
   * 将 OpenAPI 格式转换为端点数组
   * @param openapi OpenAPI 文档
   * @returns 端点实体数组
   */
  convert(openapi: OpenAPIDocument): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];
    const paths = openapi.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      const typedPathItem = pathItem as OpenAPIPathItem;

      // 遍历所有可能的 HTTP 方法
      const methods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch'];

      for (const method of methods) {
        const operation = typedPathItem[method];
        if (operation) {
          const op = operation as OpenAPIOperation;

          const endpointData: ApiEndpointInterface = {
            path,
            method: method.toUpperCase(),
            name: op.summary || op.operationId || `${method} ${path}`,
            description: op.description,
            operationId: op.operationId,
            tags: op.tags || [],
            deprecated: op.deprecated || false,
            status: op['x-apifox-status'] || '',
            folderPath: op['x-apifox-folder'] || '',
            parameters: op.parameters?.map(p => {
              // 处理参数引用
              if (isParameterReference(p)) {
                // 如果是引用，返回基本信息（实际应该解析引用）
                return {
                  name: '',
                  in: 'query',
                  required: false,
                  type: 'string',
                  description: undefined,
                  schema: undefined
                };
              }

              const param = p as OpenAPIParameter;
              const schema =
                param.schema && !('$ref' in param.schema)
                  ? param.schema
                  : undefined;

              return {
                name: param.name,
                in: param.in,
                required: param.required || false,
                type: schema?.type || 'string',
                description: param.description,
                schema: schema
              };
            }),
            requestBody:
              op.requestBody && !('$ref' in op.requestBody)
                ? op.requestBody.content?.['application/json']?.schema
                : undefined,
            responseBody:
              op.responses?.['200'] && !('$ref' in op.responses['200'])
                ? op.responses['200'].content?.['application/json']?.schema
                : undefined
          };

          endpoints.push(new ApiEndpoint(endpointData));
        }
      }
    }

    return endpoints;
  }
}


