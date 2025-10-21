// 此文件会被脚手架覆盖

/**
 * ESLint 配置文件
 *
 * 本配置文件基于 ESLint 9.x 的 flat config 格式
 * 支持 Vue 3 + TypeScript + Vite 项目
 *
 * 主要功能：
 * - Vue 3 组件规范检查
 * - TypeScript 类型检查
 * - 代码风格统一
 * - 文件名命名规范
 * - 与 Prettier 集成
 */

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import unicorn from 'eslint-plugin-unicorn';
import vue from 'eslint-plugin-vue';

export default [
  // ==================== 基础配置 ====================
  // JavaScript 推荐规则
  js.configs.recommended,

  // Vue 推荐规则
  ...vue.configs['flat/recommended'],

  // ==================== 全局忽略配置 ====================
  // 忽略不需要检查的文件和目录
  {
    ignores: [
      'dist/**', // 构建输出目录
      'node_modules/**', // 依赖包目录
      '*.min.js', // 压缩文件
      'coverage/**', // 测试覆盖率报告
      '.nuxt/**', // Nuxt.js 构建目录
      '.output/**', // 输出目录
      '.vscode/**', // VS Code 配置
      '.idea/**', // IntelliJ IDEA 配置
      'index.html' // 根目录的 HTML 文件
    ]
  },

  // ==================== 通用规则配置 ====================
  // 包含所有文件类型共享的规则
  {
    languageOptions: {
      globals: {
        // Node.js 环境变量
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
        // Vue 3 Composition API 全局变量
        ref: 'readonly',
        reactive: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript, // TypeScript 规则插件
      unicorn // 代码质量增强插件
    },
    rules: {
      // ==================== TypeScript 相关规则 ====================
      // 禁止未使用的变量，但允许以下划线开头的参数
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // 关闭 ESLint 的 no-unused-vars，使用 TypeScript 版本
      'no-unused-vars': 'off',
      // 关闭 no-undef，由 TypeScript 编译器处理
      'no-undef': 'off',

      // ==================== 文件名命名规范 ====================
      // 根据文件类型强制不同的命名格式
      'unicorn/filename-case': [
        'error',
        {
          // Vue 组件使用 PascalCase
          case: 'pascalCase',
          ignore: [
            // 配置文件允许任意格式
            /\.config\.(js|ts)$/,
            // TypeScript 声明文件
            /\.d\.ts$/,
            // 点文件（隐藏文件）
            /^\./,
            // 图像文件特殊命名
            /^(favicon\.ico|apple-touch-icon|android-chrome|mstile|logo|icon)/,
            /^[A-Z][a-zA-Z0-9]*\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff)$/,
            // 非Vue组件文件（JS、HTML、CSS等使用kebab-case）
            /^(?!.*\.vue$).*\.(js|ts|html|css|scss|less|json|md)$/
          ]
        }
      ],

      // ==================== 变量命名规范 ====================
      // 强制使用 camelCase 命名，但对象属性除外
      camelcase: [
        'error',
        {
          properties: 'never', // 对象属性不强制 camelCase
          ignoreDestructuring: false, // 解构赋值需要 camelCase
          ignoreImports: false, // 导入变量需要 camelCase
          ignoreGlobals: false // 全局变量需要 camelCase
        }
      ],
      // 构造函数命名规范：new 后面必须是大写字母开头
      'new-cap': [
        'error',
        {
          newIsCap: true, // new 操作符后面必须跟大写字母开头的构造函数
          capIsNew: false, // 允许大写字母开头的函数不被 new 调用
          properties: true // 检查对象属性的构造函数调用
        }
      ],
      // 标识符长度限制：2-30 个字符
      'id-length': [
        'error',
        {
          min: 2, // 最小长度 2 个字符
          max: 30, // 最大长度 30 个字符
          exceptions: ['_', 'i', 'j', 'k', 'x', 'y', 'z', 'e', 't', 'n', 'r', 's'] // 允许的例外
        }
      ],

      // ==================== 变量声明规范 ====================
      // 禁止使用 var，推荐使用 let 或 const
      'no-var': 'error',
      // 优先使用 const，如果变量不会重新赋值
      'prefer-const': 'error',
      // 禁止重新赋值 const 声明的变量
      'no-const-assign': 'error',

      // ==================== 函数命名规范 ====================
      // 函数表达式必须有名称（当需要时）
      'func-names': ['error', 'as-needed'],
      // 函数名必须与变量名匹配
      'func-name-matching': [
        'error',
        'always',
        {
          considerPropertyDescriptor: true, // 考虑属性描述符
          includeCommonJSModuleExports: false // 不包括 CommonJS 模块导出
        }
      ],

      // ==================== 代码质量规则 ====================
      // 警告使用 console，生产环境应移除
      'no-console': 'warn',
      // 警告使用 debugger，生产环境应移除
      'no-debugger': 'warn',
      // 优先使用对象简写语法
      'object-shorthand': 'error',
      // 优先使用模板字符串而不是字符串拼接
      'prefer-template': 'error',
      // 禁止抛出字面量，必须抛出 Error 对象
      'no-throw-literal': 'error',
      // Promise.reject 必须使用 Error 对象
      'prefer-promise-reject-errors': 'error',

      // ==================== 注释规范规则 ====================
      // 注释内容和注释符之间需要有一个空格
      'spaced-comment': [
        'error',
        'always',
        {
          line: {
            markers: ['/'],
            exceptions: ['-', '+']
          },
          block: {
            markers: ['!'],
            exceptions: ['*'],
            balanced: true
          }
        }
      ],
      // 警告使用 TODO、FIXME 等特殊标记
      'no-warning-comments': [
        'warn',
        {
          terms: ['todo', 'fixme', 'xxx', 'hack'],
          location: 'start'
        }
      ],

      // ==================== 代码风格规则 ====================
      // 注意：以下格式化相关规则已由 Prettier 处理，ESLint 专注于代码质量
      // 模板字符串中的空格规范 - 由 Prettier 处理
      // 'template-curly-spacing': 'error',
      // 箭头函数箭头前后的空格 - 由 Prettier 处理
      // 'arrow-spacing': 'error',
      // 尾随逗号 - 由 Prettier 处理
      // 'comma-dangle': ['error', 'never'],
      // 逗号后的空格 - 由 Prettier 处理
      // 'comma-spacing': 'error',
      // 逗号位置 - 由 Prettier 处理
      // 'comma-style': 'error',
      // 计算属性中的空格 - 由 Prettier 处理
      // 'computed-property-spacing': 'error',
      // 函数调用中的空格 - 由 Prettier 处理
      // 'func-call-spacing': 'error',
      // 对象键值对中的空格 - 由 Prettier 处理
      // 'key-spacing': 'error',
      // 关键字前后的空格 - 由 Prettier 处理
      // 'keyword-spacing': 'error',
      // 对象大括号内的空格 - 由 Prettier 处理
      // 'object-curly-spacing': ['error', 'always'],
      // 分号使用 - 由 Prettier 处理
      // semi: ['error', 'never'],
      // 分号前后的空格 - 由 Prettier 处理
      // 'semi-spacing': 'error',
      // 代码块前的空格 - 由 Prettier 处理
      // 'space-before-blocks': 'error',
      // 函数括号前的空格 - 由 Prettier 处理
      // 'space-before-function-paren': ['error', { ... }],
      // 圆括号内的空格 - 由 Prettier 处理
      // 'space-in-parens': 'error',
      // 操作符周围的空格 - 由 Prettier 处理
      // 'space-infix-ops': 'error',
      // 一元操作符的空格 - 由 Prettier 处理
      // 'space-unary-ops': 'error',
      // 注释中的空格 - 由 Prettier 处理
      // 'spaced-comment': 'error',
      // 引号类型 - 由 Prettier 处理
      // quotes: ['error', 'single', { avoidEscape: true }],
      // JSX 引号 - 由 Prettier 处理
      // 'jsx-quotes': ['error', 'prefer-double'],

      // ==================== 文件格式规则 ====================
      // 文件末尾换行符 - 由 Prettier 处理
      // 'eol-last': 'error',
      // 连续空行数量 - 由 Prettier 处理
      // 'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      // 行尾空格 - 由 Prettier 处理
      // 'no-trailing-spaces': 'error',
      // 缩进 - 由 Prettier 处理
      // indent: ['error', 2, { SwitchCase: 1 }],
      // 行长度限制 - 由 Prettier 处理
      // 'max-len': ['error', { ... }],

      // ==================== 最佳实践规则 ====================
      // 禁止使用 Array 构造函数
      'no-array-constructor': 'error',
      // 禁止使用 Object 构造函数
      'no-new-object': 'error',
      // 禁止使用包装器构造函数
      'no-new-wrappers': 'error',
      // parseInt 必须指定进制
      radix: 'error',
      // 立即执行函数表达式需要括号
      'wrap-iife': 'error',
      // 禁止 Yoda 条件（条件表达式中的字面量应该在右侧）
      yoda: 'error'
    }
  },

  // ==================== Vue 文件特定规则配置 ====================
  // 专门针对 .vue 文件的规则配置
  {
    files: ['**/*.vue'], // 匹配所有 .vue 文件
    languageOptions: {
      parser: vue.parser, // 使用 Vue 解析器
      parserOptions: {
        ecmaVersion: 'latest', // 使用最新的 ECMAScript 版本
        parser: typescriptParser, // 在 <script> 标签中使用 TypeScript 解析器
        sourceType: 'module', // 使用 ES 模块
        extraFileExtensions: ['.vue'] // 额外的文件扩展名
      }
    },
    rules: {
      // ==================== Vue 组件命名规范 ====================
      // 组件名必须由多个单词组成，避免与 HTML 元素冲突
      'vue/multi-word-component-names': 'error',
      // 模板中的组件名必须使用 PascalCase
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      // HTML 属性必须使用 kebab-case
      'vue/attribute-hyphenation': ['error', 'always'],
      // v-on 事件名必须使用 kebab-case
      'vue/v-on-event-hyphenation': ['error', 'always'],
      // 自定义事件名必须使用 kebab-case
      'vue/custom-event-name-casing': ['error', 'kebab-case'],

      // ==================== Vue 组件结构规范 ====================
      // 组件块顺序：template -> script -> style
      'vue/block-order': [
        'error',
        {
          order: ['template', 'script', 'style']
        }
      ],
      // 组件定义名必须使用 PascalCase
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      // define 宏的顺序：defineProps -> defineEmits -> defineExpose -> withDefaults
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineProps', 'defineEmits', 'defineExpose', 'withDefaults']
        }
      ],

      // ==================== Vue 指令使用规范 ====================
      // 警告使用 v-html，存在 XSS 风险
      'vue/no-v-html': 'warn',
      // v-for 必须提供 key
      'vue/require-v-for-key': 'error',
      // 禁止在同一个元素上同时使用 v-if 和 v-for
      'vue/no-use-v-if-with-v-for': 'error',
      // v-for 指令必须有效
      'vue/valid-v-for': 'error',
      // v-if 指令必须有效
      'vue/valid-v-if': 'error',
      // v-model 指令必须有效
      'vue/valid-v-model': 'error',

      // ==================== Vue 模板格式规范 ====================
      // HTML 标签自闭合规范 - 控制是否使用 <tag /> 语法
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'never', // void 元素（img, br, input 等）禁止使用 <tag /> 语法，必须用 <tag>
            normal: 'always', // 普通元素（div, span 等）强制使用 <tag /> 语法（空元素时）
            component: 'always' // Vue 组件强制使用 <tag /> 语法（无插槽内容时）
          },
          svg: 'always', // SVG 元素强制使用 <tag /> 语法（空元素时）
          math: 'always' // MathML 元素强制使用 <tag /> 语法（空元素时）
        }
      ],
      // 每行最大属性数量 - 控制标签属性的换行
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: { max: 1 }, // 单行标签最多 1 个属性（超过则换行）
          multiline: { max: 1 } // 多行标签每行最多 1 个属性
        }
      ],
      // 第一个属性的换行位置 - 控制多行标签的格式
      'vue/first-attribute-linebreak': [
        'error',
        {
          singleline: 'ignore', // 单行标签不处理第一个属性位置
          multiline: 'below' // 多行标签时，第一个属性换行到标签下方
        }
      ],
      // HTML 闭合括号的换行 - 控制 > 符号的位置
      'vue/html-closing-bracket-newline': [
        'error',
        {
          singleline: 'never', // 单行标签：<div class="foo"> 不换行
          multiline: 'always' // 多行标签：<div class="foo"\n  id="bar"> 换行
        }
      ],
      // HTML 缩进规范 - 控制标签和属性的缩进
      'vue/html-indent': [
        'error',
        2, // 标签内容缩进 2 个空格
        {
          attribute: 1, // 属性相对于标签名缩进 1 个空格
          baseIndent: 1, // 基础缩进 1 个空格
          closeBracket: 0, // 闭合括号不缩进
          alignAttributesVertically: true, // 垂直对齐属性
          ignores: [] // 不忽略任何元素
        }
      ]
    }
  },

  // ==================== TypeScript 文件特定规则配置 ====================
  // 专门针对 .ts 和 .tsx 文件的配置
  {
    files: ['**/*.{ts,tsx}'], // 匹配所有 TypeScript 文件
    languageOptions: {
      parser: typescriptParser, // 使用 TypeScript 解析器
      parserOptions: {
        ecmaVersion: 'latest', // 使用最新的 ECMAScript 版本
        sourceType: 'module' // 使用 ES 模块
      }
    }
    // 注意：TypeScript 规则已在通用配置中定义，这里不需要重复
  },

  // ==================== JavaScript 文件特定规则配置 ====================
  // 专门针对 .js 文件的配置
  {
    files: ['**/*.js'], // 匹配所有 JavaScript 文件
    rules: {
      // JavaScript 文件名使用 kebab-case
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [
            // 配置文件允许任意格式
            /\.config\.js$/,
            // 点文件（隐藏文件）
            /^\./,
            // 特殊文件
            /^(index|main|app)\.js$/
          ]
        }
      ]
    }
  },

  // ==================== HTML 文件特定规则配置 ====================
  // 专门针对 .html 文件的配置
  {
    files: ['**/*.html'], // 匹配所有 HTML 文件
    rules: {
      // HTML 文件名使用 kebab-case
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [
            // 特殊HTML文件
            /^(index|404|500)\.html$/,
            // 点文件（隐藏文件）
            /^\./
          ]
        }
      ]
    }
  },

  // ==================== 特定文件覆盖配置 ====================
  // 为 views 和 components 目录下的 index.vue 文件禁用多词组件名规则
  {
    files: ['**/views/**/index.vue', '**/components/**/index.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  },

  // ==================== Prettier 集成配置 ====================
  // 禁用与 Prettier 冲突的 ESLint 规则
  prettier
];
