// Apifox 配置类型
export interface ApifoxConfig {
  /** Apifox 项目 ID */
  projectId: string;
  /** Apifox 访问令牌 */
  token: string;
  /** Mock 文件生成目录 */
  mockDir: string;
  /** TypeScript 类型文件生成目录 */
  typesDir: string;
  /** Mock 服务器端口 */
  mockPort: number;
  /** API 筛选配置（可选） */
  apiFilter?: ApiFilter;
}

// API 筛选配置
export interface ApiFilter {
  // ========== Apifox 服务端过滤配置（通过 export-openapi API） ==========
  /** 导出范围配置（服务端过滤） */
  scope?: {
    /**
     * 导出类型
     * - ALL: 导出所有接口
     * - FOLDER: 按文件夹导出
     * - TAG: 按标签导出
     */
    type?: 'ALL' | 'FOLDER' | 'TAG';
    /** 包含的标签（仅当 type 为 TAG 时有效） */
    includedByTags?: string[];
    /** 排除的接口状态（通过标签字段实现） */
    excludedByTags?: string[];
    /** 文件夹路径列表（仅当 type 为 FOLDER 时有效，支持多个中文文件夹名称匹配） */
    folderPaths?: string[];
  };

  /** 导出选项配置（服务端选项） - 已废弃，相关选项已默认启用 */
  options?: {
    /** @deprecated 此选项已废弃，系统默认启用 */
    includeApifoxExtensionProperties?: boolean;
    /** @deprecated 此选项已废弃，系统默认启用 */
    addFoldersToTags?: boolean;
  };

  // ========== 客户端过滤配置（在生成 mock 和 types 时过滤） ==========
  /** 包含的路径模式（支持通配符 * 和 **，客户端过滤） */
  includePaths?: string[];
  /** 排除的路径模式（支持通配符 * 和 **，客户端过滤） */
  excludePaths?: string[];
  /** 包含的 HTTP 方法（客户端过滤） */
  includeMethods?: string[];
  /** 排除的 HTTP 方法（客户端过滤） */
  excludeMethods?: string[];
}

// API 端点定义
export interface ApiEndpoint {
  /** 接口路径 */
  path: string;
  /** HTTP 方法 */
  method: string;
  /** 接口名称 */
  name: string;
  /** 接口描述 */
  description?: string;
  /** 操作 ID */
  operationId?: string;
  /** 标签 */
  tags?: string[];
  /** 是否废弃 */
  deprecated?: boolean;
  /** 接口状态 */
  status?: string;
  /** 参数列表 */
  parameters?: ApiParameter[];
  /** 请求体 */
  requestBody?: any;
  /** 响应体 */
  responseBody?: any;
  /** 文件夹路径 */
  folderPath?: string;
}

// API 参数定义
export interface ApiParameter {
  /** 参数名 */
  name: string;
  /** 参数位置 */
  in: string;
  /** 是否必需 */
  required: boolean;
  /** 参数类型 */
  type: string;
  /** 参数描述 */
  description?: string;
}

// Mock 生成器配置类型
export interface MockConfig {
  /** Mock 文件生成目录 */
  mockDir: string;
  /** TypeScript 类型文件生成目录 */
  typesDir: string;
  /** Mock 服务器端口 */
  mockPort: number;
  /** API 接口定义列表 */
  apis: ApiDefinition[];
}

// API 接口定义
export interface ApiDefinition {
  /** 接口名称 */
  name: string;
  /** 接口路径 */
  path: string;
  /** HTTP 方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 接口描述 */
  description?: string;
  /** 请求参数定义 */
  request?: {
    /** 路径参数 */
    params?: ParamDefinition[];
    /** 查询参数 */
    query?: ParamDefinition[];
    /** 请求头 */
    headers?: ParamDefinition[];
    /** 请求体 */
    body?: TypeDefinition;
  };
  /** 响应定义 */
  response: {
    /** HTTP 状态码 */
    status?: number;
    /** 响应体类型定义 */
    body: TypeDefinition;
  };
}

// 参数定义
export interface ParamDefinition {
  /** 参数名 */
  name: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean';
  /** 是否必需 */
  required?: boolean;
  /** 参数描述 */
  description?: string;
  /** 示例值 */
  example?: any;
}

// 类型定义（支持嵌套）
export interface TypeDefinition {
  /** 类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  /** 对象属性（当 type 为 object 时） */
  properties?: Record<string, PropertyDefinition>;
  /** 数组元素类型（当 type 为 array 时） */
  items?: TypeDefinition;
  /** 枚举值（当 type 为 string 时） */
  enum?: string[];
  /** 示例值 */
  example?: any;
  /** 类型描述 */
  description?: string;
}

// 属性定义
export interface PropertyDefinition extends TypeDefinition {
  /** 是否必需 */
  required?: boolean;
}

// Mock 路由
export interface MockRoute {
  path: string;
  method: string;
  response: any;
  status?: number;
}
