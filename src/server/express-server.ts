import express from 'express'
import cors from 'cors'
import { logger } from '../utils/logger.js'
import { findMatchingRoute, extractPathParams } from './route-matcher.js'
import { validateRequest } from './validation.js'
import type { RouteManager } from './route-manager.js'

/**
 * 设置 Mock 服务器
 */
export function setupMockServer(routeManager: RouteManager): express.Application {
  const app = express()

  // 中间件
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // 请求日志中间件
  app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString()
    logger.info(`[${timestamp}] ${req.method} ${req.path}`)
    next()
  })

  // 动态路由处理中间件
  app.use(async (req, res, next) => {
    // 尝试匹配路由
    const route = findMatchingRoute(routeManager.getAllRoutes(), req.method, req.path)

    if (!route) {
      return next() // 继续到 404 处理
    }

    // 提取路径参数
    const params = extractPathParams(route.path, req.path)
    req.params = params

    // 参数校验
    if ((route as any).validation) {
      const validationError = validateRequest(req, (route as any).validation)
      if (validationError) {
        res.status(400).json({
          code: 400,
          message: '参数校验失败',
          error: validationError
        })
        logger.error(`${route.method} ${route.path} -> 400 (参数校验失败: ${validationError})`)
        return
      }
    }

    try {
      // 判断 response 是函数还是静态数据
      let responseData = typeof route.response === 'function'
        ? route.response(req)  // 动态生成数据
        : route.response        // 静态数据

      // 处理 Promise
      if (responseData && typeof responseData.then === 'function') {
        responseData = await responseData
      }

      // 返回 Mock 数据
      res.status(route.status || 200).json(responseData)

      logger.success(`${route.method} ${route.path} -> ${route.status || 200}`)
    } catch (error) {
      logger.error(`${route.method} ${route.path} -> 500 (${error instanceof Error ? error.message : '未知错误'})`)
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  })

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      code: 404,
      message: 'API not found',
      data: null
    })
  })

  // 错误处理
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`服务器错误: ${err.message}`)
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      data: null
    })
  })

  return app
}

