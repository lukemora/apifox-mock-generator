# 更新日志

所有重要的项目变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2025-10-10

### ✨ 初始版本发布

#### 核心功能

- 🚀 **Apifox API 客户端** - 从 Apifox 项目拉取 API 接口定义
- 📝 **类型生成器** - 自动生成 TypeScript 类型文件（.ts 格式）
- 🎭 **Mock 生成器** - 基于 Schema 自动生成 Mock 数据文件
- 🌐 **Mock 服务器** - 基于 Express 的本地 Mock 服务
- 🔥 **热重载** - 修改 Mock 文件自动生效，无需重启服务器
- 🎯 **API 筛选** - 支持多种筛选规则精确控制导出的 API
  - 路径模式筛选（支持通配符 `*` 和 `**`）
  - HTTP 方法筛选
  - Apifox 标签筛选
  - 操作 ID 筛选
  - 排除废弃接口
- ⚡ **增量更新** - 智能识别文件变化，仅更新必要的内容
- 🎨 **代码格式化** - 使用 Prettier 格式化生成的代码

#### 命令行工具

- `npm run build` - 编译 TypeScript 代码
- `npm run generate` - 拉取 API 并生成 Mock 和类型文件
- `npm run serve` - 启动 Mock 服务器
- `npm run dev` - 开发模式（生成 + 服务器）

#### 服务器功能

- 🌐 **Express 服务器** - 快速响应的本地 Mock 服务
- 🔄 **动态路由** - 自动发现和加载 Mock 路由，零配置
- 🎯 **路由匹配** - 支持路径参数、查询参数、请求体
- ✅ **参数校验** - 基于 Schema 的请求参数验证
- 🔥 **文件监听** - 监听 Mock 文件变化并自动重载
- 🌍 **CORS 支持** - 跨域请求支持

#### 代码架构

- **core/** - 核心模块
  - `apifox-client.ts` - Apifox API 客户端
  - `config-loader.ts` - 配置加载器
  - `endpoint-filter.ts` - API 端点筛选器
  - `openapi-converter.ts` - OpenAPI 数据转换器
- **generators/** - 生成器模块
  - `mock-generator.ts` - Mock 文件生成器
  - `type-generator.ts` - TypeScript 类型生成器
  - `templates/` - 代码生成模板
- **server/** - Mock 服务器模块
  - `express-server.ts` - Express 服务器配置
  - `hot-reload.ts` - 热重载功能
  - `route-loader.ts` - 路由加载器
  - `route-manager.ts` - 路由管理器
  - `route-matcher.ts` - 路由匹配器
  - `validation.ts` - 参数校验
- **utils/** - 工具模块
  - `block-updater.ts` - 增量更新工具
  - `code-formatter.ts` - 代码格式化（Prettier）
  - `file-operations.ts` - 文件操作封装
  - `logger.ts` - 彩色日志工具
  - `path-utils.ts` - 路径处理工具
  - `type-mapping.ts` - OpenAPI 到 TypeScript 类型映射

#### 配置文件

- **apifox.config.json** - Apifox 项目配置和 API 筛选规则
  - `projectId` - Apifox 项目 ID
  - `token` - Apifox 访问令牌
  - `mockDir` - Mock 文件输出目录
  - `typesDir` - 类型文件输出目录
  - `mockPort` - Mock 服务器端口
  - `apiFilter` - API 筛选配置（服务端 + 客户端双重过滤）
- **tsconfig.json** - TypeScript 编译配置
- **package.json** - 项目依赖和脚本

#### 技术栈

- **语言**: TypeScript 5.3+
- **运行时**: Node.js 16+
- **Web 框架**: Express 4.x
- **HTTP 客户端**: Axios
- **Mock 数据**: @faker-js/faker, Mock.js
- **文件监听**: Chokidar
- **代码格式化**: Prettier
- **日志工具**: Chalk
- **API 工具**: Apifox CLI

#### 支持的 OpenAPI 特性

- ✅ OpenAPI 3.0 规范
- ✅ HTTP 方法：GET、POST、PUT、DELETE、PATCH
- ✅ 路径参数 (Path Parameters)
- ✅ 查询参数 (Query Parameters)
- ✅ 请求头 (Headers)
- ✅ 请求体 (Request Body)
- ✅ 响应体 (Response Body)
- ✅ 复杂对象类型
- ✅ 数组类型和嵌套数组
- ✅ 枚举类型 (enum)
- ✅ 嵌套对象和深层嵌套
- ✅ Schema 引用 ($ref)
- ✅ allOf / anyOf / oneOf
- ✅ 必填字段和可选字段

#### 已知限制

- ⚠️ 暂不支持 OpenAPI 2.0 (Swagger)
- ⚠️ 暂不支持文件上传/下载类型
- ⚠️ 暂不支持 WebSocket
- ⚠️ 暂不支持 GraphQL

### 📚 文档

- `README.md` - 完整的项目说明和使用指南
- `CHANGELOG.md` - 版本更新日志
- `apifox.config.json` - 详细的配置示例

## 贡献

欢迎贡献代码、报告问题或提出建议！

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

