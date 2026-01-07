import path from 'path';
import { fileHelper } from '../utils/file-helper.js';
import { ConfigError } from './errors.js';
import { ERROR_CODES } from './error-codes.js';
import type { ApifoxConfig } from '../types/index.js';

/**
 * 加载配置文件
 */
export async function loadConfig(): Promise<ApifoxConfig> {
  const configPath = path.join(fileHelper.getProjectRoot(), 'apifox.config.json');

  if (!(await fileHelper.exists(configPath))) {
    throw new ConfigError('未找到 apifox.config.json 配置文件', {
      code: ERROR_CODES.CONFIG_FILE_NOT_FOUND,
      path: configPath,
      suggestion: '请在项目根目录创建配置文件'
    });
  }

  try {
    return await fileHelper.readJson<ApifoxConfig>(configPath);
  } catch (error) {
    throw new ConfigError('配置文件格式错误', {
      code: ERROR_CODES.CONFIG_INVALID_FORMAT,
      path: configPath,
      originalError: error instanceof Error ? error.message : '未知错误'
    }, error instanceof Error ? error : undefined);
  }
}
