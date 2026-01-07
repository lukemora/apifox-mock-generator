import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import type { OpenAPIDocument } from '../types/openapi.js';

/**
 * 检查是否作为 npm 依赖被使用
 * 如果在 node_modules 中运行，说明是作为依赖使用的
 */
function isRunningAsNpmDependency(): boolean {
  const currentPath = fileURLToPath(import.meta.url);
  return currentPath.includes('node_modules');
}

/**
 * 保存 OpenAPI 数据到日志文件
 * 只在本地开发环境（非 npm 依赖模式）下生成
 * @param openapiData OpenAPI 数据
 * @param projectId 项目 ID
 */
export function saveOpenAPIData(openapiData: OpenAPIDocument, projectId: string): void {
  // 如果作为 npm 依赖使用，不生成日志文件
  if (isRunningAsNpmDependency()) {
    return;
  }

  try {
    // 创建日志目录
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 生成时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `openapi-${projectId}-${timestamp}.json`;
    const filepath = path.join(logDir, filename);

    // 保存数据
    fs.writeFileSync(filepath, JSON.stringify(openapiData, null, 2), 'utf8');

    logger.info(`📁 OpenAPI 数据已保存到: ${filepath}`);
  } catch (error) {
    logger.warn(`⚠ 保存 OpenAPI 数据失败: ${error}`);
  }
}

/**
 * 保存调试数据到日志文件
 * 只在本地开发环境（非 npm 依赖模式）下生成
 * @param data 调试数据
 * @param filename 文件名
 */
export function saveDebugData(data: unknown, filename: string): void {
  // 如果作为 npm 依赖使用，不生成日志文件
  if (isRunningAsNpmDependency()) {
    return;
  }

  try {
    // 创建日志目录
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const filepath = path.join(logDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');

    logger.info(`📁 调试数据已保存到: ${filepath}`);
  } catch (error) {
    logger.warn(`⚠ 保存调试数据失败: ${error}`);
  }
}
