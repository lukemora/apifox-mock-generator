# Apifox Mock Generator

[![npm version](https://img.shields.io/npm/v/apifox-mock-generator.svg)](https://www.npmjs.com/package/apifox-mock-generator)

从 Apifox 拉取 API 接口并生成本地 Mock 数据和 TypeScript 类型文件的 npm 包。

## 🌟 为什么选择这个工具？

- ⚡ **零配置路由** - 自动发现和加载 Mock 路由，无需手动注册
- 🔥 **即时生效** - 热重载支持，修改 Mock 数据立即生效
- 🎯 **精准控制** - 强大的 API 筛选功能，服务端 + 客户端双重过滤
- 📝 **类型安全** - 自动生成 TypeScript 类型，开发更高效
- 🎨 **代码质量** - 自动格式化，生成的代码符合最佳实践
- 📦 **开箱即用** - 作为 npm 包安装，集成简单

## ✨ 功能特性

### 核心功能

- 🚀 **Apifox 集成** - 自动从 Apifox 项目拉取 API 接口定义（支持 OpenAPI 3.0）
- 📝 **类型生成** - 生成 TypeScript 类型文件（.ts 格式），支持复杂类型、嵌套对象、枚举等
- 🎭 **Apifox Mock** - **✨ 直接使用 Apifox 的 mock 规则**，无需本地配置，完全继承 Apifox 的数据生成能力
- 🌐 **Mock 服务器** - 基于 Express 的本地 Mock 服务，快速响应，支持 CORS

### 高级特性

- 🔥 **热重载** - 修改 Mock 文件自动生效，无需重启服务器
- 🎯 **API 筛选** - 支持路径、方法、标签、操作 ID 等多维度筛选
- ⚡ **增量更新** - 智能识别文件变化，仅更新必要内容
- 🎨 **代码格式化** - 使用 Prettier 自动格式化生成的代码
- 🔄 **动态路由** - 自动发现和加载 Mock 路由，零配置
- ✅ **参数校验** - 基于 Schema 的请求参数验证

## 📦 安装

在你的 Vue/React/任意前端项目中安装：

```bash
pnpm add apifox-mock-generator -D
```

## 🚀 快速开始

### 前置条件

在开始使用之前，请确保满足以下条件：

- ✅ **Node.js 16+** - 确保已安装 Node.js 16 或更高版本
- ✅ **项目编译** - 运行 `npm run build` 编译 TypeScript 代码
- ✅ **Apifox 配置** - 创建 `apifox.config.json` 配置文件
- ✅ **Mock 文件生成** - 运行 `npm run generate` 生成 Mock 文件

### 1. 创建配置文件

在你的项目根目录创建 `apifox.config.json`：

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "token": "YOUR_APIFOX_TOKEN",
  "mockDir": "./mock",
  "typesDir": "./src/types/api",
  "mockPort": 3000
}
```

### 2. 配置 package.json 脚本

```json
{
  "scripts": {
    "auto-mock": "apifox-mock generate",
    "mock:serve": "apifox-mock serve",
    "mock:dev": "apifox-mock dev"
  }
}
```

### 3. 生成 Mock 和类型文件

```bash
npm run mock:generate
```

### 4. 启动 Mock 服务器

```bash
npm run mock:serve
```

> ⚠️ **执行前提条件**：
>
> - 必须先运行 `npm run generate` 生成 Mock 文件
> - 确保 `apifox.config.json` 配置文件存在且配置正确
> - 确保 `mock/` 对应项目根目录存在且包含有效的 Mock 文件

### 5. 配置代理（Vite 项目）

在 `vite.config.ts` 中：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

### 6. 使用生成的类型

```typescript
import type { LoginRequest, LoginResponse } from './src/types/api/auth/login';

const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
};
```

## 🔧 配置说明

### 基础配置

- `projectId`: Apifox 项目 ID（在项目设置中查看）
- `token`: Apifox API Token（在账号设置中生成）
- `mockDir`: Mock 文件生成目录（默认：`./mock`）
- `typesDir`: TypeScript 类型文件生成目录（默认：`./src/types/api`）
- `mockPort`: Mock 服务器端口（默认：`3000`）
- `apiFilter`: API 筛选配置（可选）

### API 筛选配置

通过 `apiFilter` 配置项，您可以精确控制需要导出和生成的 API 接口。支持**服务端过滤**（Apifox API）和**客户端过滤**（生成时）。

#### 完整配置示例

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "token": "YOUR_APIFOX_TOKEN",
  "outputDir": "./apifox-output",
  "mockDir": "./generated/mock",
  "typesDir": "./generated/types",
  "mockPort": 3000,
  "apiFilter": {
    "scope": {
      "type": "ALL",
      "excludedByTags": ["设计中", "已废弃"]
    },
    "includePaths": ["/api/auth/**", "/api/user/**"],
    "excludePaths": ["/api/admin/**"],
    "excludeDeprecated": true,
    "includeMethods": ["GET", "POST"]
  }
}
```

#### 服务端过滤（Apifox API）

**`scope` 配置** - 控制从 Apifox 导出哪些接口：

| 参数             | 类型                                       | 说明                                                      |
| ---------------- | ------------------------------------------ | --------------------------------------------------------- |
| `type`           | `'ALL' \| 'FOLDER' \| 'TAG' \| 'API_LIST'` | 导出类型：全部/按文件夹/按标签/按 API ID                  |
| `includedByTags` | `string[]`                                 | 包含的标签                                                |
| `excludedByTags` | `string[]`                                 | 排除的接口状态（支持中文：`设计中`、`已废弃`、`待定` 等） |
| `folderPath`     | `string`                                   | 文件夹路径（type 为 FOLDER 时）                           |
| `apiIdList`      | `string[]`                                 | API ID 列表（type 为 API_LIST 时）                        |

> 📝 **注意**: 系统默认启用 Apifox 扩展属性和文件夹标签功能，无需额外配置。

#### 接口状态映射

`excludedByTags` 支持中文状态配置，系统会自动映射到 Apifox 的英文状态：

| 中文状态 | 英文状态     | 说明           |
| -------- | ------------ | -------------- |
| `设计中` | `designing`  | 接口正在设计中 |
| `开发中` | `developing` | 接口正在开发中 |
| `已完成` | `completed`  | 接口开发完成   |
| `已废弃` | `deprecated` | 接口已废弃     |
| `待定`   | `pending`    | 接口状态待定   |
| `测试中` | `testing`    | 接口正在测试   |
| `已发布` | `published`  | 接口已发布     |

#### 客户端过滤（生成时）

在生成 Mock 和类型文件时进行二次过滤：

| 参数                  | 类型       | 说明                                      |
| --------------------- | ---------- | ----------------------------------------- |
| `includePaths`        | `string[]` | 只包含这些路径（支持 `*` 和 `**` 通配符） |
| `excludePaths`        | `string[]` | 排除这些路径                              |
| `includeOperationIds` | `string[]` | 只包含这些 operationId                    |
| `excludeOperationIds` | `string[]` | 排除这些 operationId                      |
| `excludeDeprecated`   | `boolean`  | 排除废弃的接口                            |
| `includeMethods`      | `string[]` | 只包含这些 HTTP 方法                      |
| `excludeMethods`      | `string[]` | 排除这些 HTTP 方法                        |

#### 常用场景

**场景 1：导出所有接口，排除已废弃**

```json
{
  "apiFilter": {
    "scope": {
      "type": "ALL",
      "excludedByTags": ["已废弃"]
    }
  }
}
```

**场景 2：只导出指定文件夹**

```json
{
  "apiFilter": {
    "scope": {
      "type": "FOLDER",
      "folderPath": "用户模块/用户管理"
    }
  }
}
```

**场景 3：按标签导出**

```json
{
  "apiFilter": {
    "scope": {
      "type": "TAG",
      "includedByTags": ["用户管理", "商品管理"]
    }
  }
}
```

**场景 4：服务端 + 客户端双重过滤**

```json
{
  "apiFilter": {
    "scope": {
      "type": "ALL",
      "excludedByTags": ["已废弃"]
    },
    "includePaths": ["/api/v1/**"],
    "excludeMethods": ["DELETE"]
  }
}
```

### 获取 Apifox Token

1. 登录 [Apifox](https://www.apifox.cn/)
2. 进入「个人设置」→「访问令牌」
3. 创建新的访问令牌
4. 复制 Token 到 `apifox.config.json`

## 📖 CLI 命令

安装后，你可以使用 `apifox-mock` 命令：

```bash
# 生成 Mock 和类型文件
apifox-mock generate

# 启动 Mock 服务器
apifox-mock serve

# 开发模式（生成 + 服务）
apifox-mock dev
```

或者通过 npm scripts：

```bash
npm run mock:generate
npm run mock:serve
npm run mock:dev
```

## 🎯 高级用法

### 🎭 Apifox Mock 规则

本工具**直接使用 Apifox 中配置的 mock 规则**，无需在本地重复配置。只需在 Apifox 中设置好字段的 mock 规则，生成时会自动应用。

#### 工作原理

1. **在 Apifox 中配置** - 为每个字段设置 mock 规则（支持 Mock.js 语法和 Apifox 模板语法）
2. **自动拉取规则** - 启用 `includeApifoxExtensionProperties` 后，导出的 OpenAPI 数据中会包含 `x-apifox-mock` 扩展字段
3. **智能转换** - 自动将 Apifox 模板语法（如 `{{$string.uuid}}`）转换为 Mock.js 语法（如 `@guid`）
4. **生成 Mock 文件** - 工具自动提取并转换 Apifox 的 mock 规则，生成本地 Mock 文件

#### 示例

在 Apifox 中配置字段的 mock 规则：

```
字段名: id
类型: string
Mock 规则: {{$string.uuid}}     ← Apifox 模板语法

字段名: name
类型: string
Mock 规则: {{$person.fullName(locale='zh_CN')}}

字段名: code
类型: number
Mock 规则: @integer(0, 999)     ← Mock.js 语法
```

生成的 Mock 文件会自动转换：

```javascript
Mock.mock({
  code: '@integer(0, 999)', // 直接使用 Mock.js 规则
  data: {
    id: '@guid', // {{$string.uuid}} → @guid
    name: '@cname', // {{$person.fullName(locale='zh_CN')}} → @cname
    email: '@email' // 直接使用 Mock.js 规则
  }
});
```

#### 优势

- ✅ **统一管理** - 在 Apifox 中统一管理所有 mock 规则，团队协作更方便
- ✅ **完全一致** - 本地 Mock 数据与 Apifox 云端 Mock 保持一致
- ✅ **智能转换** - 自动转换 Apifox 模板语法为 Mock.js 语法，无缝兼容
- ✅ **双语法支持** - 同时支持 Mock.js 语法（`@xxx`）和 Apifox 模板语法（`{{$xxx}}`）

#### 回退策略

如果字段没有配置 Apifox mock 规则，会使用以下回退策略：

1. **示例值** - 使用 schema 中定义的 `example`
2. **枚举值** - 使用 `enum` 中的值（通过 `@pick` 随机选择）
3. **基本规则** - 根据字段类型使用简单的默认规则（如字符串用 `@cword(3,8)`）

### 自定义 Mock 数据

修改生成的 Mock 文件（如 `mock/api/auth/login.js`）：

```javascript
export default {
  method: 'POST',
  path: '/api/auth/login',
  response: {
    code: 0,
    message: 'success',
    data: {
      token: 'custom-token-12345', // 自定义数据
      userId: 10086
    }
  }
};
```

> ⚠️ 注意：重新运行 `apifox-mock generate` 会覆盖自定义的修改

### 热重载

Mock 服务器支持热重载，修改 Mock 文件后会自动生效，无需重启：

```bash
npm run mock:serve
# 修改 mock 文件，保存后立即生效
```

## 🔄 工作流程

### 架构说明

作为 npm 包安装到你的项目中，工作模式如下：

```
┌─────────────────────────────────────────────────────────────┐
│                 你的前端项目 (如 Vue)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Apifox 平台                                          │  │
│  │  OpenAPI 数据                                         │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │ ① 拉取 API                              │
│                  ↓                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  apifox-mock-generator (npm 包)                      │  │
│  │  • apifox-mock generate  - 生成文件                  │  │
│  │  • apifox-mock serve     - 启动服务器                │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │ ② 生成                                  │
│                  ↓                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  生成的文件                                           │  │
│  │  • mock/        - Mock 数据文件                      │  │
│  │  • src/types/api/ - TypeScript 类型                  │  │
│  └──────┬───────────────────────────────────────────┬───┘  │
│         │                                            │      │
│         │ ③ 导入类型                                 │ ④ 提供 Mock 数据
│         ↓                                            ↓      │
│  ┌─────────────────┐                  ┌─────────────────┐  │
│  │  前端代码       │    HTTP 请求     │  Mock 服务器    │  │
│  │ (localhost:5173)│ ─────────────>  │ (localhost:3000)│  │
│  │                 │  /api/**         │                 │  │
│  │  • 业务逻辑     │                  │  • Express 服务 │  │
│  │  • API 调用     │  <─────────────  │  • Mock 响应    │  │
│  │  • TS 类型      │    Mock 数据     │  • 热重载       │  │
│  └─────────────────┘                  └─────────────────┘  │
│         ↑                                                   │
│         │ ⑤ Vite/Webpack 代理转发                          │
│         └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 详细步骤

#### 1️⃣ 安装并配置

```bash
# 在你的 Vue 项目目录
npm install apifox-mock-generator --save-dev

# 创建配置文件
vim apifox.config.json

# 配置 package.json
```

#### 2️⃣ 生成文件

```bash
npm run mock:generate
```

执行过程：

- 从 Apifox 拉取 API 定义
- 应用筛选规则
- 生成 TypeScript 类型 → `src/types/api/`
- 生成 Mock 数据 → `mock/`

#### 3️⃣ 启动 Mock 服务器

```bash
npm run mock:serve
```

在端口 3000 启动 Express 服务器。

#### 4️⃣ 配置前端代理

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

#### 5️⃣ 在代码中使用

```typescript
// 导入类型
import type { LoginRequest, LoginResponse } from '@/types/api/auth/login';

// 发起请求（自动代理到 Mock 服务器）
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### 项目结构

安装后，你的项目结构：

```
your-vue-project/
├── node_modules/
│   └── apifox-mock-generator/   # npm 包
├── src/
│   ├── types/
│   │   └── api/                 # ✨ 生成的类型文件
│   │       ├── auth/
│   │       │   └── login.ts
│   │       └── user/
│   │           └── info.ts
│   └── components/
├── mock/                        # ✨ 生成的 Mock 文件
│   └── api/
│       ├── auth/
│       │   └── login.js
│       └── user/
│           └── info.js
├── apifox.config.json          # ⚙️ 配置文件
├── vite.config.ts              # 配置代理
└── package.json
```

### 优势

✅ **集成简单** - 作为 npm 包安装，无需单独项目  
✅ **类型安全** - 生成的类型文件直接在项目中使用  
✅ **真实环境** - 通过 HTTP Mock，完全模拟真实 API  
✅ **热重载** - 修改 Mock 数据立即生效  
✅ **团队协作** - 配置和类型可以提交到 Git 共享

## 📁 项目结构

```
apifox-mock-generator/
├── src/                           # 源代码
│   ├── core/                      # 核心模块
│   │   ├── apifox-client.ts       # Apifox API 客户端
│   │   ├── config-loader.ts       # 配置加载器
│   │   ├── endpoint-filter.ts     # 端点过滤器
│   │   └── openapi-converter.ts   # OpenAPI 转换器
│   ├── generators/                # 生成器模块
│   │   ├── templates/             # 模板生成
│   │   │   ├── mock-template.ts   # Mock 文件模板（使用 Apifox mock 规则）
│   │   │   └── type-template.ts   # TypeScript 类型模板
│   │   ├── mock-generator.ts      # Mock 文件生成器
│   │   └── type-generator.ts      # 类型文件生成器
│   ├── server/                    # Mock 服务器模块
│   │   ├── express-server.ts      # Express 服务器配置
│   │   ├── hot-reload.ts          # 热重载功能
│   │   ├── route-loader.ts        # 路由加载器
│   │   ├── route-manager.ts       # 路由管理器
│   │   ├── route-matcher.ts       # 路由匹配器
│   │   └── validation.ts          # 参数校验
│   ├── utils/                     # 工具函数
│   │   ├── block-updater.ts       # 增量更新工具
│   │   ├── code-formatter.ts      # 代码格式化
│   │   ├── file-operations.ts     # 文件操作
│   │   ├── file-helper.ts         # 文件助手（统一导出）
│   │   ├── logger.ts              # 日志工具
│   │   ├── path-utils.ts          # 路径工具
│   │   └── type-mapping.ts        # 类型映射
│   ├── scripts/                   # 脚本入口
│   │   ├── generate-mock.ts       # 生成脚本主入口
│   │   └── serve-mock.ts          # 服务器脚本主入口
│   ├── types/                     # 类型定义
│   │   └── index.ts               # 公共类型
│   └── index.ts                   # 包入口文件
├── generated/                     # 生成的文件（自动）
│   ├── mock/                      # Mock 数据
│   └── types/                     # TypeScript 类型
├── dist/                          # 编译输出
├── apifox.config.json             # 配置文件
├── package.json
└── tsconfig.json
```

### 🏗️ 架构设计

项目采用**模块化分层架构**，职责清晰分离：

| 层级       | 目录          | 职责                                          |
| ---------- | ------------- | --------------------------------------------- |
| **核心层** | `core/`       | Apifox API 交互、配置加载、OpenAPI 转换和过滤 |
| **生成层** | `generators/` | Mock 和 TypeScript 类型生成、代码模板         |
| **服务层** | `server/`     | Express 服务器、动态路由、热重载、参数校验    |
| **工具层** | `utils/`      | 文件操作、增量更新、代码格式化、日志输出      |
| **脚本层** | `scripts/`    | CLI 命令入口（generate、serve）               |
| **类型层** | `types/`      | 公共 TypeScript 类型定义                      |

## 🛠️ 脚本说明

| 命令               | 说明                                        |
| ------------------ | ------------------------------------------- |
| `npm run build`    | 编译 TypeScript 代码                        |
| `npm run generate` | 一键生成（拉取 API + 生成 Mock + 生成类型） |
| `npm run serve`    | 启动 Mock 服务器                            |
| `npm run dev`      | 开发模式（generate + serve）                |

## 📚 技术栈

- **语言**: TypeScript 5.3+
- **运行时**: Node.js 16+
- **Web 框架**: Express 4.x
- **HTTP 客户端**: Axios
- **Mock 数据**: @faker-js/faker, Mock.js
- **文件监听**: Chokidar
- **代码格式化**: Prettier
- **日志工具**: Chalk
- **API 工具**: Apifox CLI

## ⚠️ 已知限制

当前版本暂不支持以下特性：

- ⚠️ OpenAPI 2.0 (Swagger) - 仅支持 OpenAPI 3.0
- ⚠️ 文件上传/下载类型
- ⚠️ WebSocket 协议
- ⚠️ GraphQL

## 💡 常见问题

### 1. 拉取 API 失败？

检查：

- `projectId` 和 `token` 是否正确
- Token 是否有「项目维护者」或「管理员」权限
- 网络连接是否正常

### 2. 端口被占用？

修改 `apifox.config.json` 中的 `mockPort` 配置。

### 3. 没有生成任何文件？

检查：

- `apiFilter` 筛选规则是否过于严格
- Apifox 项目中是否有匹配的接口
- 查看终端输出的错误信息
- 确认 Apifox Token 是否有正确的权限

### 4. 类型生成不准确？

建议：

- 在 Apifox 中完善接口的数据模型定义
- 使用 JSON Schema 定义清晰的数据结构
- 为每个字段添加描述和示例

### 5. 热重载不生效？

确认：

- Mock 文件保存成功
- 查看终端是否有文件变化的提示
- 检查文件路径是否在 `mockDir` 配置的目录下

### 6. 启动 Mock 服务器失败？

检查以下条件：

- ✅ **配置文件存在** - 确保 `apifox.config.json` 在项目根目录
- ✅ **Mock 目录存在** - 确保 `mock/` 目录存在且不为空
- ✅ **项目已编译** - 运行 `npm run build` 编译代码
- ✅ **Mock 文件已生成** - 先运行 `npm run generate` 生成 Mock 文件
- ✅ **端口未被占用** - 检查 `mockPort` 配置的端口是否可用

常见错误及解决方案：

```bash
# 错误：未找到 apifox.config.json 配置文件
# 解决：创建配置文件
cp apifox.config.json.example apifox.config.json

# 错误：未找到 Mock 目录
# 解决：先生成 Mock 文件
npm run generate

# 错误：未找到任何 Mock 文件
# 解决：检查 API 筛选配置，确保有匹配的接口
```

## 🤝 不同框架的配置示例

### Vue CLI 项目

```javascript
// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};
```

### React (Create React App)

```javascript
// package.json
{
  "proxy": "http://localhost:3000"
}
```

或使用 `http-proxy-middleware`：

```javascript
// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true
    })
  );
};
```

### Next.js

```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*'
      }
    ];
  }
};
```

### 配置 .gitignore

建议将以下文件添加到 `.gitignore`：

```gitignore
# Apifox 配置（包含敏感 token）
apifox.config.json

# 生成的 Mock 文件（可选）
mock/

# 生成的类型文件建议提交，方便团队共享
# src/types/api/
```

### 💡 最佳实践

| 场景          | 建议                                                |
| ------------- | --------------------------------------------------- |
| **配置文件**  | `apifox.config.json` 不要提交，提供 `.example` 示例 |
| **类型文件**  | 建议提交到 Git，团队共享类型定义                    |
| **Mock 数据** | 可以不提交，每个开发者自行生成                      |
| **切换环境**  | 后端完成后只需修改代理配置，代码无需改动            |

## 📝 更新日志

### v1.1.0 (2025-10-13)

#### 🎯 核心功能

- 🎭 **直接使用 Apifox Mock 规则** - 使用 Apifox 中配置的 mock 规则，本地与云端保持完全一致
- 🔄 **统一管理** - Mock 规则在 Apifox 平台统一管理，团队协作更方便

#### ✨ 新功能

- ✅ 支持 Apifox 的 `x-apifox-mock` 扩展字段，提取 mock 规则
- ✅ 智能转换 Apifox 模板语法（`{{$xxx}}`）为 Mock.js 语法（`@xxx`）
- ✅ 同时支持 Mock.js 和 Apifox 两种语法
- ✅ 完善的回退策略（示例值 → 枚举值 → 基本规则）

#### 📖 文档更新

- 新增"Apifox Mock 规则"章节，说明使用方法
- 更新项目结构说明

### v1.0.0 (2025-10-10)

#### 核心功能

- 🚀 **Apifox API 客户端** - 从 Apifox 项目拉取 API 接口定义
- 📝 **类型生成器** - 自动生成 TypeScript 类型文件（.ts 格式）
- 🎭 **Mock 生成器** - 基于 Schema 自动生成 Mock 数据文件
- 🌐 **Mock 服务器** - 基于 Express 的本地 Mock 服务
- 🔥 **热重载** - 修改 Mock 文件自动生效，无需重启服务器

#### 高级特性

- 🎯 **API 筛选** - 支持路径、方法、标签、操作 ID 等多维度筛选
- ⚡ **增量更新** - 智能识别文件变化，仅更新必要的内容
- 🎨 **代码格式化** - 使用 Prettier 格式化生成的代码
- 🔄 **动态路由** - 自动发现和加载 Mock 路由，零配置
- ⏱️ **延迟模拟** - 通过 `?_delay=1000` 参数模拟网络延迟
- ✅ **参数校验** - 基于 Schema 的请求参数验证

#### 支持的特性

- ✅ OpenAPI 3.0 规范
- ✅ HTTP 方法：GET、POST、PUT、DELETE、PATCH
- ✅ 路径参数、查询参数、请求体、响应体
- ✅ 复杂对象、数组、枚举、嵌套类型
- ✅ Schema 引用 ($ref)、allOf / anyOf / oneOf

详见 [CHANGELOG.md](./CHANGELOG.md) 获取完整更新日志。

## 📦 发布到 npm

如果你想 fork 并发布自己的版本：

### 1. 修改配置

```json
// package.json
{
  "name": "your-package-name",
  "version": "1.0.0",
  "author": "Your Name",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/your-repo.git"
  }
}
```

### 2. 编译项目

```bash
npm run build
```

### 3. 发布

```bash
# 登录 npm（首次）
npm login

# 发布
npm publish

# 或发布为 scoped package
npm publish --access public
```

### 4. 在项目中使用

```bash
npm install your-package-name --save-dev
```

## 👨‍💻 本地开发

如果你想参与开发或自定义：

```bash
# 克隆项目
git clone https://github.com/yourname/apifox-mock-generator.git
cd apifox-mock-generator

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 本地测试
npm link

# 在其他项目中使用本地版本
cd your-test-project
npm link apifox-mock-generator
```

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## 🙏 致谢

- [Apifox](https://www.apifox.cn/) - API 设计、开发、测试一体化协作平台
- [Express](https://expressjs.com/) - 快速的 Node.js Web 框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [@faker-js/faker](https://fakerjs.dev/) - 生成真实感测试数据
- [Chalk](https://github.com/chalk/chalk) - 终端彩色输出

---

如有问题或建议，欢迎提 [Issue](https://github.com/yourname/apifox-mock-generator/issues)！

⭐ 如果这个项目对你有帮助，请给一个 Star！
