import chalk from 'chalk';
import type { ILogger } from '../../domain/interfaces.js';

/**
 * 控制台日志实现
 * 基于 chalk 库提供彩色输出
 */
export class ConsoleLoggerImpl implements ILogger {
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🐛'), message);
    }
  }

  title(message: string): void {
    console.log('\n' + chalk.bold.cyan(message));
  }
}

// 默认控制台 logger 实例
export const logger = new ConsoleLoggerImpl();

