import * as fs from 'fs'
import * as path from 'path'
import { logger } from './logger.js'

/**
 * 保存 OpenAPI 数据到日志文件
 */
export function saveOpenAPIData(openapiData: any, projectId: string): void {
  try {
    // 创建日志目录
    const logDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    // 生成时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `openapi-${projectId}-${timestamp}.json`
    const filepath = path.join(logDir, filename)

    // 保存数据
    fs.writeFileSync(filepath, JSON.stringify(openapiData, null, 2), 'utf8')

    logger.info(`📁 OpenAPI 数据已保存到: ${filepath}`)
  } catch (error) {
    logger.warn(`⚠ 保存 OpenAPI 数据失败: ${error}`)
  }
}

/**
 * 保存调试数据到日志文件
 */
export function saveDebugData(data: any, filename: string): void {
  try {
    // 创建日志目录
    const logDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const filepath = path.join(logDir, filename)
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8')

    logger.info(`📁 调试数据已保存到: ${filepath}`)
  } catch (error) {
    logger.warn(`⚠ 保存调试数据失败: ${error}`)
  }
}
