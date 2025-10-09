import path from 'path'
import { fileHelper } from '../utils/file-helper.js'
import { logger } from '../utils/logger.js'
import { groupEndpointsByPath } from '../utils/path-utils.js'
import { generateEndpointTypeFile } from './templates/type-template.js'
import type { ApifoxConfig, ApiEndpoint } from '../types/index.js'

/**
 * 生成 TypeScript 类型文件
 */
export async function generateTypeFiles(config: ApifoxConfig, openapi: any, endpoints: ApiEndpoint[]): Promise<void> {
  logger.title('生成 TypeScript 类型文件...')

  await fileHelper.ensureDir(config.typesDir)

  const schemas = openapi.components?.schemas || {}
  let generatedCount = 0

  // 按资源路径分组接口，使用增量更新
  const groupedEndpoints = groupEndpointsByPath(endpoints)

  for (const [groupPath, groupEndpoints] of Object.entries(groupedEndpoints)) {
    const typeFilePath = path.join(config.typesDir, `${groupPath}.ts`)

    // 为每个接口生成类型定义块
    for (const endpoint of groupEndpoints) {
      const typeContent = generateEndpointTypeFile(endpoint, schemas)
      const blockIdentifier = `${endpoint.path}[${endpoint.method}]`

      // 使用增量更新，支持多个接口在同一文件
      await fileHelper.updateFileWithBlock(typeFilePath, typeContent, blockIdentifier)
      generatedCount++
    }

    logger.info(`  ✓ ${typeFilePath} (${groupEndpoints.length} 个接口)`)
  }

  logger.success(`\n类型文件生成完成！`)
  logger.info(`共生成 ${generatedCount} 个接口类型`)
}

