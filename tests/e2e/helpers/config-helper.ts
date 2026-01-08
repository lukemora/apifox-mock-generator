/**
 * 配置文件测试辅助工具
 * 用于管理默认配置和临时配置
 */

import { fileHelper } from '../../../src/utils/file-helper.js';
import type { ApifoxConfig } from '../../../src/types/index.js';
import type { MockConfig } from '../../../src/core/mock-config-loader.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 默认的 apifox.config.json 配置
 */
export const DEFAULT_APIFOX_CONFIG: ApifoxConfig = {
  projectId: '7656528',
  token: 'APS-pb1WYOOd5N061v3WZk3sEbCp9yN2afIh',
  mockDir: './mock',
  typesDir: './src/types/mock',
  mockPort: 10000,
  generate: 'all',
  apiFilter: {
    scope: {
      excludedByTags: [],
      folderPaths: []
    },
    includePaths: [],
    excludePaths: [],
    includeMethods: []
  }
};

/**
 * 默认的 mock.config.js 配置
 */
export const DEFAULT_MOCK_CONFIG: MockConfig = {
  model: 'mock',
  https: false,
  port: 10000,
  target: 'http://localhost:8080',
  remoteTarget: false
};

/**
 * 配置文件管理器
 */
export class ConfigManager {
  private configPath: string;
  private backupPath: string;
  private configType: 'apifox' | 'mock';

  constructor(configType: 'apifox' | 'mock', testDir: string) {
    this.configType = configType;
    const fileName = configType === 'apifox' ? 'apifox.config.json' : 'mock.config.js';
    this.configPath = path.join(testDir, fileName);
    this.backupPath = path.join(testDir, `${fileName}.backup`);
  }

  /**
   * 创建默认配置文件
   */
  async createDefault(): Promise<void> {
    await fileHelper.ensureDir(path.dirname(this.configPath));

    if (this.configType === 'apifox') {
      await fileHelper.writeJson(this.configPath, DEFAULT_APIFOX_CONFIG);
    } else {
      const configContent = `export default ${JSON.stringify(DEFAULT_MOCK_CONFIG, null, 2)};`;
      await fs.writeFile(this.configPath, configContent, 'utf-8');
    }
  }

  /**
   * 备份当前配置
   */
  async backup(): Promise<void> {
    if (await fileHelper.exists(this.configPath)) {
      const content = await fs.readFile(this.configPath, 'utf-8');
      await fs.writeFile(this.backupPath, content, 'utf-8');
    }
  }

  /**
   * 恢复配置
   */
  async restore(): Promise<void> {
    if (await fileHelper.exists(this.backupPath)) {
      const content = await fs.readFile(this.backupPath, 'utf-8');
      await fs.writeFile(this.configPath, content, 'utf-8');
      await fs.unlink(this.backupPath);
    }
  }

  /**
   * 更新配置（只修改指定字段）
   */
  async updateConfig(updates: Partial<ApifoxConfig> | Partial<MockConfig>): Promise<void> {
    if (this.configType === 'apifox') {
      // 确保配置文件存在
      if (!(await fileHelper.exists(this.configPath))) {
        await this.createDefault();
      }
      
      const current = await fileHelper.readJson<ApifoxConfig>(this.configPath);
      // 深度合并，特别是 apiFilter
      const updated = this.deepMerge(current, updates as Partial<ApifoxConfig>);
      await fileHelper.writeJson(this.configPath, updated);
    } else {
      // 对于 mock.config.js，直接替换整个配置对象
      if (!(await fileHelper.exists(this.configPath))) {
        await this.createDefault();
      }
      
      const current = { ...DEFAULT_MOCK_CONFIG };
      const updated = { ...current, ...updates };
      const configContent = `export default ${JSON.stringify(updated, null, 2)};`;
      await fs.writeFile(this.configPath, configContent, 'utf-8');
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const output = JSON.parse(JSON.stringify(target)); // 深拷贝
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // 如果是对象，递归合并
        if (output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
          output[key] = this.deepMerge(output[key], source[key]);
        } else {
          output[key] = JSON.parse(JSON.stringify(source[key])); // 深拷贝
        }
      } else {
        // 基本类型或数组，直接覆盖
        output[key] = source[key];
      }
    }
    
    return output;
  }

  /**
   * 获取配置路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 清理配置文件
   */
  async cleanup(): Promise<void> {
    try {
      if (await fileHelper.exists(this.configPath)) {
        await fs.unlink(this.configPath);
      }
      if (await fileHelper.exists(this.backupPath)) {
        await fs.unlink(this.backupPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

