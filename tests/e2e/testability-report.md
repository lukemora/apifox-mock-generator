# 可测性报告

## 1. apifox.config.json 配置分析

### 1.1 配置项清单

| 配置项 | 类型 | 必填 | 默认值 | 说明 | 实现位置 |
|--------|------|------|--------|------|----------|
| `projectId` | string | 是 | - | Apifox 项目 ID | `src/core/config-loader.ts` |
| `token` | string | 是 | - | Apifox API Token | `src/core/config-loader.ts` |
| `mockDir` | string | 是 | - | Mock 文件生成目录 | `src/generators/mock-generator.ts` |
| `typesDir` | string | 是 | - | TypeScript 类型文件生成目录 | `src/generators/type-generator.ts` |
| `generate` | 'all' \| 'mock' \| 'types' | 否 | 'all' | 生成范围 | `src/scripts/generate-mock.ts` |
| `apiFilter` | ApiFilter | 否 | - | API 筛选配置 | `src/core/endpoint-filter.ts` |
| `branchId` | number | 否 | - | 项目分支 ID | `src/core/apifox-client.ts` |
| `apiUrl` | string | 否 | 'https://api.apifox.com' | Apifox API 基础 URL | `src/core/apifox-client.ts` |

### 1.2 apiFilter 子配置项

| 配置项 | 类型 | 说明 | 实现位置 |
|--------|------|------|----------|
| `scope.includedByTags` | string[] | 包含的标签列表 | `src/core/endpoint-filter.ts:91-101` |
| `scope.excludedByTags` | string[] | 排除的接口状态（支持中文） | `src/core/endpoint-filter.ts:104-112` |
| `scope.folderPaths` | string[] | 文件夹路径列表（支持前缀匹配） | `src/core/endpoint-filter.ts:115-140` |
| `includePaths` | string[] | 包含的路径模式（支持通配符 * 和 **） | `src/core/endpoint-filter.ts:51-57` |
| `excludePaths` | string[] | 排除的路径模式（支持通配符 * 和 **） | `src/core/endpoint-filter.ts:60-66` |
| `includeMethods` | string[] | 包含的 HTTP 方法 | `src/core/endpoint-filter.ts:75-80` |
| `excludeMethods` | string[] | 排除的 HTTP 方法 | `src/core/endpoint-filter.ts:83-88` |

### 1.3 配置使用流程

1. **配置加载**: `loadConfig()` → `src/core/config-loader.ts:9-19`
2. **OpenAPI 拉取**: `fetchOpenAPIFromApifox()` → `src/core/apifox-client.ts:10-44`
3. **端点转换**: `convertOpenAPIToEndpoints()` → `src/core/openapi-converter.ts:6-44`
4. **端点过滤**: `filterEndpoints()` → `src/core/endpoint-filter.ts:44-144`
5. **文件生成**:
   - Mock 文件: `generateMockFiles()` → `src/generators/mock-generator.ts:16-55`
   - 类型文件: `generateTypeFiles()` → `src/generators/type-generator.ts:11-70`

### 1.4 可测试点

#### 配置加载测试
- ✅ 配置文件存在性检查
- ✅ JSON 格式验证
- ✅ 必填字段验证
- ✅ 默认值应用

#### 配置项功能测试
- ✅ `projectId` 和 `token` 用于 Apifox API 请求
- ✅ `mockDir` 和 `typesDir` 目录创建和文件生成
- ✅ `generate` 模式控制生成范围
- ✅ `apiFilter` 各子项过滤逻辑
- ✅ `branchId` 分支选择
- ✅ `apiUrl` 自定义 API 地址

#### 生成文件测试
- ✅ Mock 文件结构验证
- ✅ TypeScript 类型文件结构验证
- ✅ 文件内容正确性验证
- ✅ 特殊场景处理（嵌套对象、数组、引用、循环引用等）

### 1.5 详细测试场景

#### scope.excludedByTags 测试场景
1. **单个中文标签排除**: 测试排除单个中文状态标签（如"设计中"）
2. **多个中文标签排除**: 测试同时排除多个中文状态标签（如["设计中", "已废弃"]）
3. **英文标签排除**: 测试排除英文状态标签（如"deprecated"）
4. **混合标签排除**: 测试同时排除中文和英文标签
5. **状态映射验证**: 验证中文标签正确映射到英文状态

#### scope.includedByTags 测试场景
1. **单个中文标签包含**: 测试包含单个中文状态标签（如"已完成"）
2. **多个中文标签包含**: 测试同时包含多个中文状态标签（如["已完成", "已发布"]）
3. **英文标签包含**: 测试包含英文状态标签（如"completed"）
4. **混合标签包含**: 测试同时包含中文和英文标签
5. **状态映射验证**: 验证中文标签正确映射到英文状态

#### scope.folderPaths 测试场景
1. **单个文件夹精确匹配**: 测试单个文件夹路径的精确匹配
2. **多个文件夹匹配**: 测试多个文件夹路径的匹配（OR 逻辑）
3. **中文文件夹名称**: 测试中文文件夹名称的匹配（如"用户管理"）
4. **前缀匹配子目录**: 测试文件夹路径的前缀匹配功能（如"用户管理"匹配"用户管理/子目录"）
5. **精确匹配不包含子目录**: 验证精确匹配时不会错误匹配子目录
6. **空文件夹路径处理**: 测试接口没有 folderPath 时的处理

#### includePaths 测试场景
1. **单个路径模式**: 测试单个路径模式的匹配
2. **多个路径模式**: 测试多个路径模式的匹配（OR 逻辑）
3. **通配符 * 匹配**: 测试单层路径通配符（如 `/api/user/*`）
4. **通配符 ** 匹配**: 测试多层路径通配符（如 `/api/**`）
5. **精确路径匹配**: 测试完全精确的路径匹配
6. **混合通配符**: 测试同时使用 * 和 ** 的复杂模式

#### excludePaths 测试场景
1. **单个路径模式排除**: 测试单个路径模式的排除
2. **多个路径模式排除**: 测试多个路径模式的排除（OR 逻辑）
3. **通配符 * 排除**: 测试单层路径通配符排除（如 `/api/admin/*`）
4. **通配符 ** 排除**: 测试多层路径通配符排除（如 `/api/admin/**`）
5. **精确路径排除**: 测试完全精确的路径排除
6. **混合通配符排除**: 测试同时使用 * 和 ** 的复杂排除模式

#### includeMethods 测试场景
1. **单个方法包含**: 测试包含单个 HTTP 方法（如 ["GET"]）
2. **多个方法包含**: 测试包含多个 HTTP 方法（如 ["GET", "POST"]）
3. **所有方法包含**: 测试包含所有常用方法（["GET", "POST", "PUT", "DELETE", "PATCH"]）
4. **大小写不敏感**: 验证方法名大小写不敏感（如 "get" 和 "GET" 等价）

#### excludeMethods 测试场景
1. **单个方法排除**: 测试排除单个 HTTP 方法（如 ["DELETE"]）
2. **多个方法排除**: 测试排除多个 HTTP 方法（如 ["DELETE", "PUT"]）
3. **部分方法排除**: 测试排除部分方法，保留其他方法
4. **大小写不敏感**: 验证方法名大小写不敏感（如 "delete" 和 "DELETE" 等价）

#### generate 测试场景
1. **generate=all**: 验证同时生成 Mock 文件和类型文件
2. **generate=mock**: 验证只生成 Mock 文件，不生成类型文件
3. **generate=types**: 验证只生成类型文件，不生成 Mock 文件
4. **默认值验证**: 验证未配置时默认为 'all'

#### 组合过滤测试场景
1. **多条件 AND 逻辑**: 测试多个过滤条件同时生效（如 includePaths + includeMethods）
2. **优先级验证**: 验证不同过滤条件的优先级和组合逻辑
3. **空配置处理**: 测试空配置或未配置时的行为

## 2. mock.config.js 配置分析

### 2.1 配置项清单

| 配置项 | 类型 | 必填 | 默认值 | 说明 | 实现位置 |
|--------|------|------|--------|------|----------|
| `model` | 'proxy' \| 'mock' | 是 | - | 工作模式（默认模式） | `src/server/route-handler.ts:54` |
| `https` | boolean | 否 | false | 是否开启 HTTPS | `src/server/express-server.ts` (预留，未直接使用) |
| `port` | number | 否 | 10000 | 本地服务端口 | `src/scripts/serve-mock.ts:78` |
| `target` | string | 是 | - | 默认代理目标服务器地址 | `src/server/remote-proxy.ts:24` |
| `remoteTarget` | boolean | 否 | true | 是否开启 remote URL 参数支持 | `src/server/route-handler.ts:31-47` |
| `pathPrefixes` | string \| string[] | 否 | - | 路径前缀（用于路径标准化） | `src/server/route-handler.ts:247-272`<br>`src/server/route-loader.ts:237-263` |
| `mockRoutes` | string[] | 否 | [] | 强制使用 Mock 的路由规则 | `src/server/route-handler.ts:165-184` |
| `proxyRoutes` | string[] | 否 | [] | 强制使用 Proxy 的路由规则 | `src/server/route-handler.ts:165-184` |

### 2.2 配置加载机制

**实现位置**: `src/core/mock-config-loader.ts:38-65`

**加载流程**:
1. 检查 `mock.config.js` 文件是否存在
2. 将文件路径转换为 `file://` URL 格式（支持 Windows 路径）
3. 使用动态 `import()` 加载 JS 配置文件
4. 提取 `default` 导出或直接导出
5. 验证配置对象格式
6. 返回 `MockConfig` 对象

**错误处理**:
- 文件不存在：输出错误并退出进程
- 导入失败：输出错误信息并退出进程
- 配置格式错误：抛出异常并退出进程

### 2.3 配置使用流程

1. **配置加载**: `loadMockConfig()` → `src/core/mock-config-loader.ts:38-65`
2. **路由加载**: `loadMockRoutes()` → `src/server/route-loader.ts:29-125`
3. **服务器启动**: `setupMockServer()` → `src/server/express-server.ts:11-63`
4. **请求处理**: `RouteHandler.handleRequest()` → `src/server/route-handler.ts:25-69`
5. **模式选择优先级**: `remote` URL 参数 > `mockRoutes/proxyRoutes` > `model` 默认值

### 2.4 模式切换优先级详解

**优先级顺序**（从高到低）:
1. **URL 参数 `remote`**: 从 Referer 头中解析 `?remote=mock` 或 `?remote=http://...`
   - 实现位置: `src/server/route-handler.ts:29-47`
   - 支持值:
     - `remote=mock`: 强制使用 Mock 模式
     - `remote=http://...` 或 `remote=https://...`: 强制使用 Proxy 模式并指定目标
   - 仅在 `remoteTarget=true` 时生效

2. **路由规则 `mockRoutes/proxyRoutes`**: 按接口粒度控制
   - 实现位置: `src/server/route-handler.ts:165-184`
   - 匹配格式:
     - 路径字符串: `/api/user`
     - 方法+路径: `GET /api/user`、`POST /api/user`
   - 匹配逻辑: 同时匹配原始路径和标准化路径

3. **默认模式 `model`**: 全局默认工作模式
   - 实现位置: `src/server/route-handler.ts:54`
   - 值: `'mock'` 或 `'proxy'`

### 2.5 路径前缀处理机制

**实现位置**: 
- `src/server/route-handler.ts:247-272` (请求路径标准化)
- `src/server/route-loader.ts:237-263` (路由变体生成)

**处理逻辑**:
1. **前缀标准化**:
   - 确保前缀有前导斜杠（无则添加）
   - 移除末尾斜杠
   - 空前缀或 `/` 前缀被忽略

2. **路径匹配**:
   - 检查请求路径是否以前缀开头
   - 匹配成功时，去除前缀得到标准化路径
   - 返回标准化路径和匹配的前缀

3. **路由变体生成**:
   - 为每个前缀生成带前缀的路由路径
   - 同时保留原始路径（无前缀）
   - 例如：路径 `/api/user` + 前缀 `/api` → 生成 `['/api/api/user', '/api/user']`

### 2.6 路由规则匹配机制

**实现位置**: `src/server/route-handler.ts:165-184`

**匹配逻辑**:
1. **候选键生成**:
   - 原始路径: `/api/user`
   - 标准化路径: `/user`（如果配置了前缀）
   - 方法+路径: `GET /api/user`、`GET /user`
   - 生成 4 个候选键进行匹配

2. **匹配顺序**:
   - 先检查 `proxyRoutes`，匹配则返回 `'proxy'`
   - 再检查 `mockRoutes`，匹配则返回 `'mock'`
   - 都不匹配则返回 `undefined`（使用默认模式）

3. **匹配方式**:
   - 精确字符串匹配（`routes.includes(key)`）
   - 支持路径和方法+路径两种格式

### 2.7 可测试点

#### 配置加载测试
- ✅ JS 配置文件存在性检查
- ✅ 模块导出格式验证（default 导出或直接导出）
- ✅ 必填字段验证（model、target）
- ✅ 默认值应用（port、remoteTarget、https）
- ✅ 文件路径处理（Windows 路径转换）
- ✅ URL 格式转换（file:// URL）

#### 运行时行为测试
- ✅ `model` 模式切换（mock/proxy）
- ✅ `remoteTarget` URL 参数解析（从 Referer 头）
- ✅ `pathPrefixes` 路径标准化（单个/多个前缀）
- ✅ `mockRoutes` 和 `proxyRoutes` 路由匹配（路径/方法+路径）
- ✅ `target` 代理目标配置
- ✅ `port` 端口监听和占用检查
- ✅ `https` 配置（预留功能）

#### 特殊场景测试
- ✅ 路径前缀匹配和去除（前导/末尾斜杠处理）
- ✅ 路由优先级（URL 参数 > 路由规则 > 默认模式）
- ✅ 动态路由匹配（路径参数提取）
- ✅ Mock 数据生成和返回
- ✅ 代理请求转发
- ✅ 多个路径前缀处理
- ✅ 路由规则格式验证（路径字符串 vs 方法+路径）

### 2.8 详细测试场景

#### model 测试场景
1. **mock 模式**: 验证所有请求都使用本地 Mock 数据
2. **proxy 模式**: 验证所有请求都代理到目标服务器
3. **模式切换**: 验证运行时模式切换功能
4. **默认模式**: 验证未配置时使用默认值

#### pathPrefixes 测试场景
1. **单个前缀（字符串）**: 测试单个路径前缀的匹配和去除
2. **多个前缀（数组）**: 测试多个路径前缀的匹配
3. **前缀标准化**:
   - 无前导斜杠的前缀自动添加 `/`
   - 有末尾斜杠的前缀自动去除
   - 空字符串或 `/` 前缀被忽略
4. **路径去除**: 验证请求路径正确去除前缀
5. **路径匹配**: 验证路径必须以前缀开头才匹配
6. **边界情况**: 
   - 路径等于前缀时返回 `/`
   - 路径去除前缀后为空时返回 `/`

#### mockRoutes 测试场景
1. **路径匹配**: 测试路径字符串匹配（如 '/api/user'）
2. **方法+路径匹配**: 测试 "METHOD path" 格式匹配（如 'GET /api/user'）
3. **多个路由规则**: 测试多个路由规则的匹配（OR 逻辑）
4. **优先级验证**: 验证 mockRoutes 优先级高于默认 model
5. **标准化路径匹配**: 验证同时匹配原始路径和标准化路径
6. **大小写处理**: 验证方法名大小写不敏感（GET/get）

#### proxyRoutes 测试场景
1. **路径匹配**: 测试路径字符串匹配（如 '/api/payment'）
2. **方法+路径匹配**: 测试 "METHOD path" 格式匹配（如 'POST /api/payment'）
3. **多个路由规则**: 测试多个路由规则的匹配（OR 逻辑）
4. **优先级验证**: 验证 proxyRoutes 优先级高于默认 model
5. **标准化路径匹配**: 验证同时匹配原始路径和标准化路径
6. **优先级高于 mockRoutes**: 验证 proxyRoutes 优先级高于 mockRoutes

#### remoteTarget 测试场景
1. **remote=mock**: 测试 URL 参数 ?remote=mock 强制使用 Mock
2. **remote=URL**: 测试 URL 参数 ?remote=http://... 动态代理
3. **remote=HTTPS URL**: 测试 HTTPS URL 格式
4. **remoteTarget=false**: 验证 remoteTarget 为 false 时忽略 URL 参数
5. **优先级验证**: 验证 remote 参数优先级最高
6. **Referer 头解析**: 验证从 Referer 头中正确解析 remote 参数
7. **URL 解析错误处理**: 验证无效 Referer URL 的错误处理

#### 路由优先级测试场景
1. **URL 参数优先级**: 验证 ?remote=mock 优先级最高
2. **路由规则优先级**: 验证 mockRoutes/proxyRoutes 优先级高于 model
3. **默认模式**: 验证没有特殊规则时使用 model 默认值
4. **优先级组合**: 测试多种优先级组合场景
5. **proxyRoutes vs mockRoutes**: 验证 proxyRoutes 优先级高于 mockRoutes

#### target 测试场景
1. **HTTP 目标**: 测试 http:// 格式的目标地址
2. **HTTPS 目标**: 测试 https:// 格式的目标地址
3. **带端口的目标**: 测试带端口号的目标地址（如 http://example.com:8080）
4. **路径拼接**: 验证目标地址与请求路径的正确拼接
5. **末尾斜杠处理**: 验证目标地址末尾斜杠的处理

#### port 测试场景
1. **默认端口**: 验证默认端口 10000
2. **自定义端口**: 测试自定义端口配置
3. **端口占用检查**: 验证端口占用时的检查和清理
4. **端口清理**: 验证 Windows 下端口占用的进程清理

#### https 测试场景
1. **默认值**: 验证默认值为 false
2. **HTTPS 配置**: 测试 https: true 配置（预留功能）

## 3. Mock 服务器功能分析

### 3.1 服务器架构

**核心组件**:
1. **Express 服务器**: `src/server/express-server.ts`
   - 使用 Express 框架
   - 配置 CORS 中间件
   - 配置 JSON/URL 编码解析
   - 请求日志中间件
   - 404 错误处理
   - 500 错误处理

2. **路由管理器**: `src/server/route-manager.ts`
   - 存储和管理所有 Mock 路由
   - 支持动态添加/删除路由
   - 路由查找（按 method + path）

3. **路由处理器**: `src/server/route-handler.ts`
   - 请求处理入口
   - 模式选择逻辑
   - Mock 请求处理
   - 代理请求处理

4. **远程代理**: `src/server/remote-proxy.ts`
   - 代理请求到远程服务器
   - 请求头转发
   - 响应头转发
   - 错误处理

5. **路由加载器**: `src/server/route-loader.ts`
   - 扫描 Mock 文件
   - 动态加载 Mock 模块
   - 提取路由信息
   - 生成路由变体

6. **热重载**: `src/server/hot-reload.ts`
   - 文件变化监听
   - 模块缓存清理
   - 路由动态更新

### 3.2 路由加载机制

**实现位置**: `src/server/route-loader.ts:29-125`

**加载流程**:
1. **文件扫描**:
   - 使用 `glob` 扫描 `mockDir/**/*.js`
   - 排除 `index.js` 和 `node_modules`
   - 检查目录存在性

2. **路由信息提取**:
   - 从文件内容提取路由信息
   - 支持 `// [start]/path[METHOD]` 格式
   - 支持 `@apiURI` 和 `@apiRequestType` 注释格式
   - 提取所有路由（支持多路由文件）

3. **函数查找**:
   - 根据方法名查找处理函数
   - 查找顺序：
     1. 精确匹配: `GetUser`
     2. 前缀匹配: 以 `Get` 开头的函数
     3. 后缀匹配: `GetRole`
     4. 默认导出: `default`

4. **路由变体生成**:
   - 根据 `pathPrefixes` 生成带前缀的路由
   - 同时保留原始路径
   - 为每个变体创建路由

5. **路由注册**:
   - 创建 `MockRoute` 对象
   - 设置响应处理函数
   - 注册到 `RouteManager`

### 3.3 路由匹配机制

**实现位置**: `src/server/route-matcher.ts:6-22`

**匹配逻辑**:
1. **方法匹配**:
   - 方法名大小写不敏感
   - 转换为大写后比较

2. **路径匹配**:
   - 将 OpenAPI 路径格式转换为正则表达式
   - `{param}` → `([^/]+)`
   - 使用正则表达式精确匹配

3. **路径参数提取**:
   - 实现位置: `src/server/route-matcher.ts:27-47`
   - 从路径模式中提取参数名
   - 从实际路径中提取参数值
   - 返回参数对象 `{ paramName: value }`

### 3.4 请求处理流程

**实现位置**: `src/server/route-handler.ts:25-69`

**处理步骤**:
1. **路径标准化**:
   - 根据 `pathPrefixes` 标准化请求路径
   - 去除匹配的前缀

2. **模式选择**:
   - 检查 `remote` URL 参数（从 Referer 头）
   - 检查 `mockRoutes/proxyRoutes` 规则
   - 使用默认 `model`

3. **请求分发**:
   - Mock 模式: 调用 `handleMockRequest()`
   - Proxy 模式: 调用 `handleProxyRequest()`

### 3.5 Mock 请求处理

**实现位置**: `src/server/route-handler.ts:145-160`

**处理流程**:
1. **路由查找**:
   - 先使用原始路径查找
   - 未找到则使用标准化路径查找

2. **路由执行**:
   - 提取路径参数
   - 参数校验（如有）
   - 执行 Mock 函数
   - 处理 Promise 响应
   - 返回 JSON 响应

3. **参数校验**:
   - 实现位置: `src/server/validation.ts:6-48`
   - 路径参数校验
   - 查询参数校验
   - 请求体校验
   - Schema 校验（递归）

### 3.6 代理请求处理

**实现位置**: 
- `src/server/route-handler.ts:74-140` (请求处理)
- `src/server/remote-proxy.ts:19-77` (代理逻辑)

**处理流程**:
1. **目标地址确定**:
   - 优先使用 `req.__overrideTarget`（来自 remote 参数）
   - 否则使用 `config.target`

2. **URL 构建**:
   - 拼接目标地址和请求路径
   - 添加查询参数
   - 处理末尾斜杠

3. **请求头转发**:
   - 复制所有请求头
   - 排除连接层头部（host、connection、keep-alive、transfer-encoding）

4. **请求发送**:
   - 使用 axios 发送请求
   - 支持所有 HTTP 方法
   - 禁用状态码验证（接受所有状态码）

5. **响应处理**:
   - 原样返回状态码
   - 转发响应头（排除连接层头部）
   - 原样返回响应体
   - 记录日志（成功/业务错误）

6. **错误处理**:
   - 网络错误捕获
   - 返回 500 错误响应
   - 包含详细错误信息

### 3.7 热重载机制

**实现位置**: `src/server/hot-reload.ts:13-152`

**监听机制**:
1. **文件监听器**:
   - 使用 `chokidar` 监听文件变化
   - 监听模式: `mockDir/**/*.js`
   - 排除: `index.js`、`node_modules`
   - 配置: 轮询、原子写入、稳定性阈值

2. **备用监听**:
   - 使用原生 `fs.watch` 作为备用
   - 递归监听目录
   - 仅监听 `.js` 文件

**文件变化处理**:
1. **文件添加** (`add` 事件):
   - 加载新文件的路由
   - 注册到 `RouteManager`
   - 输出成功日志

2. **文件修改** (`change` 事件):
   - 清除模块缓存
   - 重新加载路由
   - 更新 `RouteManager`
   - 输出更新日志

3. **文件删除** (`unlink` 事件):
   - 从 `RouteManager` 移除相关路由
   - 输出删除日志

**模块缓存管理**:
- 实现位置: `src/server/route-loader.ts:13-24`
- 使用 `Map` 存储文件版本号
- 支持单个文件缓存清除
- 支持全部缓存清除
- 使用版本号破坏 import 缓存

### 3.8 参数校验机制

**实现位置**: `src/server/validation.ts`

**校验类型**:
1. **路径参数校验**:
   - 必需性检查
   - 类型检查（string、number、boolean）

2. **查询参数校验**:
   - 必需性检查
   - 类型检查

3. **请求体校验**:
   - 必需性检查（不能为空）
   - Schema 校验（递归）

**Schema 校验**:
- 对象类型: 检查必填字段、递归校验属性
- 数组类型: 递归校验数组项
- 基础类型: string、number、integer、boolean、object、array

**错误返回**:
- 返回详细的错误信息
- 包含字段路径
- 包含期望类型

### 3.9 服务器启动流程

**实现位置**: `src/scripts/serve-mock.ts:55-113`

**启动步骤**:
1. **配置加载**:
   - 加载 `apifox.config.json`
   - 加载 `mock.config.js`

2. **端口检查**:
   - 检查端口占用
   - 清理占用进程（Windows）
   - 等待端口释放

3. **路由加载**:
   - 扫描并加载所有 Mock 文件
   - 注册到 `RouteManager`
   - 输出加载的路由数量

4. **服务器创建**:
   - 创建 Express 应用
   - 配置中间件
   - 设置路由处理

5. **服务器启动**:
   - 监听指定端口
   - 输出启动信息
   - 显示工作模式、目标服务器、路由数量

6. **热重载启动**:
   - 启动文件监听
   - 输出监听目录信息

### 3.10 错误处理机制

**错误类型**:
1. **配置错误**:
   - 配置文件不存在
   - 配置格式错误
   - 必填字段缺失

2. **路由错误**:
   - 路由未找到（404）
   - 参数校验失败（400）
   - Mock 函数执行错误（500）

3. **代理错误**:
   - 网络错误
   - 目标服务器错误
   - 返回 500 错误响应

4. **文件加载错误**:
   - 文件不存在
   - 模块导入失败
   - 函数查找失败

**错误响应格式**:
```json
{
  "code": 400/404/500,
  "message": "错误描述",
  "error": "详细错误信息",
  "data": null
}
```

### 3.11 可测试点（以配置为中心）

**测试核心思路**: 验证每个配置项对应的服务器状态、响应等是否符合预期。主要依托代理模式验证功能，Mock 模式下对应的 mock 文件已经生成好了，主要测试服务器是否能正确使用这些文件。

#### 3.11.1 model 配置测试
**测试目标**: 验证 `model` 配置对应的服务器工作模式是否符合预期

- ✅ **model='mock' 时**:
  - 服务器启动后，所有请求应使用 Mock 模式处理
  - 请求应匹配已生成的 mock 文件中的路由
  - 响应应返回 mock 文件中定义的 Mock 数据
  - 未匹配到路由时应返回 404 错误

- ✅ **model='proxy' 时**:
  - 服务器启动后，所有请求应使用代理模式处理
  - 请求应转发到 `target` 配置的目标服务器
  - 响应应原样返回目标服务器的响应（状态码、响应头、响应体）
  - 网络错误时应返回 500 错误响应

- ✅ **模式切换验证**:
  - 通过 URL 参数 `?remote=mock` 可以临时切换到 Mock 模式
  - 通过 URL 参数 `?remote=http://...` 可以临时切换到指定目标代理
  - 通过 `mockRoutes` 配置可以指定某些路由强制使用 Mock
  - 通过 `proxyRoutes` 配置可以指定某些路由强制使用代理

#### 3.11.2 port 配置测试
**测试目标**: 验证 `port` 配置对应的服务器监听状态是否符合预期

- ✅ **端口监听**:
  - 服务器应在配置的端口上成功启动
  - 可以通过 `http://localhost:{port}` 访问服务器
  - 端口占用时应自动清理并重新启动

- ✅ **端口配置验证**:
  - 默认端口为 10000
  - 自定义端口配置应生效
  - 端口配置错误时应输出错误信息

#### 3.11.3 target 配置测试
**测试目标**: 验证 `target` 配置对应的代理目标是否符合预期

- ✅ **代理目标配置**:
  - `target` 配置应作为默认代理目标
  - 请求应正确转发到 `target` 指定的服务器
  - URL 拼接应正确处理（路径、查询参数、末尾斜杠）

- ✅ **代理功能验证**（通过代理验证主要功能）:
  - 请求头应正确转发到目标服务器（排除连接层头部）
  - 响应头应正确转发回客户端（排除连接层头部）
  - 响应体应原样返回
  - 状态码应原样返回（包括 2xx、4xx、5xx）
  - 支持所有 HTTP 方法（GET、POST、PUT、DELETE、PATCH 等）

- ✅ **目标地址覆盖**:
  - `remote` URL 参数指定的目标地址应覆盖默认 `target`
  - 覆盖后应正确转发到新目标地址

#### 3.11.4 remoteTarget 配置测试
**测试目标**: 验证 `remoteTarget` 配置对应的 URL 参数解析功能是否符合预期

- ✅ **remoteTarget=true 时**:
  - 应从 Referer 头中解析 `remote` URL 参数
  - `remote=mock` 应强制使用 Mock 模式
  - `remote=http://...` 应强制使用代理模式并指定目标
  - `remote=https://...` 应支持 HTTPS 目标

- ✅ **remoteTarget=false 时**:
  - 应忽略 Referer 头中的 `remote` 参数
  - 应使用默认的 `model` 模式或路由规则

- ✅ **优先级验证**:
  - `remote` 参数优先级应高于 `mockRoutes/proxyRoutes`
  - `remote` 参数优先级应高于默认 `model`

#### 3.11.5 pathPrefixes 配置测试
**测试目标**: 验证 `pathPrefixes` 配置对应的路径标准化功能是否符合预期

- ✅ **路径前缀匹配**:
  - 请求路径应正确匹配配置的前缀
  - 匹配成功时应去除前缀得到标准化路径
  - 未匹配时应使用原始路径

- ✅ **路由查找**:
  - 应使用标准化路径查找 mock 文件中的路由
  - 同时应支持原始路径查找（兼容性）
  - 多个前缀配置时应支持任一前缀匹配

- ✅ **前缀标准化**:
  - 无前导斜杠的前缀应自动添加 `/`
  - 有末尾斜杠的前缀应自动去除
  - 空前缀或 `/` 前缀应被忽略

#### 3.11.6 mockRoutes 配置测试
**测试目标**: 验证 `mockRoutes` 配置对应的强制 Mock 路由是否符合预期

- ✅ **路由规则匹配**:
  - 路径字符串匹配（如 `/api/user`）
  - 方法+路径匹配（如 `GET /api/user`）
  - 应同时匹配原始路径和标准化路径

- ✅ **强制 Mock 模式**:
  - 匹配的路由应强制使用 Mock 模式
  - 即使默认 `model='proxy'` 也应使用 Mock
  - 应正确加载并执行 mock 文件中的函数

- ✅ **优先级验证**:
  - `mockRoutes` 优先级应高于默认 `model`
  - `mockRoutes` 优先级应低于 `proxyRoutes`
  - `mockRoutes` 优先级应低于 `remote` 参数

#### 3.11.7 proxyRoutes 配置测试
**测试目标**: 验证 `proxyRoutes` 配置对应的强制代理路由是否符合预期

- ✅ **路由规则匹配**:
  - 路径字符串匹配（如 `/api/payment`）
  - 方法+路径匹配（如 `POST /api/payment`）
  - 应同时匹配原始路径和标准化路径

- ✅ **强制代理模式**:
  - 匹配的路由应强制使用代理模式
  - 即使默认 `model='mock'` 也应使用代理
  - 应正确转发到 `target` 配置的目标服务器

- ✅ **优先级验证**:
  - `proxyRoutes` 优先级应高于默认 `model`
  - `proxyRoutes` 优先级应高于 `mockRoutes`
  - `proxyRoutes` 优先级应低于 `remote` 参数

#### 3.11.8 Mock 文件使用测试（mock 模式下）
**测试目标**: 验证 Mock 模式下服务器是否能正确使用已生成的 mock 文件

- ✅ **路由加载**:
  - 应正确扫描 `mockDir` 目录下的所有 `.js` 文件
  - 应正确提取路由信息（路径、方法）
  - 应正确加载并注册路由到 RouteManager

- ✅ **Mock 函数执行**:
  - 应正确查找并执行 mock 文件中的处理函数
  - 应正确传递路径参数、查询参数、请求体
  - 应正确处理 Promise 响应
  - 应正确返回 JSON 响应

- ✅ **参数校验**:
  - 应正确执行 mock 文件中生成的参数校验逻辑
  - 校验失败时应返回 400 错误
  - 校验成功时应继续执行 Mock 函数

- ✅ **Mock 数据生成**:
  - 应正确使用 Mock.js 生成动态数据
  - 应正确返回 mock 文件中定义的响应结构
  - 应正确处理特殊字段（code、msg）

#### 3.11.9 代理功能验证测试（proxy 模式下）
**测试目标**: 通过代理模式验证服务器的主要功能是否符合预期

- ✅ **请求转发**:
  - 应正确转发所有 HTTP 方法（GET、POST、PUT、DELETE、PATCH）
  - 应正确拼接目标地址和请求路径
  - 应正确添加查询参数到 URL

- ✅ **请求头转发**:
  - 应正确复制所有请求头
  - 应排除连接层头部（host、connection、keep-alive、transfer-encoding）
  - 应保留自定义头部（authorization、content-type 等）

- ✅ **响应处理**:
  - 应原样返回状态码（包括 2xx、4xx、5xx）
  - 应原样返回响应体（JSON、文本、二进制等）
  - 应正确转发响应头（排除连接层头部）

- ✅ **错误处理**:
  - 网络错误时应返回 500 错误响应
  - 目标服务器错误时应原样返回错误响应
  - 错误响应应包含详细的错误信息

#### 3.11.10 组合配置测试
**测试目标**: 验证多个配置项组合使用时的行为是否符合预期

- ✅ **配置组合验证**:
  - `model='proxy'` + `mockRoutes` 组合
  - `model='mock'` + `proxyRoutes` 组合
  - `pathPrefixes` + `mockRoutes/proxyRoutes` 组合
  - `remoteTarget=true` + `remote` 参数组合

- ✅ **优先级组合验证**:
  - `remote` 参数 > `proxyRoutes` > `mockRoutes` > `model`
  - 各优先级应正确生效

### 3.12 详细测试场景（以配置为中心）

#### 3.12.1 model 配置测试场景

**场景 1: model='mock' 基础功能验证**
1. 配置 `model: 'mock'`
2. 启动服务器
3. 发送请求到已生成 mock 文件的接口
4. **验证**: 响应应返回 mock 文件中定义的 Mock 数据
5. **验证**: 响应状态码应为 200
6. **验证**: 响应体结构应符合 mock 文件定义

**场景 2: model='proxy' 基础功能验证**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 发送 GET 请求到 `/get`
4. **验证**: 请求应转发到 `https://httpbin.org/get`
5. **验证**: 响应应原样返回目标服务器的响应
6. **验证**: 响应状态码应与目标服务器一致

**场景 3: model='mock' 时未匹配路由处理**
1. 配置 `model: 'mock'`
2. 启动服务器
3. 发送请求到不存在的路由
4. **验证**: 应返回 404 错误
5. **验证**: 错误响应格式应符合标准格式

**场景 4: model='proxy' 时网络错误处理**
1. 配置 `model: 'proxy'`, `target: 'http://invalid-domain.com'`
2. 启动服务器
3. 发送请求
4. **验证**: 应返回 500 错误响应
5. **验证**: 错误信息应包含网络错误详情

#### 3.12.2 port 配置测试场景

**场景 1: 默认端口启动**
1. 不配置 `port`（使用默认值 10000）
2. 启动服务器
3. **验证**: 服务器应在端口 10000 上启动
4. **验证**: 可以通过 `http://localhost:10000` 访问

**场景 2: 自定义端口启动**
1. 配置 `port: 20000`
2. 启动服务器
3. **验证**: 服务器应在端口 20000 上启动
4. **验证**: 可以通过 `http://localhost:20000` 访问

**场景 3: 端口占用处理**
1. 配置 `port: 10000`
2. 启动第一个服务器实例
3. 启动第二个服务器实例（相同端口）
4. **验证**: 应检测到端口占用
5. **验证**: 应自动清理占用进程（Windows）
6. **验证**: 第二个实例应成功启动

#### 3.12.3 target 配置测试场景

**场景 1: HTTP 目标代理**
1. 配置 `model: 'proxy'`, `target: 'http://httpbin.org'`
2. 启动服务器
3. 发送 GET 请求到 `/get?test=value`
4. **验证**: 请求应转发到 `http://httpbin.org/get?test=value`
5. **验证**: 响应应正确返回

**场景 2: HTTPS 目标代理**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 发送请求
4. **验证**: 请求应正确转发到 HTTPS 目标
5. **验证**: SSL 连接应正常建立

**场景 3: 带端口的目标代理**
1. 配置 `model: 'proxy'`, `target: 'http://localhost:8080'`
2. 启动服务器
3. 发送请求到 `/api/test`
4. **验证**: 请求应转发到 `http://localhost:8080/api/test`

**场景 4: 目标地址末尾斜杠处理**
1. 配置 `model: 'proxy'`, `target: 'http://httpbin.org/'`
2. 启动服务器
3. 发送请求到 `/get`
4. **验证**: 最终 URL 应为 `http://httpbin.org/get`（无重复斜杠）

**场景 5: 请求头转发验证（通过代理）**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 发送请求到 `/headers`，携带自定义请求头
4. **验证**: 请求头应正确转发到目标服务器
5. **验证**: 响应应包含转发的请求头信息

**场景 6: 响应头转发验证（通过代理）**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 发送请求到 `/response-headers?key=value`
4. **验证**: 响应头应正确转发回客户端
5. **验证**: 连接层头部应被排除

**场景 7: 所有 HTTP 方法支持验证（通过代理）**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 分别发送 GET、POST、PUT、DELETE、PATCH 请求
4. **验证**: 所有方法应正确转发
5. **验证**: POST/PUT/PATCH 的请求体应正确转发

#### 3.12.4 remoteTarget 配置测试场景

**场景 1: remoteTarget=true 时解析 remote=mock**
1. 配置 `model: 'proxy'`, `remoteTarget: true`
2. 启动服务器并注册 mock 路由
3. 发送请求，Referer 头包含 `?remote=mock`
4. **验证**: 应强制使用 Mock 模式
5. **验证**: 应返回 mock 数据而非代理响应

**场景 2: remoteTarget=true 时解析 remote=URL**
1. 配置 `model: 'mock'`, `target: 'http://original.com'`, `remoteTarget: true`
2. 启动服务器
3. 发送请求，Referer 头包含 `?remote=https://httpbin.org`
4. **验证**: 应强制使用代理模式
5. **验证**: 应转发到 `https://httpbin.org` 而非 `http://original.com`

**场景 3: remoteTarget=false 时忽略 remote 参数**
1. 配置 `model: 'proxy'`, `remoteTarget: false`
2. 启动服务器
3. 发送请求，Referer 头包含 `?remote=mock`
4. **验证**: 应忽略 `remote` 参数
5. **验证**: 应使用默认 `model='proxy'` 模式

**场景 4: remote 参数优先级验证**
1. 配置 `model: 'proxy'`, `remoteTarget: true`, `mockRoutes: ['/api/test']`
2. 启动服务器并注册 mock 路由
3. 发送请求到 `/api/test`，Referer 头包含 `?remote=mock`
4. **验证**: `remote` 参数优先级应高于 `mockRoutes`
5. **验证**: 应使用 Mock 模式（虽然已在 mockRoutes 中）

#### 3.12.5 pathPrefixes 配置测试场景

**场景 1: 单个前缀路径标准化**
1. 配置 `pathPrefixes: '/api'`
2. 启动服务器，mock 文件中有路由 `/v1/user/info`
3. 发送请求到 `/api/v1/user/info`
4. **验证**: 路径应标准化为 `/v1/user/info`
5. **验证**: 应匹配到 mock 文件中的路由
6. **验证**: 应返回正确的 mock 数据

**场景 2: 多个前缀路径匹配**
1. 配置 `pathPrefixes: ['/api', '/v1']`
2. 启动服务器
3. 分别发送请求到 `/api/test` 和 `/v1/test`
4. **验证**: 两个请求都应正确匹配前缀
5. **验证**: 标准化后的路径应正确查找路由

**场景 3: 前缀标准化（无前导斜杠）**
1. 配置 `pathPrefixes: 'api'`（无前导斜杠）
2. 启动服务器
3. 发送请求到 `/api/test`
4. **验证**: 前缀应自动添加前导斜杠
5. **验证**: 路径匹配应正常工作

**场景 4: 前缀标准化（有末尾斜杠）**
1. 配置 `pathPrefixes: '/api/'`（有末尾斜杠）
2. 启动服务器
3. 发送请求到 `/api/test`
4. **验证**: 前缀应自动去除末尾斜杠
5. **验证**: 路径匹配应正常工作

**场景 5: 路径等于前缀时的处理**
1. 配置 `pathPrefixes: '/api'`
2. 启动服务器
3. 发送请求到 `/api`
4. **验证**: 标准化路径应为 `/`
5. **验证**: 应能正确查找根路径路由（如有）

#### 3.12.6 mockRoutes 配置测试场景

**场景 1: 路径字符串匹配强制 Mock**
1. 配置 `model: 'proxy'`, `mockRoutes: ['/api/user']`
2. 启动服务器并注册 mock 路由
3. 发送请求到 `/api/user`
4. **验证**: 应强制使用 Mock 模式
5. **验证**: 应返回 mock 数据而非代理响应

**场景 2: 方法+路径匹配强制 Mock**
1. 配置 `model: 'proxy'`, `mockRoutes: ['GET /api/user']`
2. 启动服务器并注册 mock 路由
3. 发送 GET 请求到 `/api/user`
4. **验证**: 应强制使用 Mock 模式
5. **验证**: POST 请求到同一路径应使用默认 proxy 模式

**场景 3: 标准化路径匹配**
1. 配置 `model: 'proxy'`, `pathPrefixes: '/api'`, `mockRoutes: ['/user']`
2. 启动服务器，mock 文件中有路由 `/user`
3. 发送请求到 `/api/user`
4. **验证**: 应匹配标准化路径 `/user`
5. **验证**: 应强制使用 Mock 模式

**场景 4: 多个路由规则匹配**
1. 配置 `model: 'proxy'`, `mockRoutes: ['/api/user', '/api/order']`
2. 启动服务器并注册 mock 路由
3. 分别发送请求到两个路由
4. **验证**: 两个路由都应强制使用 Mock 模式

#### 3.12.7 proxyRoutes 配置测试场景

**场景 1: 路径字符串匹配强制代理**
1. 配置 `model: 'mock'`, `target: 'https://httpbin.org'`, `proxyRoutes: ['/api/payment']`
2. 启动服务器并注册 mock 路由
3. 发送请求到 `/api/payment`
4. **验证**: 应强制使用代理模式
5. **验证**: 应转发到目标服务器而非返回 mock 数据

**场景 2: 方法+路径匹配强制代理**
1. 配置 `model: 'mock'`, `target: 'https://httpbin.org'`, `proxyRoutes: ['POST /api/payment']`
2. 启动服务器并注册 mock 路由
3. 发送 POST 请求到 `/api/payment`
4. **验证**: 应强制使用代理模式
5. **验证**: GET 请求到同一路径应使用默认 mock 模式

**场景 3: proxyRoutes 优先级高于 mockRoutes**
1. 配置 `model: 'mock'`, `target: 'https://httpbin.org'`, `mockRoutes: ['/api/test']`, `proxyRoutes: ['/api/test']`
2. 启动服务器并注册 mock 路由
3. 发送请求到 `/api/test`
4. **验证**: `proxyRoutes` 优先级应更高
5. **验证**: 应使用代理模式而非 Mock 模式

#### 3.12.8 Mock 文件使用测试场景（mock 模式下）

**场景 1: 路由加载验证**
1. 配置 `model: 'mock'`
2. 确保 `mockDir` 目录下有已生成的 mock 文件
3. 启动服务器
4. **验证**: 应扫描并加载所有 `.js` 文件
5. **验证**: 应正确提取路由信息（路径、方法）
6. **验证**: 应正确注册到 RouteManager

**场景 2: Mock 函数执行验证**
1. 配置 `model: 'mock'`
2. 启动服务器，mock 文件中有函数 `GetUser`
3. 发送 GET 请求到对应路由
4. **验证**: 应正确查找并执行 `GetUser` 函数
5. **验证**: 应正确传递查询参数、请求体
6. **验证**: 应正确返回函数生成的响应

**场景 3: 路径参数提取验证**
1. 配置 `model: 'mock'`
2. 启动服务器，mock 文件中有路由 `/user/{id}`
3. 发送请求到 `/user/123`
4. **验证**: 应正确提取路径参数 `id=123`
5. **验证**: 参数应传递到 Mock 函数的 `ctx.params`

**场景 4: 参数校验验证**
1. 配置 `model: 'mock'`
2. 启动服务器，mock 文件中有参数校验逻辑
3. 发送请求，缺少必需参数
4. **验证**: 应返回 400 错误
5. **验证**: 错误信息应包含参数校验失败详情

**场景 5: Promise 响应处理验证**
1. 配置 `model: 'mock'`
2. 启动服务器，mock 文件中有异步函数
3. 发送请求
4. **验证**: 应正确处理 Promise 响应
5. **验证**: 应等待异步操作完成后再返回响应

#### 3.12.9 代理功能验证测试场景（proxy 模式下）

**场景 1: 请求转发完整性验证**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 发送 POST 请求到 `/post`，携带请求体
4. **验证**: 请求应正确转发
5. **验证**: 请求体应正确转发
6. **验证**: 响应应正确返回

**场景 2: 状态码原样返回验证**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 发送请求到 `/status/404`（返回 404）
4. **验证**: 响应状态码应为 404（而非 200）
5. **验证**: 响应体应正确返回

**场景 3: 响应体类型验证**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`
2. 启动服务器
3. 分别发送请求获取 JSON、文本、二进制响应
4. **验证**: 各种类型的响应体应正确返回
5. **验证**: Content-Type 应正确转发

#### 3.12.10 组合配置测试场景

**场景 1: model='proxy' + mockRoutes 组合**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`, `mockRoutes: ['/api/user']`
2. 启动服务器并注册 mock 路由
3. 发送请求到 `/api/user`（在 mockRoutes 中）
4. **验证**: 应使用 Mock 模式
5. 发送请求到 `/api/order`（不在 mockRoutes 中）
6. **验证**: 应使用代理模式

**场景 2: pathPrefixes + mockRoutes 组合**
1. 配置 `pathPrefixes: '/api'`, `mockRoutes: ['/user']`
2. 启动服务器，mock 文件中有路由 `/user`
3. 发送请求到 `/api/user`
4. **验证**: 路径应标准化为 `/user`
5. **验证**: 应匹配 `mockRoutes` 规则
6. **验证**: 应使用 Mock 模式

**场景 3: 完整优先级链验证**
1. 配置 `model: 'proxy'`, `target: 'https://httpbin.org'`, `remoteTarget: true`, `mockRoutes: ['/api/test']`, `proxyRoutes: ['/api/test']`
2. 启动服务器并注册 mock 路由
3. 场景 3.1: 发送请求，Referer 包含 `?remote=mock`
   - **验证**: 应使用 Mock 模式（remote 优先级最高）
4. 场景 3.2: 发送请求，无 Referer
   - **验证**: 应使用代理模式（proxyRoutes 优先级高于 mockRoutes）
5. 场景 3.3: 移除 proxyRoutes，发送请求
   - **验证**: 应使用 Mock 模式（mockRoutes 优先级高于 model）

## 4. 生成文件结构分析

### 4.1 Mock 文件结构

**文件位置**: `{mockDir}/{groupPath}.js`

**文件结构**:
```javascript
import Mock from "mockjs";
import lodash from "lodash";

// [start]/api/user[GET]
/**
 * @apiName 获取用户信息
 * @apiURI /api/user
 * @apiRequestType GET
 */
export function GetUser(query, body, ctx) {
    // 参数校验逻辑
    // Mock 数据生成
    return Mock.mock({...});
}
// [end]

// [start]/api/user[POST]
// ...
// [end]
```

**关键特性**:
- ✅ 文件架构自动生成（import 语句）
- ✅ 增量更新（按块更新接口）
- ✅ 参数校验（必需参数、类型校验）
- ✅ Mock 数据生成（使用 Mockjs）
- ✅ 特殊字段处理（code、msg）

### 4.2 TypeScript 类型文件结构

**文件位置**: `{typesDir}/{groupPath}.ts`

**文件结构**:
```typescript
// [start]/api/user[GET]
export namespace GetUser {
  /** 响应体 */
  export interface Res {
    code: number;
    msg: string;
    data: ResData;
  }
  
  export interface ResData {
    id: number;
    name: string;
  }
}
// [end]
```

**关键特性**:
- ✅ 命名空间生成（基于路径和方法）
- ✅ 类型定义（接口、枚举、联合类型）
- ✅ 嵌套类型处理
- ✅ 循环引用检测
- ✅ 自引用处理（children 字段）
- ✅ 中文 schema 名称映射

### 4.3 特殊场景处理

#### Mock 文件特殊场景

##### 3.3.1 文件架构生成
1. **基础架构生成**: 验证 import Mock、import lodash、insert-flag 标记
2. **重复 import 清理**: 验证重复的 import 语句被正确清理
3. **增量更新**: 验证新接口追加到现有文件，不覆盖已有内容
4. **文件不存在处理**: 验证文件不存在时自动创建基础架构

##### 3.3.2 参数校验生成
1. **Query 参数校验**: 验证 query 参数的必需性和类型校验
2. **Body 参数校验**: 验证 body 参数的必需性和类型校验（仅 body 参数进行类型校验）
3. **Path 参数校验**: 验证路径参数的必需性
4. **混合参数**: 验证同时存在 query、body、path 参数的处理
5. **无参数接口**: 验证没有参数的接口不生成参数校验代码
6. **可选参数**: 验证可选参数（required=false）的处理
7. **必需参数缺失**: 验证必需参数缺失时返回错误响应

##### 3.3.3 基本类型 Mock 生成
1. **string 类型**:
   - 优先使用 example 值
   - 使用枚举值（enum）时生成 @pick([...])
   - 无 example 和 enum 时使用 @cword(3, 8)
2. **number/integer 类型**:
   - 优先使用 example 值
   - 使用枚举值（enum）时生成 @pick([...])
   - 使用范围（minimum/maximum）时生成 @integer(min, max) 或 @float(min, max, 2, 2)
3. **boolean 类型**:
   - 优先使用 example 值
   - 无 example 时使用 @boolean
4. **array 类型**:
   - 生成数组模板 [itemTemplate]
   - 处理数组项的引用（$ref）
   - 处理数组项的 x-apifox-refs
   - 处理空对象数组项
5. **object 类型**:
   - 递归生成对象属性
   - 处理空对象（无 properties）
   - 处理嵌套对象

##### 3.3.4 引用和循环引用处理
1. **$ref 引用处理**:
   - 正确解析 $ref 路径（#/components/schemas/xxx）
   - URL 编码的 schema 名称解码（decodeURIComponent）
   - 从 definitions 中查找引用的 schema
2. **循环引用检测**:
   - 使用 visitedRefs Set 跟踪已访问的引用
   - 检测到循环引用时返回 '{}' 并输出警告
   - 验证循环引用不会导致无限递归
3. **递归深度限制**:
   - 超过 depth > 3 时返回基本对象结构
   - 验证深度限制防止栈溢出
   - 验证超过深度限制时仍生成基本字段结构

##### 3.3.5 特殊字段处理
1. **code 字段**:
   - 当 fieldName === 'code' 且类型为 integer/number 时
   - 生成 `Math.random() < 0.05 ? 1 : 0`（5% 概率返回 1）
2. **msg 字段**:
   - 当 fieldName === 'msg' 且类型为 string 时
   - 生成 `Math.random() < 0.5 ? '接口调用失败:${apiInfo}' : '接口调用成功'`
3. **code 和 msg 关联**:
   - 当同时存在 code 和 msg 字段时
   - 使用共享的 randomCode 变量
   - msg 根据 randomCode 生成相应消息
   - 包装在 IIFE 中生成共享随机数

##### 3.3.6 Apifox Mock 规则处理
1. **x-apifox-mock 提取**:
   - 支持字符串格式: `schema['x-apifox-mock'] = "{{@cname}}"`
   - 支持对象格式: `schema['x-apifox-mock'] = { mock: "{{@cname}}" }`
2. **中文字符过滤**:
   - 检测 mock 规则中的中文字符
   - 包含中文时返回 null，使用回退策略
3. **Apifox 模板语法转换**:
   - 转换 {{...}} 语法为 Mock.js 语法
   - 使用配置文件中的映射规则（MockMappingsLoader）
   - 精确匹配和模糊匹配
   - 已经是 Mock.js 语法（@开头）或正则表达式（/开头）时直接返回

##### 3.3.7 枚举类型处理
1. **enum 属性**:
   - 使用 @pick([...]) 从枚举值中选择
   - 支持字符串和数字枚举值
2. **x-apifox-enum 属性**:
   - 提取枚举项（value:name 格式）
   - 在注释中展示枚举选项
   - 格式: `// 字段说明 value1:name1, value2:name2`

##### 3.3.8 数组类型特殊处理
1. **数组项为引用**:
   - 处理 `schema.items.$ref`
   - 递归生成引用的 schema 的 mock 模板
2. **数组项为 x-apifox-refs**:
   - 处理 `schema.items['x-apifox-refs']`
   - 从 refs 中提取第一个引用
   - 处理空对象类型的数组项
3. **数组项为空对象**:
   - 当 `schema.items.type === 'object'` 且无 properties 时
   - 尝试从 x-apifox-refs 中获取引用
   - 无引用时返回 '{}'
4. **数组长度控制**:
   - 使用 Mock.js 语法 `'field|0-11'` 控制数组长度

##### 3.3.9 函数命名和命名空间
1. **资源名称生成**:
   - 从路径段提取资源名（最后一个静态段）
   - 过滤路径参数（{param}）
   - 转换为驼峰命名
2. **路径参数处理**:
   - 有路径参数时生成 `ResourceNameByParamName` 格式
   - 无路径参数时使用基础资源名
3. **方法后缀**:
   - 非 GET 方法添加方法后缀（如 PostUser）
   - GET 方法不添加后缀

##### 3.3.10 注释和标记
1. **块标记**:
   - 开始标记: `// [start]${path}[${method}]`
   - 结束标记: `// [end]${path}[${method}]`
2. **API 注释**:
   - @apiName: 接口名称
   - @apiURI: 接口路径
   - @apiRequestType: HTTP 方法
3. **字段注释**:
   - 包含字段说明（title/description）
   - 包含枚举选项（x-apifox-enum）

#### TypeScript 类型文件特殊场景

##### 3.3.11 命名空间生成
1. **命名空间名称生成**:
   - 从路径段生成（过滤路径参数）
   - 转换为驼峰命名（PascalCase）
   - 有路径参数时添加 `By${ParamName}` 后缀
   - 添加方法后缀（GetUser、PostUser）
2. **命名空间结构**:
   - 导出命名空间: `export namespace ${namespaceName}`
   - 包含响应体类型（Res）
   - 包含请求体类型（ReqData）
   - 包含参数类型（PathParams、Query）
   - 包含完整请求类型（Req）

##### 3.3.12 响应体类型生成
1. **Res 接口生成**:
   - 从 responseBody schema 生成
   - 支持对象字面量类型
   - 支持接口继承（extends）
   - 支持接口展开（直接展开字段）
2. **标准响应体处理**:
   - 检测标准响应体（包含 code、msg、data 字段）
   - 直接展开字段而不是返回空接口
   - 特殊处理 data 字段（生成 ResData 接口）

##### 3.3.13 请求体类型生成
1. **ReqData 接口生成**:
   - 从 requestBody schema 生成
   - 支持对象字面量类型
   - 支持接口继承
   - 支持接口展开
2. **PathParams 接口生成**:
   - 从 parameters 中提取 in === 'path' 的参数
   - 生成路径参数类型
   - 支持必需和可选参数
   - 支持 schema 类型定义（包括枚举）
3. **Query 接口生成**:
   - 从 parameters 中提取 in === 'query' 的参数
   - 生成查询参数类型
   - 支持必需和可选参数
   - 支持枚举类型（生成独立枚举类型）
4. **Req 接口生成**:
   - 组合 PathParams、Query、ReqData
   - 生成完整的请求参数类型

##### 3.3.14 基本类型映射
1. **类型映射**:
   - string → string
   - number/integer → number
   - boolean → boolean
   - array → T[]
   - object → interface
2. **可选属性**:
   - 根据 schema.required 数组判断
   - 必需属性无 `?`
   - 可选属性有 `?`

##### 3.3.15 引用和循环引用处理
1. **$ref 引用处理**:
   - 解析 $ref 路径
   - URL 编码的 schema 名称解码
   - 使用 schemaNameMap 映射中文名称
   - 从 definitions 中查找引用的 schema
2. **循环引用检测**:
   - 使用 visitedRefs Set 跟踪已访问的引用
   - 检测到循环引用时返回空接口 `export interface ${interfaceName} {}`
   - 输出警告日志
3. **递归深度限制**:
   - 超过 depth > 3 时返回空接口
   - 验证深度限制防止栈溢出

##### 3.3.16 自引用处理
1. **children 字段自引用**:
   - 检测字段名为 'children' 且引用的 schema 与当前 schema 相同
   - 直接使用父类型: `${interfaceName}[]`
   - 输出日志说明
2. **递归深度超过 1 层**:
   - 当 depth > 1 时，children 字段直接使用父类型
3. **自引用检测逻辑**:
   - `visitedRefs.has(decodedRefName)`: 已在访问集合中
   - `propName === 'children' && currentSchemaName === decodedRefName`: 字段名是 children 且引用自身
   - `propName === 'children' && refSchema === schema`: children 字段引用当前 schema 对象

##### 3.3.17 嵌套对象处理
1. **嵌套对象生成**:
   - 为嵌套对象生成独立接口
   - 接口名称: `${prefix}${PropName}`（驼峰命名）
   - 递归生成嵌套接口定义
2. **嵌套接口命名**:
   - 使用类型前缀（Res、ReqData 等）
   - 属性名首字母大写并转换为驼峰
   - 避免命名冲突

##### 3.3.18 数组类型处理
1. **数组项为引用**:
   - 处理 `prop.items.$ref`
   - 生成数组项接口: `${interfaceName}${PropName}Item`
   - 检测自引用（children 字段）
2. **数组项为 x-apifox-refs**:
   - 处理 `prop.items['x-apifox-refs']`
   - 从 refs 中提取第一个引用
   - 检测自引用
3. **数组项为对象**:
   - 当 `prop.items.type === 'object'` 且有 properties 时
   - 生成数组项接口
   - 检测对象自引用（prop.items === schema）
4. **数组项为基本类型**:
   - 直接使用类型映射: `string[]`、`number[]` 等

##### 3.3.19 枚举类型处理
1. **enum 属性**:
   - 生成独立枚举类型: `export type ${EnumTypeName} = value1 | value2 | ...`
   - 字符串值使用单引号: `'value1' | 'value2'`
   - 数字值直接使用
2. **x-apifox-enum 属性**:
   - 在注释中展示枚举选项
   - 格式: `/** 字段说明 value1:name1, value2:name2 */`
3. **查询参数枚举**:
   - 为查询参数的枚举生成独立类型
   - 类型名称: `Query${ParamName}`（驼峰命名）

##### 3.3.20 标准响应体展开
1. **标准响应体检测**:
   - 检测 schema 是否包含 code、msg、data 字段
   - 如果包含，则展开字段而不是返回空接口
2. **data 字段特殊处理**:
   - 强制生成 ResData 接口
   - 如果 data 类型为 null，生成 `export type ResData = null;`
   - 否则生成 ResData 接口定义

##### 3.3.21 中文 Schema 名称处理
1. **URL 编码处理**:
   - 将中文 schema 名称进行 URL 编码
   - 解码时使用 decodeURIComponent
2. **名称映射**:
   - 建立 schemaNameMap 映射关系
   - 中文名称映射到英文名称（提取括号中的英文部分）
   - 保留原始名称和编码名称的映射
3. **类型名称生成**:
   - 优先使用映射后的英文名称
   - 无映射时使用原始名称

##### 3.3.22 Apifox 扩展属性处理
1. **x-apifox-refs 处理**:
   - 从 x-apifox-refs 中提取引用
   - 处理对象属性的 x-apifox-refs
   - 处理数组项的 x-apifox-refs
2. **x-apifox-enum 处理**:
   - 在注释中展示枚举选项
   - 不影响类型定义（仍使用 enum 属性）

##### 3.3.23 复杂类型定义管理
1. **类型上下文**:
   - 使用 TypeGenerationContext 管理已生成的类型
   - generatedTypes Set 跟踪已生成的类型名称
   - complexTypes Map 存储复杂类型定义
2. **类型去重**:
   - 检查类型是否已生成，避免重复生成
   - 已生成的类型直接引用
3. **类型定义收集**:
   - 在命名空间末尾生成所有复杂类型定义
   - 包括嵌套接口、枚举类型等

##### 3.3.24 属性名处理
1. **驼峰命名转换**:
   - 下划线命名转换为驼峰: `user_name` → `userName`
   - 保持属性名不变，仅在需要时使用引号
2. **引号使用**:
   - 属性名包含特殊字符时使用引号: `'user-name'`
   - 属性名与驼峰命名不同时使用引号
3. **注释生成**:
   - 包含字段说明（title/description）
   - 包含枚举选项（x-apifox-enum）

##### 3.3.25 空值和边界情况
1. **空 schema 处理**:
   - schema 为 null/undefined 时返回 `{}`
   - 无 properties 的对象返回 `{}`
2. **空数组处理**:
   - 无 items 定义的数组返回 `any[]`
3. **未知类型处理**:
   - 未知类型尝试生成基本结构
   - 回退策略：字符串返回空字符串，其他返回空对象

## 5. 测试策略

### 4.1 配置验证测试
- 单元测试：每个配置项的加载和验证
- 集成测试：配置项组合使用
- 边界测试：无效配置、缺失配置

### 4.2 文件生成测试

#### 4.2.1 Mock 文件结构测试
1. **文件架构验证**:
   - 验证 import Mock from "mockjs" 存在
   - 验证 import lodash from "lodash" 存在
   - 验证 // [insert-flag] 标记存在
   - 验证重复 import 被清理
2. **块标记验证**:
   - 验证每个接口有开始标记 `// [start]${path}[${method}]`
   - 验证每个接口有结束标记 `// [end]${path}[${method}]`
   - 验证标记成对出现
3. **函数导出验证**:
   - 验证每个接口有 export function
   - 验证函数名符合命名规范
   - 验证函数参数（query, body, ctx）

#### 4.2.2 Mock 文件内容测试
1. **参数校验逻辑**:
   - 验证必需参数校验代码存在
   - 验证类型校验代码存在（仅 body 参数）
   - 验证参数缺失时返回错误响应
   - 验证参数类型错误时返回错误响应
2. **Mock 数据生成**:
   - 验证 Mock.mock() 调用存在
   - 验证基本类型 mock 值正确（string、number、boolean）
   - 验证数组类型 mock 模板正确
   - 验证对象类型 mock 模板正确
3. **特殊字段处理**:
   - 验证 code 字段生成随机值逻辑
   - 验证 msg 字段生成逻辑
   - 验证 code 和 msg 关联逻辑（共享 randomCode）

#### 4.2.3 Mock 文件特殊场景测试
1. **嵌套对象测试**:
   - 测试 1 层嵌套对象
   - 测试 2 层嵌套对象
   - 测试 3 层嵌套对象
   - 测试超过 3 层时的深度限制处理
2. **数组类型测试**:
   - 测试基本类型数组（string[]、number[]）
   - 测试对象数组
   - 测试引用类型数组（$ref）
   - 测试 x-apifox-refs 数组
   - 测试空对象数组项
3. **引用处理测试**:
   - 测试 $ref 引用解析
   - 测试 URL 编码的 schema 名称解码
   - 测试多层引用（A → B → C）
4. **循环引用测试**:
   - 测试直接循环引用（A → A）
   - 测试间接循环引用（A → B → A）
   - 验证循环引用检测和警告
   - 验证循环引用返回 '{}'
5. **枚举类型测试**:
   - 测试 enum 属性处理
   - 测试 x-apifox-enum 属性处理
   - 验证枚举值在注释中展示
6. **Apifox Mock 规则测试**:
   - 测试 x-apifox-mock 字符串格式
   - 测试 x-apifox-mock 对象格式
   - 测试中文字符过滤
   - 测试 Apifox 模板语法转换
7. **示例值优先测试**:
   - 验证 example 值优先于默认 mock 规则
   - 验证枚举值优先于默认 mock 规则
8. **空值和边界测试**:
   - 测试空 schema 处理
   - 测试无 properties 的对象
   - 测试无 items 的数组

#### 4.2.4 TypeScript 类型文件结构测试
1. **命名空间验证**:
   - 验证每个接口有 export namespace
   - 验证命名空间名称符合规范
   - 验证命名空间包含必要的类型定义
2. **类型定义验证**:
   - 验证 Res 接口存在（响应体）
   - 验证 ReqData 接口存在（如有请求体）
   - 验证 PathParams 接口存在（如有路径参数）
   - 验证 Query 接口存在（如有查询参数）
   - 验证 Req 接口存在（完整请求参数）

#### 4.2.5 TypeScript 类型文件内容测试
1. **基本类型映射**:
   - 验证 string → string
   - 验证 number/integer → number
   - 验证 boolean → boolean
   - 验证 array → T[]
2. **可选属性**:
   - 验证必需属性无 `?`
   - 验证可选属性有 `?`
3. **注释生成**:
   - 验证字段说明注释存在
   - 验证枚举选项注释存在

#### 4.2.6 TypeScript 类型文件特殊场景测试
1. **嵌套对象测试**:
   - 测试 1 层嵌套对象生成独立接口
   - 测试 2 层嵌套对象生成独立接口
   - 测试 3 层嵌套对象生成独立接口
   - 测试超过 3 层时的深度限制处理
2. **数组类型测试**:
   - 测试基本类型数组（string[]、number[]）
   - 测试对象数组生成 Item 接口
   - 测试引用类型数组（$ref）
   - 测试 x-apifox-refs 数组
3. **引用处理测试**:
   - 测试 $ref 引用解析
   - 测试 URL 编码的 schema 名称解码
   - 测试中文 schema 名称映射
   - 测试多层引用
4. **循环引用测试**:
   - 测试直接循环引用（A → A）
   - 测试间接循环引用（A → B → A）
   - 验证循环引用检测和警告
   - 验证循环引用返回空接口
5. **自引用测试**:
   - 测试 children 字段自引用
   - 验证自引用使用父类型
   - 测试递归深度超过 1 层的处理
6. **枚举类型测试**:
   - 测试 enum 属性生成独立类型
   - 测试 x-apifox-enum 属性在注释中展示
   - 验证查询参数枚举生成独立类型
7. **标准响应体测试**:
   - 测试标准响应体（code、msg、data）展开
   - 验证 data 字段生成 ResData 接口
   - 测试 data 为 null 时的处理
8. **Apifox 扩展属性测试**:
   - 测试 x-apifox-refs 处理
   - 测试 x-apifox-enum 处理
9. **复杂类型管理测试**:
   - 验证类型去重（不重复生成相同类型）
   - 验证复杂类型定义收集
   - 验证类型定义在命名空间末尾生成
10. **空值和边界测试**:
    - 测试空 schema 处理
    - 测试无 properties 的对象
    - 测试无 items 的数组

#### 4.2.7 文件生成集成测试
1. **多接口文件测试**:
   - 验证同一路径的多个接口（不同方法）在同一文件
   - 验证增量更新不覆盖已有接口
2. **文件目录结构测试**:
   - 验证文件按路径分组生成
   - 验证目录自动创建
3. **生成模式测试**:
   - 验证 generate=all 生成所有文件
   - 验证 generate=mock 只生成 Mock 文件
   - 验证 generate=types 只生成类型文件

### 4.3 服务器功能测试
- 路由匹配测试：路径匹配、方法匹配、参数提取
- 模式切换测试：mock/proxy 模式切换
- 代理功能测试：请求转发、响应处理

### 4.4 端到端测试
- 完整流程测试：配置加载 → 文件生成 → 服务器启动 → 请求处理
- 真实数据测试：使用真实 OpenAPI 数据验证
- 回归测试：确保重构后功能正常

### 4.5 测试数据准备
1. **真实 OpenAPI 数据**:
   - 使用项目真实的 Apifox 项目 ID 和 Token
   - 拉取真实的 OpenAPI 数据
   - 覆盖各种接口类型和数据结构
2. **测试用例数据**:
   - 准备包含各种特殊场景的测试数据
   - 包含嵌套对象、数组、引用、循环引用等
   - 包含中文 schema 名称、枚举类型等
3. **边界数据**:
   - 空 schema、空对象、空数组
   - 深度嵌套（超过 3 层）
   - 复杂循环引用

