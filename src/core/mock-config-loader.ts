import path from 'path';
import { fileHelper } from '../utils/file-helper.js';
import { ConfigError } from './errors.js';
import { ERROR_CODES } from './error-codes.js';

/**
 * Mock 配置接口
 */
export interface MockConfig {
  // 工作模式
  model: 'proxy' | 'mock';

  // HTTPS 配置
  https: boolean;

  // 服务器配置
  port: number;

  // 目标服务器
  target: string;

  // 远程目标支持
  remoteTarget: boolean;

  // 需要从请求路径中去掉的前缀（例如 VITE_API_BASE_URL = '/api' 时），单项目通常只配置一个
  pathPrefixes?: string | string[];

  // 可选：按路由粒度控制模式（无需在 mock 文件里写 check 函数）
  // 优先级：URL 参数 > mockRoutes/proxyRoutes > model
  /** 需要强制使用 Mock 的路由，匹配 path 或 "METHOD path"，如：'/auth/login' 或 'POST /auth/login' */
  mockRoutes?: string[];
  /** 需要强制使用 Proxy 的路由，匹配 path 或 "METHOD path"，如：'/user/info' 或 'GET /user/info' */
  proxyRoutes?: string[];
}

/**
 * 加载 Mock 配置文件
 */
export async function loadMockConfig(): Promise<MockConfig> {
  const projectRoot = fileHelper.getProjectRoot();
  const jsConfigPath = path.join(projectRoot, 'mock.config.js');

  if (!(await fileHelper.exists(jsConfigPath))) {
    throw new ConfigError('未找到 mock.config.js 配置文件', {
      code: ERROR_CODES.CONFIG_FILE_NOT_FOUND,
      path: jsConfigPath,
      suggestion: '请先运行 npm run generate 生成 Mock 文件'
    });
  }

  try {
    // 动态导入 JS 配置文件
    const jsConfigUrl = jsConfigPath.startsWith('/')
      ? `file://${jsConfigPath}`
      : `file:///${jsConfigPath.replace(/\\/g, '/')}`;

    const configModule = await import(jsConfigUrl);
    const config = configModule.default || configModule;

    if (typeof config !== 'object' || config === null) {
      throw new ConfigError('Mock 配置文件必须导出对象', {
        code: ERROR_CODES.CONFIG_INVALID_FORMAT,
        path: jsConfigPath
      });
    }

    return config as MockConfig;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError('Mock 配置加载失败', {
      code: ERROR_CODES.CONFIG_INVALID_FORMAT,
      path: jsConfigPath,
      originalError: error instanceof Error ? error.message : '未知错误'
    }, error instanceof Error ? error : undefined);
  }
}
