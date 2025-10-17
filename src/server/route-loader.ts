import path from 'path';
import express from 'express';
import { pathToFileURL } from 'url';
import { glob } from 'glob';
import { fileHelper } from '../utils/file-helper.js';
import { logger } from '../utils/logger.js';
import type { ApifoxConfig, MockRoute } from '../types/index.js';
import { RemoteProxy } from './remote-proxy.js';

/**
 * 模块缓存映射
 */
const moduleCache = new Map<string, number>();

/**
 * 动态扫描并加载所有 Mock 文件
 */
export async function loadMockRoutes(config: ApifoxConfig): Promise<MockRoute[]> {
  const mockDir = path.resolve(config.mockDir);

  // 检查 mock 目录是否存在
  if (!(await fileHelper.exists(mockDir))) {
    logger.error('未找到 Mock 目录');
    logger.info('请先运行 npm run generate 生成 Mock 文件');
    process.exit(1);
  }

  // 扫描所有 mock 文件（排除 index.js）
  const pattern = path.join(mockDir, '**', '*.js').replace(/\\/g, '/');
  const mockFiles = await glob(pattern, {
    ignore: ['**/index.js', '**/node_modules/**']
  });

  if (mockFiles.length === 0) {
    logger.error('未找到任何 Mock 文件');
    logger.info('请先运行 npm run generate 生成 Mock 文件');
    process.exit(1);
  }

  const routes: MockRoute[] = [];
  const remoteProxy = new RemoteProxy(config);

  // 逐个加载 mock 文件
  for (const filePath of mockFiles) {
    try {
      // 将路径转换为 file:// URL 格式
      const fileUrl = pathToFileURL(filePath).href;
      const mockModule = await import(fileUrl);

      // 读取文件内容，提取所有路由信息
      const fileContent = await fileHelper.readFile(filePath);
      const routeInfos = extractAllRouteInfo(fileContent);

      if (routeInfos.length === 0) {
        logger.warn(`无法从 ${path.relative(mockDir, filePath)} 提取路由信息，跳过`);
        continue;
      }

      // 为每个路由创建处理函数
      for (const routeInfo of routeInfos) {
        // 根据方法名找到对应的处理函数
        const methodName =
          routeInfo.method.charAt(0).toUpperCase() + routeInfo.method.slice(1).toLowerCase();
        const handlerFunction =
          mockModule[methodName] ||
          mockModule[`${methodName}Role`] || // 尝试 PostRole, GetRole 等
          mockModule.default ||
          Object.values(mockModule).find(exp => typeof exp === 'function' && exp.name);

        if (!handlerFunction || typeof handlerFunction !== 'function') {
          logger.warn(
            `${path.relative(mockDir, filePath)} 未找到方法 ${methodName} 的处理函数，跳过`
          );
          continue;
        }

        routes.push({
          path: routeInfo.path,
          method: routeInfo.method,
          response: async (req: express.Request) => {
            // 检查是否有 check_ 函数
            const checkFunctionName = `check_${methodName}`;
            const checkFunction = mockModule[checkFunctionName];

            if (checkFunction && typeof checkFunction === 'function') {
              const useLocalMock = checkFunction();

              if (useLocalMock) {
                // 使用本地 Mock 数据
                logger.debug(
                  `使用本地 Mock 数据: ${routeInfo.method} ${routeInfo.path}`,
                );
                return handlerFunction(req.query, req.body, { req });
              } else {
                // 使用远程服务器数据
                if (remoteProxy.isRemoteServerConfigured()) {
                  logger.debug(
                    `使用远程服务器数据: ${routeInfo.method} ${routeInfo.path}`,
                  );
                  return remoteProxy.proxyRequest(req);
                } else {
                  logger.warn(
                    `远程服务器未配置，回退到本地 Mock: ${routeInfo.method} ${routeInfo.path}`,
                  );
                  return handlerFunction(req.query, req.body, { req });
                }
              }
            } else {
              // 没有 check_ 函数，直接使用本地 Mock 数据
              logger.debug(
                `未找到 check_ 函数，使用本地 Mock 数据: ${routeInfo.method} ${routeInfo.path}`,
              );
              return handlerFunction(req.query, req.body, { req });
            }
          }
        });

        logger.debug(`加载路由: ${routeInfo.method} ${routeInfo.path}`);
      }
    } catch (error) {
      logger.error(`加载 Mock 文件失败: ${filePath}`);
      console.error(error);
    }
  }

  return routes;
}

/**
 * 加载单个 Mock 文件的路由
 */
export async function loadRouteFromFile(
  filePath: string,
  mockDir: string,
  config: ApifoxConfig,
): Promise<{ key: string; route: MockRoute } | null> {
  try {
    const remoteProxy = new RemoteProxy(config);
    const fileUrl = pathToFileURL(path.resolve(filePath)).href;

    // 读取文件内容，提取路由信息
    const fileContent = await fileHelper.readFile(filePath);
    const routeInfo = extractRouteInfo(fileContent);

    if (!routeInfo) {
      return null;
    }

    // 使用版本号破坏缓存
    const version = (moduleCache.get(filePath) || 0) + 1;
    moduleCache.set(filePath, version);

    // 动态导入模块（带版本号避免缓存）
    const mockModule = await import(fileUrl + `?v=${version}&t=${Date.now()}`);

    // 获取导出的函数
    const handlerFunction =
      mockModule.default ||
      Object.values(mockModule).find(exp => typeof exp === 'function' && exp.name);

    if (!handlerFunction || typeof handlerFunction !== 'function') {
      return null;
    }

    const key = `${routeInfo.method} ${routeInfo.path}`;
    const route: MockRoute = {
      path: routeInfo.path,
      method: routeInfo.method,
      response: (req: express.Request) => {
        // 每次请求时都重新读取文件并导入最新版本
        return (async () => {
          try {
            const latestVersion = moduleCache.get(filePath) || version;
            const latestModule = await import(fileUrl + `?v=${latestVersion}&t=${Date.now()}`);
            const latestHandler =
              latestModule.default ||
              Object.values(latestModule).find(exp => typeof exp === 'function' && exp.name);

            if (!latestHandler || typeof latestHandler !== 'function') {
              return handlerFunction(req.query, req.body, { req });
            }

            // 检查 check_ 函数
            const methodName =
              routeInfo.method.charAt(0).toUpperCase() +
              routeInfo.method.slice(1).toLowerCase();
            const checkFunctionName = `check_${methodName}`;
            const checkFunction = latestModule[checkFunctionName];

            if (checkFunction && typeof checkFunction === 'function') {
              const useLocalMock = checkFunction();

              if (useLocalMock) {
                // 使用本地 Mock 数据
                logger.debug(
                  `热重载 - 使用本地 Mock 数据: ${routeInfo.method} ${routeInfo.path}`,
                );
                return latestHandler(req.query, req.body, { req });
              } else {
                // 使用远程服务器数据
                if (remoteProxy.isRemoteServerConfigured()) {
                  logger.debug(
                    `热重载 - 使用远程服务器数据: ${routeInfo.method} ${routeInfo.path}`,
                  );
                  return remoteProxy.proxyRequest(req);
                } else {
                  logger.warn(
                    `热重载 - 远程服务器未配置，回退到本地 Mock: ${routeInfo.method} ${routeInfo.path}`,
                  );
                  return latestHandler(req.query, req.body, { req });
                }
              }
            } else {
              // 没有 check_ 函数，直接使用本地 Mock 数据
              logger.debug(
                `热重载 - 未找到 check_ 函数，使用本地 Mock 数据: ${routeInfo.method} ${routeInfo.path}`,
              );
              return latestHandler(req.query, req.body, { req });
            }
          } catch (err) {
            // 失败时使用原始函数
            logger.error(
              `热重载失败，使用原始函数: ${err instanceof Error ? err.message : '未知错误'}`,
            );
            return handlerFunction(req.query, req.body, { req });
          }
        })();
      }
    };

    return { key, route };
  } catch (error) {
    logger.error(`加载 Mock 文件失败: ${filePath}`);
    console.error(error);
    return null;
  }
}

/**
 * 从文件内容中提取路由信息
 */
function extractRouteInfo(fileContent: string): { path: string; method: string } | null {
  // 匹配 //[start]/path[METHOD] 格式
  const startMatch = fileContent.match(/\/\/\[start\](.+?)\[(\w+)\]/);

  if (startMatch) {
    return {
      path: startMatch[1],
      method: startMatch[2]
    };
  }

  // 匹配注释中的 @apiURI 和 @apiRequestType
  const pathMatch = fileContent.match(/@apiURI\s+(.+)/m);
  const methodMatch = fileContent.match(/@apiRequestType\s+(\w+)/m);

  if (pathMatch && methodMatch) {
    return {
      path: pathMatch[1].trim(),
      method: methodMatch[1].trim()
    };
  }

  return null;
}

/**
 * 从文件内容中提取所有路由信息
 */
function extractAllRouteInfo(fileContent: string): { path: string; method: string }[] {
  const routes: { path: string; method: string }[] = [];

  // 匹配所有 //[start]/path[METHOD] 格式
  const startMatches = fileContent.matchAll(/\/\/\[start\](.+?)\[(\w+)\]/g);

  for (const match of startMatches) {
    routes.push({
      path: match[1],
      method: match[2]
    });
  }

  // 如果没有找到 [start] 格式，尝试匹配注释中的 @apiURI 和 @apiRequestType
  if (routes.length === 0) {
    const pathMatches = fileContent.matchAll(/@apiURI\s+(.+)/gm);
    const methodMatches = fileContent.matchAll(/@apiRequestType\s+(\w+)/gm);

    const paths = Array.from(pathMatches).map(m => m[1].trim());
    const methods = Array.from(methodMatches).map(m => m[1].trim());

    for (let i = 0; i < Math.min(paths.length, methods.length); i++) {
      routes.push({
        path: paths[i],
        method: methods[i]
      });
    }
  }

  return routes;
}
