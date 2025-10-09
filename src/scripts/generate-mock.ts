import { logger } from '../utils/logger.js'
import { loadConfig } from '../core/config-loader.js'
import { fetchOpenAPIFromApifox } from '../core/apifox-client.js'
import { convertOpenAPIToEndpoints } from '../core/openapi-converter.js'
import { filterEndpoints } from '../core/endpoint-filter.js'
import { generateMockFiles } from '../generators/mock-generator.js'
import { generateTypeFiles } from '../generators/type-generator.js'

/**
 * 主函数
 */
async function main() {
  try {
    logger.title('🚀 开始生成 Mock 数据和 TypeScript 类型...')

    const config = await loadConfig()

    // 从 Apifox 拉取 OpenAPI 数据（直接在内存中处理）
    const openapi = await fetchOpenAPIFromApifox(config)

    // 转换为端点数据
    const allEndpoints = convertOpenAPIToEndpoints(openapi)
    logger.success(`✓ 解析到 ${allEndpoints.length} 个 API 接口`)

    // 应用客户端筛选
    const endpoints = filterEndpoints(allEndpoints, config.apiFilter)

    if (config.apiFilter) {
      const filteredCount = allEndpoints.length - endpoints.length
      if (filteredCount > 0) {
        logger.info(`  应用客户端筛选规则，过滤掉 ${filteredCount} 个接口`)
      }
      logger.success(`✓ 保留 ${endpoints.length} 个接口用于生成`)
    }

    if (endpoints.length === 0) {
      logger.warn('没有匹配的 API 接口，请检查筛选规则配置')
      return
    }

    // 生成 Mock 文件
    await generateMockFiles(config, endpoints, openapi.components?.schemas)

    // 生成类型文件
    await generateTypeFiles(config, openapi, endpoints)

    logger.success('\n✨ 所有文件生成完成！')

  } catch (error) {
    // 避免重复显示错误信息
    if (error instanceof Error && !error.message.includes('网络连接失败') && !error.message.includes('API 请求失败')) {
      logger.error('生成失败')
      console.error(error)
    }
    process.exit(1)
  }
}

main()
