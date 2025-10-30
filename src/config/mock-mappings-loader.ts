import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES 模块中获取 __dirname 的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Apifox Mock 映射配置加载器
 */
export class MockMappingsLoader {
  private static instance: MockMappingsLoader;
  private mappings: Record<string, string> = {};

  private constructor() {
    this.loadMappings();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MockMappingsLoader {
    if (!MockMappingsLoader.instance) {
      MockMappingsLoader.instance = new MockMappingsLoader();
    }
    return MockMappingsLoader.instance;
  }

  /**
   * 加载映射配置
   */
  private loadMappings(): void {
    // 从项目根目录的 src/config 目录加载配置文件
    const projectRoot = path.resolve(__dirname, '../..');
    const configPath = path.join(projectRoot, 'src', 'config', 'apifox-mock-mappings.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // 将所有分类的映射合并到一个对象中
    this.mappings = {};
    for (const category of Object.values(config)) {
      Object.assign(this.mappings, category);
    }
  }

  /**
   * 获取所有映射规则
   */
  public getMappings(): Record<string, string> {
    return this.mappings;
  }

  /**
   * 根据模板获取对应的 Mock.js 规则
   */
  public getMockRule(template: string): string | null {
    return this.mappings[template] || null;
  }

  /**
   * 重新加载配置（用于开发环境）
   */
  public reload(): void {
    this.loadMappings();
  }
}
