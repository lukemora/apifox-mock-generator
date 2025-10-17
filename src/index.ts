// 主入口文件 - 导出公共 API
export * from './types/index.js';
export * from './utils/logger.js';

// 版本信息 - 从 package.json 读取
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
export const version = pkg.version;
