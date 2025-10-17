import path from 'path';
import { fileHelper } from '../utils/file-helper.js';
import { logger } from '../utils/logger.js';

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

  // 路径映射处理函数
  handleMapPath: (req: any) => { relativePath: string; fileName: string };
}

/**
 * 加载 Mock 配置文件
 */
export async function loadMockConfig(): Promise<MockConfig> {
  const projectRoot = fileHelper.getProjectRoot();
  const jsConfigPath = path.join(projectRoot, 'mock.config.js');

  if (!(await fileHelper.exists(jsConfigPath))) {
    logger.error('未找到 mock.config.js 配置文件');
    process.exit(1);
  }

  try {
    // 动态导入 JS 配置文件
    const jsConfigUrl = jsConfigPath.startsWith('/')
      ? `file://${jsConfigPath}`
      : `file:///${jsConfigPath.replace(/\\/g, '/')}`;

    const configModule = await import(jsConfigUrl);
    const config = configModule.default || configModule;

    if (typeof config !== 'object' || config === null) {
      throw new Error('Mock 配置文件必须导出对象');
    }

    return config as MockConfig;
  } catch (error) {
    logger.error(`Mock 配置加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    process.exit(1);
  }
}
