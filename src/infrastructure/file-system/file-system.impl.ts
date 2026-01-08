import fs from 'fs/promises';
import path from 'path';
import type { IFileSystem } from '../../domain/interfaces.js';

/**
 * 文件系统实现
 * 基于 Node.js fs/promises
 */
export class FileSystemImpl implements IFileSystem {
  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async readJson<T>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    return JSON.parse(content) as T;
  }

  async writeJson(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await this.writeFile(filePath, content);
  }

  getProjectRoot(): string {
    return process.cwd();
  }
}

