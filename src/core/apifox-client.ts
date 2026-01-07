import axios from 'axios';
import * as https from 'https';
import { logger } from '../utils/logger.js';
import { saveOpenAPIData } from '../utils/file-utils.js';
import { NetworkError, ApifoxApiError } from './errors.js';
import { ERROR_CODES } from './error-codes.js';
import type { ApifoxConfig } from '../types/index.js';
import type { OpenAPIDocument } from '../types/openapi.js';

/**
 * 从 Apifox 拉取 OpenAPI 数据
 */
export async function fetchOpenAPIFromApifox(config: ApifoxConfig): Promise<OpenAPIDocument> {
  logger.info('从 Apifox 拉取 API 数据...');

  try {
    const baseUrl = config.apiUrl || 'https://api.apifox.com';
    const apiUrl = `${baseUrl}/v1/projects/${config.projectId}/export-openapi?locale=zh-CN`;

    // 构建请求体
    const requestBody = buildRequestBody(config);

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-Apifox-Api-Version': '2024-03-28'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 30000
    });

    logger.success(
      `✓ 从 Apifox 拉取成功（${Object.keys(response.data.paths || {}).length} 个接口）`
    );

    // 保存 OpenAPI 数据到日志文件（仅在开发环境）
    saveOpenAPIData(response.data, config.projectId);

    return response.data as OpenAPIDocument;
  } catch (error) {
    throw convertToApifoxError(error, config);
  }
}

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
 * 构建请求体
 */
function buildRequestBody(config: ApifoxConfig): ApifoxExportRequestBody {
  const requestBody: ApifoxExportRequestBody = {
    oasVersion: '3.0',
    exportFormat: 'JSON'
  };

  // 添加分支配置（默认为 main）
  if (config.branchId) {
    requestBody.branchId = config.branchId;
  }

  // 应用过滤配置
  if (config.apiFilter) {
    if (config.apiFilter.scope) {
      const scope: ApifoxExportRequestBody['scope'] = {
        // 写死为 ALL，导出所有接口，通过其他过滤条件进行筛选
        type: 'ALL'
      };

      if (
        config.apiFilter.scope.includedByTags &&
        config.apiFilter.scope.includedByTags.length > 0
      ) {
        scope.includedByTags = config.apiFilter.scope.includedByTags;
      }
      if (config.apiFilter.scope.folderPaths && config.apiFilter.scope.folderPaths.length > 0) {
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
function convertToApifoxError(error: unknown, config: ApifoxConfig): NetworkError | ApifoxApiError {
  // 网络连接错误处理
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
