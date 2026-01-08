import { formatCode } from './code-formatter.js';
import { updateFileWithBlock } from './block-updater.js';
import { FileSystemImpl } from '../infrastructure/file-system/file-system.impl.js';

// 创建单例实例
const fileSystem = new FileSystemImpl();

/**
 * 文件助手工具集
 * 基于 FileSystemImpl，添加代码格式化和增量更新功能
 */
export const fileHelper = {
  ensureDir: (path: string) => fileSystem.ensureDir(path),
  readFile: (path: string) => fileSystem.readFile(path),
  readJson: <T>(path: string) => fileSystem.readJson<T>(path),
  writeJson: (path: string, data: unknown) => fileSystem.writeJson(path, data),
  exists: (path: string) => fileSystem.exists(path),
  getProjectRoot: () => fileSystem.getProjectRoot(),
  formatCode,
  updateFileWithBlock,

  /**
   * 写入文件（自动格式化）
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // 自动格式化代码
    const formattedContent = await formatCode(content, filePath);
    await fileSystem.writeFile(filePath, formattedContent);
  }
};
