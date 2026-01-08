/**
 * 依赖注入容器
 * 支持服务注册、解析和单例模式
 */

type FactoryFunction<T = any> = (container: Container) => T;

/**
 * 依赖注入容器
 */
export class Container {
  private services = new Map<string, FactoryFunction>();
  private singletons = new Map<string, any>();

  /**
   * 注册服务
   * @param key 服务标识符
   * @param factory 工厂函数
   * @param singleton 是否为单例，默认为 false
   */
  register<T>(
    key: string,
    factory: FactoryFunction<T>,
    singleton: boolean = false
  ): void {
    if (singleton) {
      this.singletons.set(key, null);
    }
    this.services.set(key, factory);
  }

  /**
   * 解析服务
   * @param key 服务标识符
   * @returns 服务实例
   */
  resolve<T>(key: string): T {
    // 如果是单例且已创建，直接返回
    if (this.singletons.has(key) && this.singletons.get(key) !== null) {
      return this.singletons.get(key) as T;
    }

    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service '${key}' not found. Make sure it's registered.`);
    }

    const instance = factory(this) as T;

    // 如果是单例，缓存实例
    if (this.singletons.has(key)) {
      this.singletons.set(key, instance);
    }

    return instance;
  }

  /**
   * 检查服务是否已注册
   * @param key 服务标识符
   * @returns 是否已注册
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * 清除所有服务（主要用于测试）
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * 移除服务
   * @param key 服务标识符
   */
  remove(key: string): void {
    this.services.delete(key);
    this.singletons.delete(key);
  }
}

