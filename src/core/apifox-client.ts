import axios from 'axios';
import * as https from 'https';
import { logger } from '../utils/logger.js';
import { saveOpenAPIData } from '../utils/file-utils.js';
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
    handleApifoxError(error);
    throw error;
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
 * 处理 Apifox API 错误
 */
function handleApifoxError(error: unknown): void {
  // 网络连接错误处理
  if (axios.isAxiosError(error)) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      logger.errorSimple('网络连接失败，无法连接到 api.apifox.com');
      logger.info('请检查网络连接或代理设置');
      return;
    }

    if (error.response) {
      const errorData = error.response.data as { errorCode?: string; message?: string };

      if (error.response.status === 403 && errorData?.errorCode === '403012') {
        logger.errorSimple('权限不足: 当前 Access Token 没有「项目维护者」权限');
        logger.info('请在 Apifox 中更新 Token 权限');
      } else if (error.response.status === 401) {
        logger.errorSimple('认证失败: Access Token 无效或已过期');
        logger.info('请检查 apifox.config.json 中的 token 配置');
      } else {
        logger.errorSimple(`API 请求失败 (HTTP ${error.response.status})`);
        if (errorData?.message) {
          logger.info(`错误详情: ${errorData.message}`);
        }
      }
      return;
    }
  }

  // 其他类型的错误
  logger.errorSimple('从 Apifox 拉取 API 数据失败');
  if (error instanceof Error && !axios.isAxiosError(error)) {
    logger.info(error.message);
  }
}
