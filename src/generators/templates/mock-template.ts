import type { ApiEndpoint } from '../../types/index.js'
import { mapTypeToLodashCheck } from '../../utils/type-mapping.js'

/**
 * 生成 Mock 文件内容（新格式，ES Module 版本，支持增量更新）
 */
export function generateMockFileContent(endpoint: ApiEndpoint, definitions?: any): string {
  const method = endpoint.method.toUpperCase()

  // 生成方法前缀和命名空间（用于注释标记）
  const methodPrefix = endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase()
  const pathSegments = endpoint.path.split('/').filter(s => s && !s.startsWith('{'))
  const resourceName = pathSegments[pathSegments.length - 1]
    ?.split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'Api'
  const namespaceName = `${methodPrefix}${resourceName}`

  // 生成参数校验数组
  const mockParams = generateMockParams(endpoint)

  // 生成 Mock.js 模板（用于响应数据）
  const mockTemplate = generateMockTemplateForResponse(endpoint.responseBody, definitions)

  // 生成注释标记
  const commentTag = `${endpoint.path}[${method}]`

  const content = `//[start]${commentTag}
/**
 * @apiName ${endpoint.name}
 * @apiURI ${endpoint.path}
 * @apiRequestType ${method}
 */
import Mock from "mockjs";
import lodash from "lodash";

export const check_${namespaceName} = function () {
\t//ture 本地数据， false 远程服务器数据
\treturn false;
};

export function ${namespaceName}(query, body, ctx) {
    const options = { req: { query, method: ctx.req.method }, data: JSON.stringify(body) }
    
    let apiMethod = lodash.get(options, 'req.method');
    let originQuery = options.req.query;
    let apiParams = apiMethod === 'GET' ? originQuery : JSON.parse(options.data || '{}');
    
    // ${endpoint.name}
    
    if (apiMethod === '${method}') {
        ${mockParams ? `
        let mockParams = ${mockParams};
        for(let i = 0, len = mockParams.length; i < len; i++) {
            let param =  mockParams[i];
            if (param.paramIsRequired && !apiParams.hasOwnProperty(param.paramKey)) {
                return {
                    code: 1,
                    msg: '缺少必要参数: ' + param.paramKey
                }
            }
            if (apiParams.hasOwnProperty(param.paramKey) && lodash[param.paramType] && !lodash[param.paramType](apiParams[param.paramKey])) {
                return {
                    code: 1,
                    msg: '参数类型错误: ' + param.paramKey
                }
            }
        }
        ` : ''}
        return new Promise(res => {
            setTimeout(() => {
                res(Mock.mock(${mockTemplate}))
            }, Math.random() * 3000)
            
        })
        ;
    }
        

    return {
        code: 1,
    msg: '请检查请求的method或者URI的query是否正确'
  };
}
//[end]${commentTag}
`

  return content
}

/**
 * 生成参数校验数组
 */
function generateMockParams(endpoint: ApiEndpoint): string | null {
  const params: any[] = []

  // 收集请求体参数
  if (endpoint.requestBody) {
    const bodyParams = extractParamsFromSchema(endpoint.requestBody)
    params.push(...bodyParams)
  }

  // 收集查询参数和路径参数
  if (endpoint.parameters && endpoint.parameters.length > 0) {
    endpoint.parameters.forEach(param => {
      params.push({
        paramKey: param.name,
        paramType: mapTypeToLodashCheck(param.type),
        paramIsRequired: param.required
      })
    })
  }

  if (params.length === 0) {
    return null
  }

  // 格式化为多行数组
  const formattedParams = params.map(p =>
    `\n            {\n                paramKey: '${p.paramKey}',\n                paramType: '${p.paramType}',\n                paramIsRequired: ${p.paramIsRequired}\n            }`
  ).join(',')

  return `[${formattedParams}\n        ]`
}

/**
 * 从 schema 提取参数配置
 */
function extractParamsFromSchema(schema: any, required: string[] = []): any[] {
  if (!schema) return []

  const params: any[] = []
  const requiredFields = schema.required || required

  if (schema.type === 'object' && schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const propSchema = prop as any
      params.push({
        paramKey: key,
        paramType: mapTypeToLodashCheck(propSchema.type),
        paramIsRequired: requiredFields.includes(key)
      })
    }
  }

  return params
}

/**
 * 生成 Mock.js 响应模板（格式化为对象字面量）
 */
function generateMockTemplateForResponse(schema: any, definitions?: any, indent: string = '\t\t\t\t\t'): string {
  if (!schema) return '{}'

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()
    if (definitions?.[refName]) {
      return generateMockTemplateForResponse(definitions[refName], definitions, indent)
    }
  }

  // 根据类型生成模板
  switch (schema.type) {
    case 'object':
      if (!schema.properties || Object.keys(schema.properties).length === 0) {
        return '{}'
      }

      let objContent = '{'
      const props = Object.entries(schema.properties)
      props.forEach(([key, prop], index) => {
        const propSchema = prop as any
        const mockValue = generateMockValueForField(key, propSchema, definitions)
        const comma = index < props.length - 1 ? ',' : ''
        objContent += `\n${indent}'${key}': ${mockValue}${comma}`
      })
      objContent += `\n${indent.slice(0, -1)}}` // 减少一级缩进
      return objContent

    case 'array':
      const itemTemplate = generateMockTemplateForResponse(schema.items, definitions, indent + '\t')
      return `[${itemTemplate}]`

    default:
      return generateMockValueForField('', schema, definitions)
  }
}

/**
 * 为单个字段生成 Mock 值
 */
function generateMockValueForField(fieldName: string, schema: any, definitions?: any): string {
  if (!schema) return 'null'

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()
    if (definitions?.[refName]) {
      return generateMockValueForField(fieldName, definitions[refName], definitions)
    }
  }

  switch (schema.type) {
    case 'string':
      return inferStringMockValue(schema, fieldName)

    case 'number':
    case 'integer':
      return inferNumberMockValue(schema, fieldName)

    case 'boolean':
      // 使用 Math.random() < 0.5 生成随机布尔值
      return 'Boolean(Math.random() < 0.5)'

    case 'array':
      return `[${generateMockValueForField('', schema.items, definitions)}]`

    case 'object':
      return generateMockTemplateForResponse(schema, definitions)

    default:
      return 'null'
  }
}

/**
 * 推断字符串类型的 Mock 值
 */
function inferStringMockValue(schema: any, fieldName?: string): string {
  // 1. 枚举值
  if (schema.enum) return `"${schema.enum[0]}"`

  // 2. 格式
  if (schema.format === 'date-time') return '"@datetime"'
  if (schema.format === 'date') return '"@date"'
  if (schema.format === 'email') return '"@email"'
  if (schema.format === 'url') return '"@url"'

  // 3. 根据字段名推断
  const name = (fieldName || '').toLowerCase()
  if (name.includes('code')) return 'String(Math.random() < 1)' // 状态码通常是字符串 "0" 或 "1"
  if (name.includes('msg') || name.includes('message')) {
    // 计算合适的字数范围
    const minWords = 0
    const maxWords = 11
    return `'@cword(${minWords}, ${maxWords})'`
  }
  if (name.includes('token')) return '"@guid"'
  if (name.includes('id') || name.includes('_id')) return '"@guid"'
  if (name.includes('email')) return '"@email"'
  if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) return '"/^1[3-9]\\\\d{9}$/"'
  if (name.includes('name') && !name.includes('file')) return '"@cname"'
  if (name.includes('username')) return '"@name"'
  if (name.includes('address')) return '"@county(true)"'
  if (name.includes('city')) return '"@city"'
  if (name.includes('province')) return '"@province"'
  if (name.includes('url') || name.includes('link') || name.includes('href')) return '"@url"'
  if (name.includes('avatar') || name.includes('image') || name.includes('img') || name.includes('pic')) return '"@image(\\"200x200\\")"'
  if (name.includes('title')) return '"@ctitle(5, 15)"'
  if (name.includes('content') || name.includes('desc') || name.includes('description')) return '"@cparagraph(1, 3)"'

  // 4. 示例值
  if (schema.example) return `"${schema.example}"`

  // 5. 默认规则
  return '"@string(5, 10)"'
}

/**
 * 推断数字类型的 Mock 值
 */
function inferNumberMockValue(schema: any, fieldName?: string): string {
  // 1. 如果有范围，使用范围
  if (schema.minimum !== undefined && schema.maximum !== undefined) {
    return `Number(Math.random() * ${schema.maximum - schema.minimum} + ${schema.minimum})`
  }

  // 2. 根据字段名推断
  const name = (fieldName || '').toLowerCase()
  if (name.includes('code') || name.includes('status')) {
    // code 字段通常 0 表示成功
    return 'Number(Math.random() < 0)' // 永远返回 0
  }
  if (name.includes('age')) return 'Number(Math.random() * 42 + 18)'
  if (name.includes('price') || name.includes('amount') || name.includes('money')) return 'Number((Math.random() * 10000).toFixed(2))'
  if (name.includes('count') || name.includes('num') || name.includes('total')) return 'Math.floor(Math.random() * 1000)'
  if (name.includes('page')) return 'Math.floor(Math.random() * 100) + 1'
  if (name.includes('size') || name.includes('limit')) return 'Math.floor(Math.random() * 90) + 10'

  // 3. 示例值
  if (schema.example !== undefined) return schema.example.toString()

  // 4. 默认规则
  return 'Math.floor(Math.random() * 100)'
}

