import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import type { ApifoxConfig } from '../../../src/types/index.js';
import type { MockConfig } from '../../../src/core/mock-config-loader.js';
import { getProjectRoot } from '../../../src/utils/file-operations.js';

/**
 * 测试工具函数
 */
export class TestHelpers {
  /**
   * 创建临时配置文件
   * @param config 要覆盖的配置项（只传入需要测试的配置项）
   * @param baseConfig 基础配置（可选，如果提供则作为默认值）
   * @param baseDir 配置文件所在目录
   */
  static createTempConfig(
    config: Partial<ApifoxConfig>,
    baseConfig?: ApifoxConfig,
    baseDir: string = getProjectRoot()
  ): string {
    const configPath = join(baseDir, 'apifox.config.json');
    // 如果有基础配置，使用基础配置；否则使用默认值
    const defaultConfig: ApifoxConfig = baseConfig || {
      projectId: '7219799',
      token: 'APS-XQrLSqLE4q0FOb0bGhaqYvTxSUQQFPeO',
      mockDir: './mock',
      typesDir: './src/types/mock',
      mockPort: 10000,
      generate: 'all',
    };
    // 只覆盖传入的配置项
    const finalConfig = { ...defaultConfig, ...config };
    writeFileSync(configPath, JSON.stringify(finalConfig, null, 2), 'utf-8');
    return configPath;
  }

  /**
   * 创建临时 Mock 配置文件
   */
  static async createTempMockConfig(
    config: Partial<MockConfig>,
    baseDir: string = getProjectRoot()
  ): Promise<string> {
    const configPath = join(baseDir, 'mock.config.js');
    const defaultConfig: MockConfig = {
      model: 'proxy',
      https: false,
      port: 10000,
      target: 'http://172.24.7.99:8082',
      remoteTarget: true,
    };

    const merged = { ...defaultConfig, ...config };

    const normalizePrefixes = (value: MockConfig['pathPrefixes']) => {
      if (value === undefined) return undefined;
      if (Array.isArray(value)) {
        const filtered = value.filter(Boolean);
        return filtered.length ? filtered : undefined;
      }
      return value || undefined;
    };

    const normalizeRoutes = (routes?: string[]) => {
      if (!routes) return undefined;
      const filtered = routes.filter(Boolean);
      return filtered.length ? filtered : undefined;
    };

    const normalizedConfig: Partial<MockConfig> = {
      model: merged.model,
      https: merged.https,
      port: merged.port,
      target: merged.target,
      remoteTarget: merged.remoteTarget,
      pathPrefixes: normalizePrefixes(merged.pathPrefixes),
      mockRoutes: normalizeRoutes(merged.mockRoutes),
      proxyRoutes: normalizeRoutes(merged.proxyRoutes),
    };

    // 移除 undefined 字段，保持配置文件简洁
    const cleanedConfig = Object.fromEntries(
      Object.entries(normalizedConfig).filter(([, value]) => value !== undefined)
    );

    const configContent = `export default ${JSON.stringify(cleanedConfig, null, 2)};\n`;
    writeFileSync(configPath, configContent, 'utf-8');
    // 在测试环境中，添加延迟确保文件写入完成和模块缓存更新
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return configPath;
  }

  /**
   * 清理临时文件
   */
  static cleanupTempFiles(paths: string[]): void {
    for (const filePath of paths) {
      if (existsSync(filePath)) {
        rmSync(filePath, { recursive: true, force: true });
      }
    }
  }

  /**
   * 读取文件内容
   */
  static readFile(filePath: string): string {
    return readFileSync(filePath, 'utf-8');
  }

  /**
   * 检查文件是否存在
   */
  static fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * 确保目录存在
   */
  static ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 解析 Mock 文件中的路由块
   */
  static parseMockFileBlocks(content: string): Array<{
    path: string;
    method: string;
    block: string;
  }> {
    const blocks: Array<{ path: string; method: string; block: string }> = [];
    const regex = /\/\/\s*\[start\](.+?)\[(\w+)\]([\s\S]*?)\/\/\s*\[end\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        path: match[1].trim(),
        method: match[2].trim(),
        block: match[0],
      });
    }

    return blocks;
  }

  /**
   * 解析 TypeScript 类型文件中的命名空间块
   */
  static parseTypeFileBlocks(content: string): Array<{
    path: string;
    method: string;
    block: string;
  }> {
    const blocks: Array<{ path: string; method: string; block: string }> = [];
    const regex = /\/\/\s*\[start\](.+?)\[(\w+)\]([\s\S]*?)\/\/\s*\[end\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        path: match[1].trim(),
        method: match[2].trim(),
        block: match[0],
      });
    }

    return blocks;
  }

  /**
   * 验证 Mock 文件结构
   */
  static validateMockFileStructure(content: string): {
    hasImports: boolean;
    hasMockImport: boolean;
    hasLodashImport: boolean;
    blocks: number;
  } {
    return {
      hasImports: content.includes('import'),
      hasMockImport:
        content.includes('import Mock from "mockjs"') ||
        content.includes("import Mock from 'mockjs'"),
      hasLodashImport:
        content.includes('import lodash from "lodash"') ||
        content.includes("import lodash from 'lodash'"),
      blocks: this.parseMockFileBlocks(content).length,
    };
  }

  /**
   * 验证 TypeScript 类型文件结构
   */
  static validateTypeFileStructure(content: string): {
    hasNamespaces: boolean;
    blocks: number;
  } {
    const blocks = this.parseTypeFileBlocks(content);
    return {
      hasNamespaces: blocks.some(b => b.block.includes('export namespace')),
      blocks: blocks.length,
    };
  }

  /**
   * 等待文件生成
   */
  static async waitForFile(
    filePath: string,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (existsSync(filePath)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  /**
   * 获取项目根目录
   */
  static getProjectRoot(): string {
    return getProjectRoot();
  }

  /**
   * 创建模拟请求和响应对象
   */
  static createMockReqRes(
    method: string,
    path: string,
    options: { query?: any; body?: any; headers?: Record<string, string>; params?: any } = {}
  ) {
    const mockReq: any = {
      method,
      path,
      query: options.query || {},
      body: options.body || {},
      headers: options.headers || {},
      params: options.params || {},
    };

    const mockRes: any = {
      status: function (code: number) {
        this.statusCode = code;
        return this;
      },
      json: function (data: any) {
        this.body = data;
        return this;
      },
      setHeader: function (key: string, value: string) {
        this.headers = this.headers || {};
        this.headers[key] = value;
        return this;
      },
      send: function (data: any) {
        this.body = data;
        return this;
      },
      statusCode: 200,
      body: null,
      headers: {},
    };

    return { mockReq, mockRes };
  }
}

