#!/usr/bin/env node

import { logger } from '../infrastructure/logger/console-logger.impl.js';

const command = process.argv[2];

switch (command) {
  case 'generate':
    await import('./generate-mock.js');
    break;
  case 'serve':
    await import('./serve-mock.js');
    break;
  case 'dev':
    logger.info('启动开发模式...');
    await import('./generate-mock.js');
    await import('./serve-mock.js');
    break;
  default:
    console.log(`
Apifox Mock Generator v1.0.0

用法:
  apifox-mock generate    生成 Mock 和类型文件
  apifox-mock serve       启动 Mock 服务器
  apifox-mock dev         开发模式（生成 + 服务器）

`);
    process.exit(command ? 1 : 0);
}
