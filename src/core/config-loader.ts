import path from 'path';
import { fileHelper } from '../utils/file-helper.js';
import { logger } from '../utils/logger.js';
import type { ApifoxConfig } from '../types/index.js';

/**
 * 加载配置文件
 */
export async function loadConfig(): Promise<ApifoxConfig> {
  const configPath = path.join(fileHelper.getProjectRoot(), 'apifox.config.json');

  if (!(await fileHelper.exists(configPath))) {
    logger.error('未找到 apifox.config.json 配置文件');
    logger.info('请在项目根目录创建配置文件');
    process.exit(1);
  }

  return await fileHelper.readJson<ApifoxConfig>(configPath);
}
