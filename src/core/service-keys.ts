/**
 * 服务标识符常量
 * 用于依赖注入容器的服务注册和解析
 */
export const SERVICE_KEYS = {
  // ========== Interfaces ==========
  /** Apifox 客户端接口 */
  APIFOX_CLIENT: 'IApifoxClient',
  
  /** 路由管理器接口 */
  ROUTE_MANAGER: 'IRouteManager',
  
  /** 文件系统接口 */
  FILE_SYSTEM: 'IFileSystem',
  
  /** 日志接口 */
  LOGGER: 'ILogger',
  
  /** HTTP 客户端接口 */
  HTTP_CLIENT: 'IHttpClient',
  
  /** Mock 生成器接口 */
  MOCK_GENERATOR: 'IMockGenerator',
  
  /** 类型生成器接口 */
  TYPE_GENERATOR: 'ITypeGenerator',
  
  /** 远程代理接口 */
  REMOTE_PROXY: 'IRemoteProxy',
  
  // ========== Business Services ==========
  /** 端点过滤器服务 */
  ENDPOINT_FILTER: 'EndpointFilterService',
  
  /** 路由匹配器服务 */
  ROUTE_MATCHER: 'RouteMatcherService',
  
  /** OpenAPI 转换器服务 */
  OPENAPI_CONVERTER: 'OpenAPIConverterService',
  
  // ========== Use Cases ==========
  /** 获取 Apifox 数据用例 */
  FETCH_APIFOX_DATA_USE_CASE: 'FetchApifoxDataUseCase',
  
  /** 生成 Mock 用例 */
  GENERATE_MOCK_USE_CASE: 'GenerateMockUseCase',
  
  /** 生成类型用例 */
  GENERATE_TYPES_USE_CASE: 'GenerateTypesUseCase',
  
  /** 启动 Mock 服务器用例 */
  SERVE_MOCK_USE_CASE: 'ServeMockUseCase',
  
  // ========== Infrastructure ==========
  /** 路由处理器 */
  ROUTE_HANDLER: 'RouteHandler',
} as const;

