import axios from 'axios';
import type { IApifoxClient, IHttpClient, ILogger, IFileSystem } from '../../domain/interfaces.js';
import type { ApifoxConfig } from '../../types/index.js';
import type { OpenAPIDocument } from '../../types/openapi.js';
import { NetworkError, ApifoxApiError } from '../../core/errors.js';
import { ERROR_CODES } from '../../core/error-codes.js';
import { saveOpenAPIData } from '../../utils/file-utils.js';

/**
 * Apifox API 请求体类型
 */
interface ApifoxExportRequestBody {
  oasVersion: string;
  exportFormat: 'JSON' | 'YAML';
  branchId?: number;
  scope?: {
    type: 'ALL';
    includedByTags?: string[];
    folderPaths?: string[];
  };
  options?: {
    includeApifoxExtensionProperties?: boolean;
    addFoldersToTags?: boolean;
  };
}

/**
 * Apifox 客户端实现
 */
export class ApifoxClientImpl implements IApifoxClient {
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly logger: ILogger,
    private readonly fileSystem?: IFileSystem
  ) {}

  async fetchOpenAPI(config: ApifoxConfig): Promise<OpenAPIDocument> {
    this.logger.info('从 Apifox 拉取 API 数据...');

    try {
      const baseUrl = config.apiUrl || 'https://api.apifox.com';
      const apiUrl = `${baseUrl}/v1/projects/${config.projectId}/export-openapi?locale=zh-CN`;

      // 构建请求体
      const requestBody = this.buildRequestBody(config);

      // 发送请求
      const response = await this.httpClient.post<OpenAPIDocument>(apiUrl, requestBody, {
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          'X-Apifox-Api-Version': '2024-03-28'
        },
        timeout: 30000,
        rejectUnauthorized: false // 忽略 SSL 证书验证
      });

      const endpointCount = Object.keys(response.data.paths || {}).length;
      this.logger.success(
        `✓ 从 Apifox 拉取成功（${endpointCount} 个接口）`
      );

      // 保存 OpenAPI 数据到日志文件（仅在开发环境）
      saveOpenAPIData(response.data, config.projectId);

      return response.data;
    } catch (error) {
      // 如果错误已经被转换为 ApifoxError，直接抛出
      if (error instanceof NetworkError || error instanceof ApifoxApiError) {
        throw error;
      }
      throw this.convertError(error, config);
    }
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(config: ApifoxConfig): ApifoxExportRequestBody {
    const requestBody: ApifoxExportRequestBody = {
      oasVersion: '3.0',
      exportFormat: 'JSON'
    };

    // 添加分支配置
    if (config.branchId) {
      requestBody.branchId = config.branchId;
    }

    // 应用过滤配置
    if (config.apiFilter) {
      if (config.apiFilter.scope) {
        const scope: ApifoxExportRequestBody['scope'] = {
          type: 'ALL'
        };

        if (
          config.apiFilter.scope.includedByTags &&
          config.apiFilter.scope.includedByTags.length > 0
        ) {
          scope.includedByTags = config.apiFilter.scope.includedByTags;
        }
        if (
          config.apiFilter.scope.folderPaths &&
          config.apiFilter.scope.folderPaths.length > 0
        ) {
          scope.folderPaths = config.apiFilter.scope.folderPaths;
        }

        requestBody.scope = scope;
      }

      // 始终启用 Apifox 扩展属性和文件夹标签
      requestBody.options = {
        includeApifoxExtensionProperties: true,
        addFoldersToTags: true
      };
    }

    return requestBody;
  }

  /**
   * 将错误转换为 Apifox 错误类型
   */
  private convertError(
    error: unknown,
    config: ApifoxConfig
  ): NetworkError | ApifoxApiError {
    // 检查是否是 Axios 错误
    if (axios.isAxiosError(error)) {
      // 网络连接失败
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return new NetworkError('网络连接失败，无法连接到 api.apifox.com', {
          code: ERROR_CODES.NETWORK_CONNECTION_FAILED,
          apiUrl: config.apiUrl || 'https://api.apifox.com',
          suggestion: '请检查网络连接或代理设置'
        }, error);
      }

      // 超时错误
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return new NetworkError('请求超时', {
          code: ERROR_CODES.NETWORK_TIMEOUT,
          apiUrl: config.apiUrl || 'https://api.apifox.com',
          timeout: 30000
        }, error);
      }

      // HTTP 响应错误
      if (error.response) {
        const errorData = error.response.data as { errorCode?: string; message?: string };
        const statusCode = error.response.status;

        if (statusCode === 401) {
          return new ApifoxApiError(
            '认证失败: Access Token 无效或已过期',
            statusCode,
            ERROR_CODES.APIFOX_API_AUTH_FAILED,
            {
              code: ERROR_CODES.APIFOX_API_AUTH_FAILED,
              suggestion: '请检查 apifox.config.json 中的 token 配置'
            },
            error
          );
        }

        if (statusCode === 403 && errorData?.errorCode === '403012') {
          return new ApifoxApiError(
            '权限不足: 当前 Access Token 没有「项目维护者」权限',
            statusCode,
            '403012',
            {
              code: ERROR_CODES.APIFOX_API_PERMISSION_DENIED,
              apiErrorCode: '403012',
              suggestion: '请在 Apifox 中更新 Token 权限'
            },
            error
          );
        }

        return new ApifoxApiError(
          `API 请求失败 (HTTP ${statusCode})`,
          statusCode,
          errorData?.errorCode,
          {
            code: ERROR_CODES.APIFOX_API_REQUEST_FAILED,
            statusCode,
            apiErrorCode: errorData?.errorCode,
            message: errorData?.message
          },
          error
        );
      }
    }

    // 其他类型的错误，转换为网络错误
    return new NetworkError(
      '从 Apifox 拉取 API 数据失败',
      {
        code: ERROR_CODES.NETWORK_CONNECTION_FAILED,
        originalError: error instanceof Error ? error.message : '未知错误'
      },
      error instanceof Error ? error : undefined
    );
  }
}
