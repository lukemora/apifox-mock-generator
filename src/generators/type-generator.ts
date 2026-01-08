import path from 'path';
import { fileHelper } from '../utils/file-helper.js';
import { logger } from '../infrastructure/logger/console-logger.impl.js';
import { groupEndpointsByPath } from '../utils/path-utils.js';
import { generateNamespaceContent } from './templates/type-template.js';
import type { ApifoxConfig, ApiEndpoint } from '../types/index.js';
import type { OpenAPIDocument } from '../types/openapi.js';

/**
 * 生成 TypeScript 类型文件
 */
export async function generateTypeFiles(
  config: ApifoxConfig,
  openapi: OpenAPIDocument,
  endpoints: ApiEndpoint[]
): Promise<void> {
  logger.title('生成 TypeScript 类型文件...');

  await fileHelper.ensureDir(config.typesDir);

  const schemas = openapi.components?.schemas || {};

  // 建立schema名称映射关系，处理URL编码的引用
  const schemaNameMap = new Map<string, string>();
  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    // 将URL编码的名称映射到实际名称
    const encodedName = encodeURIComponent(schemaName);

    // 将中文schema名称转换为合适的TypeScript类型名称
    let tsTypeName = schemaName;
    if (/[\u4e00-\u9fff]/.test(schemaName)) {
      // 如果是中文名称，提取括号中的英文部分或生成合适的名称
      const match = schemaName.match(/（对应后端的(.+?）)/);
      if (match) {
        tsTypeName = match[1].replace('）', '');
      } else {
        // 如果没有英文部分，生成一个合适的名称
        tsTypeName =
          schemaName.replace(/[^\u4e00-\u9fff\w]/g, '').replace(/[\u4e00-\u9fff]/g, '') || 'Schema';
      }
    }

    schemaNameMap.set(encodedName, tsTypeName);
    // 也保留原始名称的映射
    schemaNameMap.set(schemaName, tsTypeName);
  }

  let generatedCount = 0;

  // 按资源路径分组接口，使用增量更新
  const groupedEndpoints = groupEndpointsByPath(endpoints);

  for (const [groupPath, groupEndpoints] of Object.entries(groupedEndpoints)) {
    const typeFilePath = path.join(config.typesDir, `${groupPath}.ts`);

    // 为每个接口生成类型定义块
    for (const endpoint of groupEndpoints) {
      const typeContent = generateNamespaceContent(endpoint, schemas, schemaNameMap);
      const blockIdentifier = `${endpoint.path}[${endpoint.method}]`;

      // 使用增量更新，支持多个接口在同一文件
      await fileHelper.updateFileWithBlock(typeFilePath, typeContent, blockIdentifier);
      generatedCount++;
    }

    logger.info(`  ✓ ${typeFilePath} (${groupEndpoints.length} 个接口)`);
  }

  logger.success(`\n类型文件生成完成！`);
  logger.info(`共生成 ${generatedCount} 个接口类型`);
}
