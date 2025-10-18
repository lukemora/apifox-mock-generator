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
- ✅ **智能参数校验** - 根据参数来源（query/body）进行差异化校验，符合HTTP协议标准

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
- ✅ **Apifox 配置** - 创建 `apifox.config.json` 配置文件（用于 API 文档同步和 Mock 数据生成）
- ✅ **Mock 配置** - 创建 `mock.config.js` 配置文件（用于 Mock 服务器运行时配置）
- ✅ **Mock 文件生成** - 运行 `npm run generate` 生成 Mock 文件

### 1. 创建配置文件

**创建 Apifox 配置文件** - 用于 API 文档同步和 Mock 数据生成：

在你的项目根目录创建 `apifox.config.json`：

```json
{
  "projectId": "7219799",
  "token": "APS-XQrLSqLE4q0FOb0bGhaqYvTxSUQQFPeO",
  "mockDir": "./mock",
  "typesDir": "./src/types/mock",
  "apiFilter": {
    "scope": {
      "type": "ALL",
      "excludedByTags": ["设计中", "已废弃"],
      "folderPaths": []
    },
    "includePaths": [],
    "excludePaths": [],
    "includeMethods": []
  }
}
```

**创建 Mock 服务器配置文件** - 用于控制 Mock 服务器运行时行为：

创建 `mock.config.js`：

```javascript
export default {
  model: 'mock',
  https: false,
  port: 10000,
  target: 'http://localhost:8080',
  remoteTarget: true,
  handleMapPath(req) {
    const url = req.req.url.slice(1);
    const splitUrl = url.split('/');
    const fileName = splitUrl[splitUrl.length - 1].split('?')[0];
    const relativePath = splitUrl.splice(0, splitUrl.length - 1).join('/');
    return {
      relativePath,
      fileName
    };
  }
};
```

### 2. 配置 package.json 脚本

```json
{
  "scripts": {
    "auto-mock": "apifox-mock generate",
    "mock": "apifox-mock serve",
    "mock:dev": "apifox-mock dev"
  }
}
```

### 3. 生成 Mock 和类型文件

```bash
pnpm auto-mock
```

### 4. 启动 Mock 服务器

```bash
pnpm mock
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
        target: 'http://localhost:10000', // 指向 Mock 服务器端口
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
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

本项目使用两个配置文件来管理不同的功能：

### 📋 配置文件作用

**1. `apifox.config.json`** - API 文档同步配置

- **作用**：配置 Apifox 项目信息和生成路径
- **功能**：负责从 Apifox 同步 API 文档，生成 Mock 数据和 TypeScript 类型定义
- **使用时机**：运行 `npm run generate` 时使用

**2. `mock.config.js`** - Mock 服务器运行时配置

- **作用**：配置 Mock 服务器的运行时行为
- **功能**：控制服务器端口、工作模式、代理目标等
- **使用时机**：运行 `npm run mock` 时使用

### 基础配置

- `projectId`: Apifox 项目 ID（在项目设置中查看）
- `token`: Apifox API Token（在账号设置中生成）
- `mockDir`: Mock 文件生成目录（默认：`./mock`）
- `typesDir`: TypeScript 类型文件生成目录（默认：`./src/types/api`）
- `apiFilter`: API 筛选配置（可选）

### ⚠️ 重要配置说明

#### 1. Prettier 忽略配置

**需要将 `mock` 文件夹添加到 `.prettierrc` 的忽略文件中**，主要原因是格式化文件会影响 Mock.js 语法。

在项目根目录创建或更新 `.prettierignore` 文件：

```bash
# .prettierignore
mock/
```

或者在 `.prettierrc.json` 中添加忽略配置：

```json
{
  "ignorePath": ".prettierignore"
}
```

#### 2. Mock 目录配置

**⚠️ 重要：`"mockDir": "./mock"` 不要更改**，因为 Mock 服务会去项目目录下查找 `mock` 文件。

- Mock 服务器启动时会自动扫描项目根目录下的 `mock/` 文件夹
- 如果修改了 `mockDir` 路径，可能导致 Mock 服务无法正确加载数据
- 建议保持默认配置：`"mockDir": "./mock"`

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
  "apiFilter": {
    "scope": {
      "type": "ALL",
      "excludedByTags": ["设计中", "已废弃"]
    },
    "includePaths": ["/api/auth/**", "/api/user/**"],
    "excludePaths": ["/api/admin/**"],
    "includeMethods": ["GET", "POST"]
  }
}
```

#### 服务端过滤（Apifox API）

**`scope` 配置** - 控制从 Apifox 导出哪些接口：

| 参数             | 类型                         | 说明                                                      |
| ---------------- | ---------------------------- | --------------------------------------------------------- |
| `type`           | `'ALL' \| 'FOLDER' \| 'TAG'` | 导出类型：全部/按文件夹/按标签                            |
| `includedByTags` | `string[]`                   | 包含的标签                                                |
| `excludedByTags` | `string[]`                   | 排除的接口状态（支持中文：`设计中`、`已废弃`、`待定` 等） |
| `folderPaths`    | `string[]`                   | 文件夹路径列表（支持多个中文文件夹名称匹配）              |

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

| 参数             | 类型       | 说明                                      |
| ---------------- | ---------- | ----------------------------------------- |
| `includePaths`   | `string[]` | 只包含这些路径（支持 `*` 和 `**` 通配符） |
| `excludePaths`   | `string[]` | 排除这些路径                              |
| `includeMethods` | `string[]` | 只包含这些 HTTP 方法                      |
| `excludeMethods` | `string[]` | 排除这些 HTTP 方法                        |

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

### Mock 服务器配置

**配置文件**：`mock.config.js`  
**主要作用**：控制 Mock 服务器的运行时行为，包括端口、工作模式、代理目标等

通过 `mock.config.js` 配置文件，您可以灵活配置 Mock 服务器的行为，支持多种工作模式和动态配置。

#### 创建 Mock 配置文件

在项目根目录创建 `mock.config.js`：

**基础配置示例**：

```javascript
export default {
  model: 'mock', // 工作模式
  port: 10000, // Mock 服务器端口
  target: 'http://localhost:8080', // 后端服务器地址
  remoteTarget: true
};
```

**完整配置示例**：

```javascript
/**
 * Mock 服务器配置文件
 */

export default {
  // 工作模式：'proxy', 'mock'，访问服务器或者访问本地数据。可以在query中写入$_mock，$_proxy定义单个请求
  model: 'mock',
  // 是否开启https
  https: false,
  // 本地服务的端口
  port: 10000,
  // 默认代理至系统测试环境, 请配置本地host
  target: 'http://xxx.xxxx.com.cn',
  // 开始remote参数, 通过url中remote=xxx来代理多个后端地址, 需要mock直接在url中设置remote=mock即可
  remoteTarget: true,
  // 处理映射路径
  handleMapPath(req) {
    const url = req.req.url.slice(1);
    const splitUrl = url.split('/');
    const fileName = splitUrl[splitUrl.length - 1].split('?')[0];
    const relativePath = splitUrl.splice(0, splitUrl.length - 1).join('/');
    if (!fileName || !relativePath) {
      console.log('无映射路径文件名fileName值: ', fileName);
      console.log(
        '无映射路径文件路径relativePath值: ',
        relativePath || '空映射路径'
      );
      return {
        fileName: fileName || 'fileName',
        relativePath: relativePath || './'
      };
    }
    return {
      relativePath,
      fileName
    };
  }
};
```

#### 配置选项说明

| 参数            | 类型       | 默认值  | 说明                                                 |
| --------------- | ---------- | ------- | ---------------------------------------------------- |
| `model`         | `string`   | `mock`  | 工作模式：`mock`（本地数据）或 `proxy`（代理到远程） |
| `https`         | `boolean`  | `false` | 是否开启 HTTPS                                       |
| `port`          | `number`   | `10000` | Mock 服务器端口                                      |
| `target`        | `string`   | -       | 远程服务器目标地址（代理模式使用）                   |
| `remoteTarget`  | `boolean`  | `true`  | 是否支持 URL 参数控制（`?remote=mock`）              |
| `handleMapPath` | `function` | -       | 路径映射处理函数，用于解析请求路径                   |

#### 工作模式说明

**1. Mock 模式（默认）**

- 优先返回本地生成的 Mock 数据
- 适合前端开发阶段

**2. Proxy 模式**

- 所有请求转发到 `target` 指定的远程服务器
- 适合联调阶段

**3. 动态切换**

- 通过 URL 参数控制单个请求的行为：
  - `?$_mock` - 强制使用 Mock 数据
  - `?$_proxy` - 强制使用代理
  - `?remote=mock` - 使用 Mock 模式

**4. 智能路由控制（check\_ 函数）**

系统支持通过 `check_` 函数实现更精细的路由控制：

```javascript
// 在 Mock 文件中定义控制函数
export const check_PostRole = function () {
  // true: 使用本地 Mock 数据
  // false: 使用远程服务器数据
  return false; // 使用远程数据
};
```

**工作原理：**

- 当 `check_` 函数返回 `true` 时，使用本地 Mock 数据
- 当 `check_` 函数返回 `false` 时，尝试使用远程服务器数据
- 如果远程服务器未配置或不可用，自动回退到本地 Mock 数据

**重要配置说明：**

⚠️ **远程服务器配置**：确保 `target` 配置为真实可用的服务器地址

```javascript
// mock.config.js
export default {
  model: 'mock',
  port: 10000,
  target: 'http://your-real-api-server.com', // ⚠️ 必须是真实可用的地址
  remoteTarget: true
};
```

如果 `target` 配置为占位符地址（如 `http://xxx.xxxx.com.cn`），系统会正确回退到本地 Mock 数据，这是预期的行为。

### MockPort、Target 和 Vite Proxy 的关系

理解这三个配置项的关系对于正确配置开发环境非常重要：

#### 配置关系图

```
前端应用 (Vite Dev Server)
    ↓ (API 请求 /api/v1/xxx)
Vite Proxy 配置
    ↓ (转发到 mockPort)
Mock 服务器 (mockPort: 10000)
    ↓ (根据 model 配置)
├─ Mock 模式: 返回本地数据
└─ Proxy 模式: 代理到 target
     ↓
真实后端服务器 (target: http://xxx.com)
```

#### 具体配置示例

**1. Apifox 配置 (apifox.config.json)**

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "token": "YOUR_TOKEN",
  "mockDir": "./mock",
  "typesDir": "./src/types/mock"
}
```

**2. Vite 代理配置 (vite.config.ts)**

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:10000', // 指向 Mock 服务器
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
});
```

#### 数据流向说明

1. **前端请求**: `http://localhost:5173/api/v1/user/info`
2. **Vite 代理**: 转发到 `http://localhost:10000/v1/user/info`
3. **Mock 服务器**: 根据 `model` 配置决定：
   - `model: 'mock'`: 返回本地生成的 Mock 数据
   - `model: 'proxy'`: 代理到 `http://localhost:8080/v1/user/info`

#### 环境切换示例

**开发阶段 (Mock 模式)**

```javascript
// mock.config.js
export default {
  model: 'mock', // 使用本地 Mock 数据
  port: 10000,
  target: 'http://localhost:8080'
};
```

**联调阶段 (Proxy 模式)**

```javascript
// mock.config.js
export default {
  model: 'proxy', // 代理到真实后端
  port: 10000,
  target: 'http://test-api.company.com'
};
```

**混合模式 (URL 参数控制)**

```javascript
// mock.config.js
export default {
  model: 'mock', // 默认 Mock 模式
  port: 10000,
  target: 'http://localhost:8080'
};

// 使用方式：
// http://localhost:5173/api/v1/user/info          -> Mock 数据
// http://localhost:5173/api/v1/user/info?$_proxy  -> 真实后端数据
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
npm run auto-mock
npm run mock
npm run mock:dev
```

## 🎯 高级用法

### 🔧 智能参数校验

本工具采用**智能参数校验策略**，根据参数来源（query参数 vs body参数）进行差异化处理，符合HTTP协议标准。

#### 校验策略

| 参数来源      | 类型校验 | 说明                                        |
| ------------- | -------- | ------------------------------------------- |
| **Query参数** | ❌ 跳过  | URL查询参数永远是字符串，类型转换是后端职责 |
| **Body参数**  | ✅ 校验  | 请求体参数支持严格类型校验                  |

#### 工作原理

```javascript
// 生成的Mock文件中的参数校验逻辑
let originQuery = options.req.query; // URL查询参数
let bodyParams = JSON.parse(options.data || '{}'); // 请求体参数

// 合并参数，body参数优先级更高
let apiParams = { ...originQuery, ...bodyParams };

// 智能校验：只对body参数进行类型校验
if (
  apiParams.hasOwnProperty(param.paramKey) &&
  bodyParams.hasOwnProperty(param.paramKey)
) {
  // 参数来自body，进行类型校验
  if (
    lodash[param.paramType] &&
    !lodash[param.paramType](apiParams[param.paramKey])
  ) {
    return { code: 1, msg: '参数类型错误: ' + param.paramKey };
  }
}
// query参数跳过类型校验
```

#### 实际应用场景

**场景1：GET请求 - 只有query参数**

```javascript
GET /api/users?pageNum=1&pageSize=10
// ✅ pageNum和pageSize跳过类型校验，因为来自URL查询参数
```

**场景2：POST请求 - 只有body参数**

```javascript
POST /api/users
Body: { "name": "张三", "age": 25 }
// ✅ name和age进行类型校验，因为来自请求体
```

**场景3：POST请求 - 混合参数**

```javascript
POST /api/users?pageNum=1
Body: { "name": "张三", "age": 25 }
// ✅ pageNum跳过类型校验（来自query），name和age进行类型校验（来自body）
```

#### 优势

- ✅ **符合HTTP标准** - 正确处理URL查询参数的特性
- ✅ **灵活校验** - 支持query和body参数的差异化处理
- ✅ **向后兼容** - 保持必要参数的存在性校验
- ✅ **开发友好** - 避免因query参数类型导致的误报

### 🎭 Apifox Mock 规则

本工具**直接使用 Apifox 中配置的 mock 规则**，无需在本地重复配置。只需在 Apifox 中设置好字段的 mock 规则，生成时会自动应用。

#### 工作原理

1. **在 Apifox 中配置** - 为每个字段设置 mock 规则（支持 Mock.js 语法和 Apifox 模板语法）
2. **自动拉取规则** - 工具自动从 Apifox 导出的 OpenAPI 数据中提取 mock 规则
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
│  │  配置文件                                             │  │
│  │  • apifox.config.json - API 生成配置                 │  │
│  │  • mock.config.js     - Mock 服务器配置              │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │ ③ 生成                                  │
│                  ↓                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  生成的文件                                           │  │
│  │  • mock/        - Mock 数据文件                      │  │
│  │  • src/types/api/ - TypeScript 类型                  │  │
│  └──────┬───────────────────────────────────────────┬───┘  │
│         │                                            │      │
│         │ ④ 导入类型                                 │ ⑤ HTTP 请求
│         ↓                                            ↓      │
│  ┌─────────────────┐                  ┌─────────────────┐  │
│  │  前端代码       │    Vite Proxy    │  Mock 服务器    │  │
│  │ (localhost:5173)│ ─────────────>  │ (localhost:10000)│  │
│  │                 │  /api/**         │                 │  │
│  │  • 业务逻辑     │                  │  • 工作模式切换 │  │
│  │  • API 调用     │  <─────────────  │  • Mock/Proxy   │  │
│  │  • TS 类型      │   响应数据       │  • 热重载       │  │
│  └─────────────────┘                  └─────────┬───────┘  │
│                                                  │          │
│                                                  │ ⑥ 代理   │
│                                                  ↓          │
│                                            ┌─────────────┐  │
│                                            │ 真实后端    │  │
│                                            │ (target)    │  │
│                                            └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 详细步骤

#### 1️⃣ 安装并配置

```bash
# 在你的 Vue 项目目录
npm install apifox-mock-generator --save-dev

# 创建 Apifox 配置文件
vim apifox.config.json

# 创建 Mock 服务器配置文件
vim mock.config.js

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

Mock 服务器会根据 `mock.config.js` 配置启动在指定端口（默认 10000）。

#### 4️⃣ 配置前端代理

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:10000', // 指向 Mock 服务器端口
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
});
```

#### 5️⃣ 环境切换

**开发阶段 (Mock 模式)**

```javascript
// mock.config.js
export default {
  model: 'mock', // 使用本地 Mock 数据
  port: 10000,
  target: 'http://localhost:8080'
};
```

**联调阶段 (Proxy 模式)**

```javascript
// mock.config.js
export default {
  model: 'proxy', // 代理到真实后端
  port: 10000,
  target: 'http://test-api.company.com'
};
```

#### 6️⃣ 在代码中使用

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
├── mock.config.js              # ⚙️ 配置文件
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

修改 `mock.config.js` 中的 `port` 配置。

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
- ✅ **端口未被占用** - 检查 `mock.config.js` 中 `port` 配置的端口是否可用

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

### 7. check\_ 函数不生效？

**问题现象：** 配置了 `check_` 函数但似乎没有生效

**解决方案：**

1. **检查函数命名**：确保函数名格式正确

   ```javascript
   // ✅ 正确格式
   export const check_PostRole = function () {
     return false; // 使用远程数据
   };

   // ❌ 错误格式
   export const checkPostRole = function () { ... }
   ```

2. **检查远程服务器配置**：

   ```javascript
   // mock.config.js
   export default {
     target: 'http://your-real-api-server.com', // ⚠️ 必须是真实可用的地址
     remoteTarget: true
   };
   ```

3. **验证函数返回值**：
   - `return true` - 使用本地 Mock 数据
   - `return false` - 使用远程服务器数据

4. **检查控制台输出**：函数被调用时会有日志输出
   ```javascript
   export const check_PostRole = function () {
     console.log('🔍 check_PostRole 被调用了！');
     return false;
   };
   ```

**重要说明：** 如果 `target` 配置为占位符地址（如 `http://xxx.xxxx.com.cn`），系统会正确回退到本地 Mock 数据，这是预期的行为。要真正测试远程代理功能，需要配置真实可用的服务器地址。

### 💡 最佳实践

| 场景          | 建议                                                     |
| ------------- | -------------------------------------------------------- |
| **配置文件**  | 首次配置好提交上库之后，apiFilter配置不提交上库          |
| **类型文件**  | 建议提交到 Git，团队共享类型定义                         |
| **Mock 数据** | apifox接口有变化时，若对应业务有调整，mock需一并提交处理 |
| **切换环境**  | 后端完成后只需修改代理配置，代码无需改动                 |

## 📝 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md) 获取完整更新日志。
`

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

如有问题或建议，欢迎提 [Issue](https://github.com/lukemora/apifox-mock-generator/issues)！

⭐ 如果这个项目对你有帮助，请给一个 Star！
