import path from 'path'
import { fileHelper } from '../utils/file-helper.js'
import { logger } from '../utils/logger.js'
import { groupEndpointsByPath } from '../utils/path-utils.js'
import { generateMockFileContent } from './templates/mock-template.js'
import type { ApifoxConfig, ApiEndpoint } from '../types/index.js'

/**
 * 生成 Mock 文件
 */
export async function generateMockFiles(config: ApifoxConfig, endpoints: ApiEndpoint[], definitions?: any): Promise<void> {
  logger.title('生成 Mock 文件...')

  await fileHelper.ensureDir(config.mockDir)

  let generatedCount = 0

  // 按资源路径分组接口，使用增量更新
  const groupedEndpoints = groupEndpointsByPath(endpoints)

  for (const [groupPath, groupEndpoints] of Object.entries(groupedEndpoints)) {
    const mockFilePath = path.join(config.mockDir, `${groupPath}.js`)

    // 为每个接口生成 mock 定义块
    for (const endpoint of groupEndpoints) {
      const mockContent = generateMockFileContent(endpoint, definitions)
      const blockIdentifier = `${endpoint.path}[${endpoint.method}]`

      // 使用增量更新，支持多个接口在同一文件
      await fileHelper.updateFileWithBlock(mockFilePath, mockContent, blockIdentifier)
      generatedCount++
    }

    logger.info(`  ✓ ${mockFilePath} (${groupEndpoints.length} 个接口)`)
  }

  logger.success(`\nMock 文件生成完成！`)
  logger.info(`共生成 ${generatedCount} 个接口的 Mock 数据（动态 Mock.js）`)
}

