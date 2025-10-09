import path from 'path'
import express from 'express'
import { pathToFileURL } from 'url'
import { glob } from 'glob'
import { fileHelper } from '../utils/file-helper.js'
import { logger } from '../utils/logger.js'
import type { ApifoxConfig, MockRoute } from '../types/index.js'

/**
 * 模块缓存映射
 */
const moduleCache = new Map<string, number>()

/**
 * 动态扫描并加载所有 Mock 文件
 */
export async function loadMockRoutes(config: ApifoxConfig): Promise<MockRoute[]> {
  const mockDir = path.resolve(config.mockDir)

  // 检查 mock 目录是否存在
  if (!await fileHelper.exists(mockDir)) {
    logger.error('未找到 Mock 目录')
    logger.info('请先运行 npm run generate 生成 Mock 文件')
    process.exit(1)
  }

  // 扫描所有 mock 文件（排除 index.js）
  const pattern = path.join(mockDir, '**', '*.js').replace(/\\/g, '/')
  const mockFiles = await glob(pattern, {
    ignore: ['**/index.js', '**/node_modules/**']
  })

  if (mockFiles.length === 0) {
    logger.error('未找到任何 Mock 文件')
    logger.info('请先运行 npm run generate 生成 Mock 文件')
    process.exit(1)
  }

  const routes: MockRoute[] = []

  // 逐个加载 mock 文件
  for (const filePath of mockFiles) {
    try {
      // 将路径转换为 file:// URL 格式
      const fileUrl = pathToFileURL(filePath).href
      const mockModule = await import(fileUrl)

      // 读取文件内容，提取路由信息
      const fileContent = await fileHelper.readFile(filePath)
      const routeInfo = extractRouteInfo(fileContent)

      if (!routeInfo) {
        logger.warn(`无法从 ${path.relative(mockDir, filePath)} 提取路由信息，跳过`)
        continue
      }

      // 获取导出的函数（尝试不同的导出方式）
      const handlerFunction = mockModule.default ||
        Object.values(mockModule).find(exp => typeof exp === 'function' && exp.name)

      if (!handlerFunction || typeof handlerFunction !== 'function') {
        logger.warn(`${path.relative(mockDir, filePath)} 未找到有效的处理函数，跳过`)
        continue
      }

      routes.push({
        path: routeInfo.path,
        method: routeInfo.method,
        response: (req: express.Request) => {
          // 调用 mock 函数，传递 query, body, ctx
          return handlerFunction(req.query, req.body, { req })
        }
      })

      logger.debug(`加载路由: ${routeInfo.method} ${routeInfo.path}`)
    } catch (error) {
      logger.error(`加载 Mock 文件失败: ${filePath}`)
      console.error(error)
    }
  }

  return routes
}

/**
 * 加载单个 Mock 文件的路由
 */
export async function loadRouteFromFile(filePath: string, mockDir: string): Promise<{ key: string; route: MockRoute } | null> {
  try {
    const fileUrl = pathToFileURL(path.resolve(filePath)).href

    // 读取文件内容，提取路由信息
    const fileContent = await fileHelper.readFile(filePath)
    const routeInfo = extractRouteInfo(fileContent)

    if (!routeInfo) {
      return null
    }

    // 使用版本号破坏缓存
    const version = (moduleCache.get(filePath) || 0) + 1
    moduleCache.set(filePath, version)

    // 动态导入模块（带版本号避免缓存）
    const mockModule = await import(fileUrl + `?v=${version}&t=${Date.now()}`)

    // 获取导出的函数
    const handlerFunction = mockModule.default ||
      Object.values(mockModule).find(exp => typeof exp === 'function' && exp.name)

    if (!handlerFunction || typeof handlerFunction !== 'function') {
      return null
    }

    const key = `${routeInfo.method} ${routeInfo.path}`
    const route: MockRoute = {
      path: routeInfo.path,
      method: routeInfo.method,
      response: (req: express.Request) => {
        // 每次请求时都重新读取文件并导入最新版本
        return (async () => {
          try {
            const latestVersion = moduleCache.get(filePath) || version
            const latestModule = await import(fileUrl + `?v=${latestVersion}&t=${Date.now()}`)
            const latestHandler = latestModule.default ||
              Object.values(latestModule).find(exp => typeof exp === 'function' && exp.name)

            if (latestHandler && typeof latestHandler === 'function') {
              return latestHandler(req.query, req.body, { req })
            }

            return handlerFunction(req.query, req.body, { req })
          } catch (err) {
            // 失败时使用原始函数
            return handlerFunction(req.query, req.body, { req })
          }
        })()
      }
    }

    return { key, route }
  } catch (error) {
    logger.error(`加载 Mock 文件失败: ${filePath}`)
    console.error(error)
    return null
  }
}

/**
 * 从文件内容中提取路由信息
 */
function extractRouteInfo(fileContent: string): { path: string; method: string } | null {
  // 匹配 //[start]/path[METHOD] 格式
  const startMatch = fileContent.match(/\/\/\[start\](.+?)\[(\w+)\]/)

  if (startMatch) {
    return {
      path: startMatch[1],
      method: startMatch[2]
    }
  }

  // 匹配注释中的 @apiURI 和 @apiRequestType
  const pathMatch = fileContent.match(/@apiURI\s+(.+)/m)
  const methodMatch = fileContent.match(/@apiRequestType\s+(\w+)/m)

  if (pathMatch && methodMatch) {
    return {
      path: pathMatch[1].trim(),
      method: methodMatch[1].trim()
    }
  }

  return null
}

