import type express from 'express';
import type { ApifoxConfig, ApiEndpoint, MockRoute, MockConfig } from '../types/index.js';
import type { OpenAPIDocument, OpenAPISchema, OpenAPISchemaReference } from '../types/openapi.js';

// ============================================================================
// Apifox Client Interface
// ============================================================================

/**
 * Apifox 客户端接口
 */
export interface IApifoxClient {
  /**
   * 从 Apifox 获取 OpenAPI 文档
   * @param config Apifox 配置
   * @returns OpenAPI 文档
   */
  fetchOpenAPI(config: ApifoxConfig): Promise<OpenAPIDocument>;
}

// ============================================================================
// Route Manager Interface
// ============================================================================

/**
 * 路由管理器接口
 */
export interface IRouteManager {
  /**
   * 设置路由
   * @param key 路由键（格式：METHOD path）
   * @param route Mock 路由
   */
  setRoute(key: string, route: MockRoute): void;

  /**
   * 获取路由
   * @param method HTTP 方法
   * @param path 路径
   * @returns Mock 路由，如果不存在则返回 undefined
   */
  getRoute(method: string, path: string): MockRoute | undefined;

  /**
   * 获取所有路由
   * @returns 所有 Mock 路由数组
   */
  getAllRoutes(): MockRoute[];

  /**
   * 移除路由
   * @param key 路由键
   */
  removeRoute(key: string): void;

  /**
   * 清空所有路由
   */
  clear(): void;
}

// ============================================================================
// File System Interface
// ============================================================================

/**
 * 文件系统接口
 */
export interface IFileSystem {
  /**
   * 读取文件内容
   * @param path 文件路径
   * @returns 文件内容
   */
  readFile(path: string): Promise<string>;

  /**
   * 写入文件内容
   * @param path 文件路径
   * @param content 文件内容
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * 检查文件或目录是否存在
   * @param path 路径
   * @returns 是否存在
   */
  exists(path: string): Promise<boolean>;

  /**
   * 确保目录存在（如果不存在则创建）
   * @param path 目录路径
   */
  ensureDir(path: string): Promise<void>;

  /**
   * 读取 JSON 文件
   * @param path 文件路径
   * @returns 解析后的 JSON 对象
   */
  readJson<T>(path: string): Promise<T>;

  /**
   * 写入 JSON 文件
   * @param path 文件路径
   * @param data 要写入的数据
   */
  writeJson(path: string, data: unknown): Promise<void>;

  /**
   * 获取项目根目录
   * @returns 项目根目录路径
   */
  getProjectRoot(): string;
}

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * 日志接口
 */
export interface ILogger {
  /**
   * 输出信息日志
   * @param message 日志消息
   */
  info(message: string): void;

  /**
   * 输出成功日志
   * @param message 日志消息
   */
  success(message: string): void;

  /**
   * 输出警告日志
   * @param message 日志消息
   */
  warn(message: string): void;

  /**
   * 输出错误日志
   * @param message 日志消息
   */
  error(message: string): void;

  /**
   * 输出调试日志
   * @param message 日志消息
   */
  debug(message: string): void;

  /**
   * 输出标题日志
   * @param message 日志消息
   */
  title(message: string): void;
}

// ============================================================================
// HTTP Client Interface
// ============================================================================

/**
 * HTTP 请求配置
 */
export interface HttpRequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  validateStatus?: (status: number) => boolean;
  [key: string]: unknown;
}

/**
 * HTTP 响应
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * HTTP 客户端接口
 */
export interface IHttpClient {
  /**
   * 发送 GET 请求
   * @param url 请求 URL
   * @param config 请求配置
   * @returns HTTP 响应
   */
  get<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * 发送 POST 请求
   * @param url 请求 URL
   * @param data 请求体数据
   * @param config 请求配置
   * @returns HTTP 响应
   */
  post<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * 发送 PUT 请求
   * @param url 请求 URL
   * @param data 请求体数据
   * @param config 请求配置
   * @returns HTTP 响应
   */
  put<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * 发送 DELETE 请求
   * @param url 请求 URL
   * @param config 请求配置
   * @returns HTTP 响应
   */
  delete<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}

// ============================================================================
// Remote Proxy Interface
// ============================================================================

/**
 * 代理响应
 */
export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  data: unknown;
}

/**
 * 远程代理接口
 */
export interface IRemoteProxy {
  /**
   * 代理请求到远程服务器
   * @param req Express 请求对象
   * @returns 代理响应
   */
  proxyRequest(req: express.Request): Promise<ProxyResponse>;

  /**
   * 检查远程服务器是否已配置
   * @returns 是否已配置
   */
  isRemoteServerConfigured(): boolean;
}

// ============================================================================
// Generator Interface
// ============================================================================

/**
 * 生成器配置
 */
export interface GeneratorConfig {
  /** Apifox 配置 */
  config: ApifoxConfig;
  /** API 端点列表 */
  endpoints: ApiEndpoint[];
  /** OpenAPI Schema 定义 */
  schemas?: Record<string, OpenAPISchema | OpenAPISchemaReference>;
}

/**
 * Mock 生成器接口
 */
export interface IMockGenerator {
  /**
   * 生成 Mock 文件
   * @param config Apifox 配置
   * @param endpoints API 端点列表
   * @param definitions OpenAPI Schema 定义（可选）
   */
  generateMockFiles(
    config: ApifoxConfig,
    endpoints: ApiEndpoint[],
    definitions?: Record<string, OpenAPISchema | OpenAPISchemaReference>
  ): Promise<void>;
}

/**
 * 类型生成器接口
 */
export interface ITypeGenerator {
  /**
   * 生成 TypeScript 类型文件
   * @param config Apifox 配置
   * @param openapi OpenAPI 文档
   * @param endpoints API 端点列表
   */
  generateTypeFiles(
    config: ApifoxConfig,
    openapi: OpenAPIDocument,
    endpoints: ApiEndpoint[]
  ): Promise<void>;
}

