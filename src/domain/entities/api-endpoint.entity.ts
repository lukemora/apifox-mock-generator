import type { ApiEndpoint as ApiEndpointInterface, ApiParameter } from '../../types/index.js';
import type { OpenAPISchema, OpenAPISchemaReference } from '../../types/openapi.js';

/**
 * API 端点实体
 * 封装 API 端点的业务逻辑
 */
export class ApiEndpoint implements ApiEndpointInterface {
  public readonly path: string;
  public readonly method: string;
  public readonly name: string;
  public readonly description?: string;
  public readonly operationId?: string;
  public readonly tags?: string[];
  public readonly deprecated?: boolean;
  public readonly status?: string;
  public readonly parameters?: ApiParameter[];
  public readonly requestBody?: OpenAPISchema | OpenAPISchemaReference;
  public readonly responseBody?: OpenAPISchema | OpenAPISchemaReference;
  public readonly folderPath?: string;

  constructor(data: ApiEndpointInterface) {
    this.path = data.path;
    this.method = data.method;
    this.name = data.name;
    this.description = data.description;
    this.operationId = data.operationId;
    this.tags = data.tags;
    this.deprecated = data.deprecated;
    this.status = data.status;
    this.parameters = data.parameters;
    this.requestBody = data.requestBody;
    this.responseBody = data.responseBody;
    this.folderPath = data.folderPath;
  }

  /**
   * 检查端点是否匹配给定的路径和方法
   * @param method HTTP 方法
   * @param path 路径
   * @returns 是否匹配
   */
  matches(method: string, path: string): boolean {
    return (
      this.method.toUpperCase() === method.toUpperCase() &&
      this.path === path
    );
  }

  /**
   * 检查端点是否废弃
   * @returns 是否废弃
   */
  isDeprecated(): boolean {
    return this.deprecated === true;
  }

  /**
   * 检查端点是否具有指定状态
   * @param status 状态值
   * @returns 是否匹配
   */
  hasStatus(status: string): boolean {
    return this.status === status;
  }

  /**
   * 检查端点是否在指定文件夹路径下
   * @param folderPath 文件夹路径
   * @returns 是否匹配
   */
  isInFolder(folderPath: string): boolean {
    if (!this.folderPath) {
      return false;
    }
    // 精确匹配或前缀匹配（子目录）
    return (
      this.folderPath === folderPath ||
      this.folderPath.startsWith(folderPath + '/')
    );
  }

  /**
   * 检查端点是否有指定标签
   * @param tag 标签
   * @returns 是否包含
   */
  hasTag(tag: string): boolean {
    return this.tags?.includes(tag) ?? false;
  }

  /**
   * 转换为普通对象（用于序列化）
   * @returns 普通对象
   */
  toJSON(): ApiEndpointInterface {
    return {
      path: this.path,
      method: this.method,
      name: this.name,
      description: this.description,
      operationId: this.operationId,
      tags: this.tags,
      deprecated: this.deprecated,
      status: this.status,
      parameters: this.parameters,
      requestBody: this.requestBody,
      responseBody: this.responseBody,
      folderPath: this.folderPath
    };
  }
}

