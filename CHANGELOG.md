# 更新日志

所有重要的项目变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.3.2] - 2025-10-18

### 🐛 错误修复

- **引用解析修复** - 修复引用解析逻辑，确保正确解码引用名称，避免引用类型处理错误
- **数组类型处理增强** - 增强数组类型处理，支持空对象和引用类型的数组元素，提升复杂数据结构的 Mock 生成准确性
- **默认值处理优化** - 提供合理的默认值处理，避免返回 null，确保 Mock 数据生成的完整性和可用性

## [1.3.1] - 2025-10-18

### 🐛 错误修复

#### 🔧 配置和构建优化

- **package.json 更新** - 更新项目依赖和配置
- **构建优化** - 改进项目构建流程
- **版本管理** - 统一版本管理策略

### 🚀 技术改进

- **依赖更新** - 更新相关依赖包版本
- **构建稳定性** - 提升构建过程的稳定性
- **代码质量** - 持续改进代码质量

### 🔄 重构改进

#### 📝 接口名称优化

- **请求参数接口** - 更新请求参数接口名称以提高一致性
- **查询参数接口** - 更新查询参数接口名称以提高一致性
- **接口命名规范** - 统一接口命名规范，提升代码可读性
- **类型定义优化** - 优化类型定义结构，提高开发体验

## [1.3.0] - 2025-10-18

### 🎯 核心功能改进

#### 🔧 重复生成问题修复

- **修复重复引入问题** - 解决重复生成 mock 文件时的重复引入问题
- **OpenAPI 转换器优化** - 修复参数处理逻辑，避免重复生成
- **导入语句去重** - 新增导入语句去重功能，解决重复生成导致的代码冗余
- **类型模板优化** - 改进类型模板生成逻辑，避免重复定义接口
- **块更新器集成** - 集成去重功能到块更新器，确保代码质量

#### 🏗️ Mock 配置系统重构

- **动态配置支持** - 新增 `mock.config.js` 动态配置文件
- **配置结构简化** - 移除 `apifox.config.json` 中的 `mockPort` 配置
- **专注开发环境** - 简化配置结构，专注开发环境使用
- **文档完善** - 完善 README 配置说明和工作流程

#### 🎨 代码质量提升

- **Prettier 格式化** - 使用 Prettier 格式化整个项目代码
- **统一代码风格** - 统一代码格式风格，提高代码可读性
- **配置规则应用** - 应用 `.prettierrc.json` 配置规则
- **多文件格式化** - 格式化所有 TypeScript、JSON、Markdown 文件
- **风格一致性** - 保持代码风格一致性

#### 🔄 路由加载器增强

- **check\_ 函数支持** - 修复路由加载器支持 `check_` 函数动态选择数据源
- **RemoteProxy 类** - 新增 RemoteProxy 类，支持代理请求到远程服务器
- **代理功能完善** - 支持路径重写、请求头配置、超时设置等功能
- **热重载支持** - 在热重载功能中也添加对 `check_` 函数的支持
- **类型定义更新** - 更新类型定义，添加 `remoteServer` 配置选项
- **文档更新** - 完善 README 文档，添加远程代理配置说明

#### 🎯 配置系统优化

- **配置参数简化** - 简化配置参数并优化端点过滤逻辑
- **文档更新** - 更新 README 文档，移除过时的配置参数说明
- **scope 配置简化** - 简化 scope 配置，移除 `excludeDeprecated` 和 `operationId` 相关参数
- **请求体构建优化** - 优化 `apifox-client` 请求体构建，支持 `folderPaths` 配置
- **过滤逻辑重构** - 重构 `endpoint-filter` 过滤逻辑，移除冗余的 `operationId` 过滤
- **调试功能增强** - 添加 OpenAPI 数据保存功能，便于调试和日志记录
- **废弃接口处理** - 统一废弃接口过滤逻辑，默认排除所有废弃接口
- **工具文件新增** - 新增 `file-utils` 工具文件，提供文件操作和 OpenAPI 数据保存功能

#### 🛠️ 路由处理改进

- **单文件多路由支持** - 改进路由加载器支持单文件多路由
- **路由提取功能** - 修复路由提取功能，支持单个 mock 文件中的多个路由
- **路由解析优化** - 新增 `extractAllRouteInfo` 函数用于更好的路由解析
- **路由匹配改进** - 改进路由匹配逻辑，支持 PostRole、GetRole 等命名模式
- **路由加载修复** - 修复路由加载逻辑，现在能遍历文件中的所有路由

#### 🔧 类型生成器修复

- **Apifox 数据模型支持** - 修复类型生成器处理 Apifox 数据模型的问题
- **中文 schema 名称支持** - 修复处理中文 schema 名称的问题

### 📖 文档更新

- **README 配置说明** - 完善配置说明和工作流程
- **远程代理配置** - 添加远程代理配置说明
- **配置参数更新** - 移除过时的配置参数说明

### 🚀 技术改进

- **代码格式化** - 统一代码格式风格
- **错误处理** - 改进错误处理和日志输出
- **性能优化** - 优化路由加载和匹配性能
- **类型安全** - 增强类型定义和类型安全

## [1.2.0] - 2025-10-16

### 🎯 核心功能改进

#### 🏗️ Mock 文件架构优化

- **新增文件架构管理** - 引入 `file-architecture.ts` 模块，统一管理 Mock 文件的基础结构
- **两步生成模式** - Mock 文件生成改为两步模式：先确保文件架构，后生成接口内容
- **智能架构检测** - 自动检测现有文件是否包含必要的 import 语句，避免重复添加
- **增量架构更新** - 对于已存在的文件，智能添加缺失的基础架构而不覆盖现有内容

#### 🔧 代码质量提升

- **代码格式化优化** - 改进 `code-formatter.ts`，使用 Prettier 自动格式化生成的代码
- **统一代码风格** - 所有生成的 Mock 文件都遵循统一的代码风格和格式
- **更好的可读性** - 生成的代码更加整洁，便于维护和调试

#### 📊 类型系统增强

- **接口状态支持** - 在 `ApiEndpoint` 类型中新增 `status` 字段，支持接口状态管理
- **更精确的类型定义** - 优化类型注释，提供更清晰的 API 文档
- **废弃配置优化** - 改进 `excludedByTags` 的注释说明，明确其用于排除接口状态

### 🚀 技术改进

#### 📁 文件管理优化

- **目录结构自动创建** - 生成 Mock 文件时自动创建必要的目录结构
- **文件存在性检查** - 增强文件存在性检查，避免文件操作错误
- **架构完整性保证** - 确保每个 Mock 文件都包含必要的 import 语句和基础设置

#### 🎨 代码生成改进

- **模块化架构** - 将文件架构管理独立为单独模块，提高代码复用性
- **更好的错误处理** - 改进文件操作过程中的错误处理和日志输出
- **增量更新支持** - 支持在现有文件中增量添加新的接口定义

### 📖 文档更新

### 📋 执行前提条件

执行 `node dist/src/scripts/serve-mock.js` 需要满足以下条件：

3. **配置文件存在** - 确保 `apifox.config.json` 在项目根目录
4. **Mock 文件已生成** - 先运行 `npm run generate` 生成 Mock 文件
5. **Mock 目录存在** - 确保 `mock/` 目录存在且包含有效的 Mock 文件
6. **端口可用** - 确保配置的 `mockPort` 端口未被占用

---

## [1.1.0] - 2025-10-13

### 🎯 核心功能

#### 🎭 直接使用 Apifox Mock 规则

- **使用 Apifox 配置** - 直接使用 Apifox 中为字段配置的 mock 规则
- **统一管理** - Mock 规则在 Apifox 平台统一管理，本地与云端保持完全一致
- **零配置** - 在 Apifox 中配置好 mock 规则，生成时自动应用

### ✨ 新增功能

#### 🔄 Apifox Mock 规则支持

- **x-apifox-mock 字段** - 自动提取 Apifox 的 `x-apifox-mock` 扩展字段中的 mock 规则
- **智能语法转换** - 自动将 Apifox 模板语法（`{{$xxx}}`）转换为 Mock.js 语法（`@xxx`）
- **双语法支持** - 同时支持 Mock.js 语法和 Apifox 模板语法
- **自动应用** - 启用 `includeApifoxExtensionProperties` 后自动拉取和应用规则

支持的 Apifox 模板转换：

- `{{$string.uuid}}` → `@guid`
- `{{$person.fullName(locale='zh_CN')}}` → `@cname`
- `{{$internet.email}}` → `@email`
- `{{$phone.number}}` → `/^1[3-9]\\d{9}$/`
- 更多模板映射...

#### 📊 回退策略

当字段没有配置 Apifox mock 规则时，使用以下回退策略：

1. **示例值优先** - 使用 schema 中定义的 `example`
2. **枚举值** - 使用 `enum` 中的值（通过 `@pick` 随机选择）
3. **基本规则** - 根据字段类型使用简单的默认规则
   - 字符串：`@cword(3, 8)`
   - 数字/整数：根据 `minimum/maximum` 生成范围
   - 布尔值：`@boolean`

### 📖 文档更新

- **README.md** - 新增"Apifox Mock 规则"章节
  - 说明工作原理和使用方法
  - 提供使用示例
  - 更新项目结构说明
- **CHANGELOG.md** - 详细记录所有变更

### 🎯 优势

- ✅ **统一管理** - 在 Apifox 中统一管理所有 mock 规则，团队协作更方便
- ✅ **完全一致** - 本地 Mock 数据与 Apifox 云端 Mock 保持一致
- ✅ **零学习成本** - 使用 Apifox 原生的 mock 规则，无需学习新语法
- ✅ **功能完整** - 支持 Apifox 的所有 mock 规则和高级功能

### 🚀 使用示例

在 Apifox 中配置字段的 mock 规则：

```
字段名: email
类型: string
Mock 规则: @email
```

生成的 Mock 文件会自动应用该规则：

```javascript
Mock.mock({
  email: '@email' // 直接使用 Apifox 配置的规则
});
```

### ⚡ 兼容性

- 向下兼容 v1.0.0
- 无需修改配置文件
- 自动应用 Apifox mock 规则

---

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
