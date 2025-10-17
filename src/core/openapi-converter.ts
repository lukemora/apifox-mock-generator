import type { ApiEndpoint } from '../types/index.js';

/**
 * 将 OpenAPI 格式转换为端点数组
 */
export function convertOpenAPIToEndpoints(openapi: any): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const paths = openapi.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const op = operation as any;

        endpoints.push({
          path,
          method: method.toUpperCase(),
          name: op.summary || op.operationId || `${method} ${path}`,
          description: op.description,
          operationId: op.operationId,
          tags: op.tags || [],
          deprecated: op.deprecated || false,
          status: op['x-apifox-status'] || '',
          folderPath: op['x-apifox-folder'] || '',
          parameters: op.parameters?.map((p: any) => ({
            name: p.name,
            in: p.in,
            required: p.required || false,
            type: p.schema?.type || 'string',
            description: p.description
          })),
          requestBody: op.requestBody?.content?.['application/json']?.schema,
          responseBody: op.responses?.['200']?.content?.['application/json']?.schema
        } as any);
      }
    }
  }

  return endpoints;
}
