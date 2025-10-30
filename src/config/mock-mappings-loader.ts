import { apifoxMockMappings } from './apifox-mock-mappings.js';

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
    // 将所有分类的映射合并到一个对象中
    this.mappings = {};
    for (const category of Object.values(apifoxMockMappings)) {
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
