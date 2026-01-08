import type { MockRoute as MockRouteInterface, ValidationConfig } from '../../types/index.js';
import type express from 'express';

/**
 * Mock 路由实体
 * 封装 Mock 路由的业务逻辑
 */
export class MockRoute implements MockRouteInterface {
  public readonly path: string;
  public readonly method: string;
  public readonly response: unknown;
  public readonly status?: number;
  public readonly validation?: ValidationConfig;

  constructor(data: MockRouteInterface & { validation?: ValidationConfig }) {
    this.path = data.path;
    this.method = data.method;
    this.response = data.response;
    this.status = data.status;
    this.validation = data.validation;
  }

  /**
   * 检查路由是否匹配给定的路径和方法
   * @param method HTTP 方法
   * @param path 路径
   * @returns 是否匹配
   */
  matches(method: string, path: string): boolean {
    if (this.method.toUpperCase() !== method.toUpperCase()) {
      return false;
    }

    // 将 OpenAPI 路径格式转换为正则表达式
    const pattern = this.path.replace(/\{(\w+)\}/g, '([^/]+)');
    const regex = new RegExp(`^${pattern}$`);

    // 去掉查询参数和哈希
    const pathWithoutQuery = path.split('?')[0].split('#')[0];

    return regex.test(pathWithoutQuery);
  }

  /**
   * 提取路径参数
   * @param actualPath 实际路径
   * @returns 路径参数对象
   */
  extractPathParams(actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const paramNames: string[] = [];

    // 提取参数名
    const pattern = this.path.replace(/\{(\w+)\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${pattern}$`);
    const pathWithoutQuery = actualPath.split('?')[0].split('#')[0];
    const match = pathWithoutQuery.match(regex);

    if (match) {
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
    }

    return params;
  }

  /**
   * 执行路由响应（处理函数或静态数据）
   * @param req Express 请求对象
   * @returns 响应数据
   */
  async executeResponse(req: express.Request): Promise<unknown> {
    if (typeof this.response === 'function') {
      const result = this.response(req);
      // 处理 Promise
      if (result && typeof result.then === 'function') {
        return await result;
      }
      return result;
    }
    return this.response;
  }

  /**
   * 转换为普通对象（用于序列化）
   * @returns 普通对象
   */
  toJSON(): MockRouteInterface {
    return {
      path: this.path,
      method: this.method,
      response: this.response,
      status: this.status
    };
  }
}

