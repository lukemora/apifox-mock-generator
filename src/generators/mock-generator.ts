import path from 'path';
import { fileHelper } from '../utils/file-helper.js';
import { logger } from '../utils/logger.js';
import { groupEndpointsByPath } from '../utils/path-utils.js';
import { generateMockEndpointContent } from './templates/mock-template.js';
import {
  generateFileArchitecture,
  hasFileArchitecture,
  deduplicateImports
} from './templates/file-architecture.js';
import type { ApifoxConfig, ApiEndpoint } from '../types/index.js';

/**
 * 生成 Mock 文件（两步模式：先架构，后接口）
 */
export async function generateMockFiles(
  config: ApifoxConfig,
  endpoints: ApiEndpoint[],
  definitions?: any
): Promise<void> {
  logger.title('生成 Mock 文件...');

  await fileHelper.ensureDir(config.mockDir);

  let generatedCount = 0;

  // 按资源路径分组接口，使用增量更新
  const groupedEndpoints = groupEndpointsByPath(endpoints);

  for (const [groupPath, groupEndpoints] of Object.entries(groupedEndpoints)) {
    const mockFilePath = path.join(config.mockDir, `${groupPath}.js`);

    // 确保文件所在目录存在
    const fileDir = path.dirname(mockFilePath);
    await fileHelper.ensureDir(fileDir);

    // 第一步：检查并生成文件架构（如果文件不存在或没有基础架构）
    await ensureFileArchitecture(mockFilePath);

    // 第二步：为每个接口生成 mock 定义块
    for (const endpoint of groupEndpoints) {
      const mockContent = generateMockEndpointContent(endpoint, definitions);
      const blockIdentifier = `${endpoint.path}[${endpoint.method}]`;

      // 使用增量更新，支持多个接口在同一文件
      await fileHelper.updateFileWithBlock(mockFilePath, mockContent, blockIdentifier);
      generatedCount++;
    }

    logger.info(`  ✓ ${mockFilePath} (${groupEndpoints.length} 个接口)`);
  }

  logger.success(`\nMock 文件生成完成！`);
  logger.info(`共生成 ${generatedCount} 个接口的 Mock 数据（动态 Mock.js）`);
}

/**
 * 确保文件有基础架构（import 语句等）
 */
async function ensureFileArchitecture(filePath: string): Promise<void> {
  const { exists, readFile } = await import('../utils/file-operations.js');

  if (!(await exists(filePath))) {
    // 文件不存在，创建基础架构
    const architecture = generateFileArchitecture();
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, architecture, 'utf-8');
    return;
  }

  // 文件存在，先清理重复的 import 语句
  let content = await readFile(filePath);
  content = deduplicateImports(content);

  // 检查是否有基础架构
  if (!hasFileArchitecture(content)) {
    // 检查是否已有部分 import 语句，避免重复添加
    const hasMockImport = content.includes('import Mock from "mockjs"');
    const hasLodashImport = content.includes('import lodash from "lodash"');
    const hasInsertFlag = content.includes('//[insert-flag]');

    let updatedContent = content;

    // 如果没有 Mock import，添加它
    if (!hasMockImport) {
      updatedContent = 'import Mock from "mockjs";\n' + updatedContent;
    }

    // 如果没有 lodash import，添加它
    if (!hasLodashImport) {
      updatedContent = 'import lodash from "lodash";\n' + updatedContent;
    }

    // 如果没有 insert-flag，在文件末尾添加
    if (!hasInsertFlag) {
      updatedContent = updatedContent.trim() + '\n\n//[insert-flag]\n';
    }

    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, updatedContent, 'utf-8');
  } else {
    // 即使有基础架构，也要清理重复的 import
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, content, 'utf-8');
  }
}
