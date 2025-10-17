import { formatCode } from './code-formatter.js';
import { updateFileWithBlock } from './block-updater.js';
import {
  ensureDir,
  readFile,
  writeFile as writeFileRaw,
  readJson,
  writeJson,
  exists,
  getProjectRoot
} from './file-operations.js';

/**
 * 文件助手工具集
 */
export const fileHelper = {
  ensureDir,
  readFile,
  readJson,
  writeJson,
  exists,
  getProjectRoot,
  formatCode,
  updateFileWithBlock,

  /**
   * 写入文件（自动格式化）
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // 自动格式化代码
    const formattedContent = await formatCode(content, filePath);
    await writeFileRaw(filePath, formattedContent);
  }
};
