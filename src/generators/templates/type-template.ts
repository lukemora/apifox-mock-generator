import type { ApiEndpoint } from '../../types/index.js'
import { getTypeScriptType, getTypeScriptTypeWithEnumCheck, mapSchemaTypeToTS } from '../../utils/type-mapping.js'

/**
 * 为单个接口生成类型文件
 */
export function generateEndpointTypeFile(endpoint: ApiEndpoint, schemas: any): string {
  // 生成命名空间名称（基于完整路径，更具描述性）
  const pathSegments = endpoint.path.split('/').filter(s => s && !s.startsWith('{'))

  // 使用路径的所有有意义的段来生成名称，使其更具描述性
  // 例如：/api/user/info -> ApiUserInfo, /api/auth/login -> ApiAuthLogin
  const namespaceName = pathSegments
    .map(segment =>
      segment.split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    )
    .join('')

  // 生成注释标记
  const commentTag = `${endpoint.path}[${endpoint.method}]`

  let content = `//[start]${commentTag}
export namespace ${namespaceName} {`

  // 生成响应体中的枚举类型定义
  const responseEnumTypes = generateEnumTypesFromSchema(endpoint.responseBody, schemas, 'Res')
  if (responseEnumTypes) {
    content += `\n${responseEnumTypes}\n`
  }

  // 生成响应类型
  content += `\n  export interface Res ${generateInterfaceBodyWithQuotes(endpoint.responseBody, schemas, '  ', 'Res')}`

  // 生成嵌套类型和接口（用于请求参数）
  const nestedTypes = generateNestedTypesAndInterfaces(endpoint, schemas, namespaceName)
  if (nestedTypes) {
    content += `\n\n${nestedTypes}`
  }

  // 生成请求参数类型（分别处理 params, query 和 body）
  const hasParams = endpoint.parameters && endpoint.parameters.length > 0
  const hasBody = endpoint.requestBody

  // 区分路径参数和查询参数
  const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || []
  const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || []

  // 生成请求体枚举类型
  if (hasBody) {
    const requestEnumTypes = generateEnumTypesFromSchema(endpoint.requestBody, schemas, 'Req')
    if (requestEnumTypes) {
      content += `\n\n${requestEnumTypes}`
    }
  }

  // 生成路径参数类型
  if (pathParams.length > 0) {
    content += `\n\n  /** 路径参数 */`
    content += `\n  export interface PathParams {`
    pathParams.forEach(param => {
      const optional = param.required ? '' : '?'
      const description = param.description ? `\n    /** ${param.description} */` : ''
      content += `${description}\n    ${param.name}${optional}: ${mapSchemaTypeToTS(param.type)};`
    })
    content += `\n  }`
  }

  // 生成查询参数类型
  if (queryParams.length > 0) {
    content += `\n\n  /** 查询参数 */`
    content += `\n  export interface QueryParams {`
    queryParams.forEach(param => {
      const optional = param.required ? '' : '?'
      const description = param.description ? `\n    /** ${param.description} */` : ''
      content += `${description}\n    ${param.name}${optional}: ${mapSchemaTypeToTS(param.type)};`
    })
    content += `\n  }`
  }

  // 生成请求体类型
  if (hasBody) {
    content += `\n\n  /** 请求体 */`
    content += `\n  export interface Req ${generateInterfaceBodyWithQuotes(endpoint.requestBody, schemas, '  ', 'Req')}`
  }

  // 生成统一的 Request 类型（如果有任何请求参数）
  if (hasParams || hasBody) {
    content += `\n\n  /** 完整请求参数 */`
    content += `\n  export interface Request {`

    if (pathParams.length > 0) {
      content += `\n    /** 路径参数 */`
      content += `\n    path: PathParams;`
    }

    if (queryParams.length > 0) {
      content += `\n    /** 查询参数 */`
      content += `\n    query?: QueryParams;`
    }

    if (hasBody) {
      content += `\n    /** 请求体 */`
      content += `\n    body: Req;`
    }

    content += `\n  }`
  }

  content += `\n}\n//[end]${commentTag}\n`

  return content
}

/**
 * 生成接口体内容
 */
export function generateInterfaceBodyWithQuotes(schema: any, definitions: any, indent: string, typePrefix: string = ''): string {
  if (!schema) return '{}'

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()
    if (definitions?.[refName]) {
      return generateInterfaceBodyWithQuotes(definitions[refName], definitions, indent, typePrefix)
    }
  }

  if (schema.type === 'object' && schema.properties) {
    const props = Object.entries(schema.properties)
    if (props.length === 0) {
      return '{}'
    }

    let result = '{'
    const required = schema.required || []

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any
      const isRequired = required.includes(propName)
      const optional = isRequired ? '' : '?'

      // 生成注释（与 Mock 保持一致）
      let comment = ''
      const fieldDesc = prop.title || prop.description || ''

      // 处理枚举类型，展示枚举选项
      if (prop['x-apifox-enum'] && Array.isArray(prop['x-apifox-enum'])) {
        const enumItems = prop['x-apifox-enum']
          .map((item: any) => `${item.value}:${item.name}`)
          .join(', ')
        if (enumItems) {
          // 如果有字段说明，格式为：/** 字段说明 枚举选项 */
          comment = fieldDesc ? `\n${indent}  /** ${fieldDesc} ${enumItems} */` : `\n${indent}  /** ${enumItems} */`
        } else if (fieldDesc) {
          comment = `\n${indent}  /** ${fieldDesc} */`
        }
      } else if (fieldDesc) {
        comment = `\n${indent}  /** ${fieldDesc} */`
      }

      // 转换属性名为驼峰命名（如果需要）
      const propNameCamel = propName.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())
      const needsQuotes = propName !== propNameCamel || /[^a-zA-Z0-9_$]/.test(propName)

      // 如果有枚举，使用类型引用；否则使用内联类型
      let tsType: string
      if (prop.enum && prop.enum.length > 0) {
        const typeName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`
        tsType = typeName
      } else if (prop.type === 'object' && prop.properties) {
        // 嵌套对象，递归处理
        tsType = generateInterfaceBodyWithQuotes(prop, definitions, indent + '  ', `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`)
      } else {
        tsType = getTypeScriptType(prop)
      }

      // 只在必要时使用引号
      const propNameFormatted = needsQuotes ? `'${propName}'` : propName
      result += `${comment}\n${indent}  ${propNameFormatted}${optional}: ${tsType};`
    }

    result += `\n${indent}}`
    return result
  }

  return '{}'
}

/**
 * 从 Schema 中提取并生成枚举类型定义
 */
export function generateEnumTypesFromSchema(schema: any, definitions: any, typePrefix: string, indent: string = '  '): string {
  if (!schema) return ''

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()
    if (definitions?.[refName]) {
      return generateEnumTypesFromSchema(definitions[refName], definitions, typePrefix, indent)
    }
  }

  let result = ''
  const generatedTypes = new Set<string>()

  const processProperties = (props: any, prefix: string) => {
    for (const [propName, propSchema] of Object.entries(props)) {
      const prop = propSchema as any
      const typeName = `${prefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`

      // 处理枚举类型
      if (prop.enum && prop.enum.length > 0 && !generatedTypes.has(typeName)) {
        // 生成注释（与 Mock 保持一致）
        let comment = ''
        const fieldDesc = prop.title || prop.description || ''

        // 处理枚举类型，展示枚举选项
        if (prop['x-apifox-enum'] && Array.isArray(prop['x-apifox-enum'])) {
          const enumItems = prop['x-apifox-enum']
            .map((item: any) => `${item.value}:${item.name}`)
            .join(', ')
          if (enumItems) {
            comment = fieldDesc ? `\n${indent}/** ${fieldDesc} ${enumItems} */` : `\n${indent}/** ${enumItems} */`
          } else if (fieldDesc) {
            comment = `\n${indent}/** ${fieldDesc} */`
          }
        } else if (fieldDesc) {
          comment = `\n${indent}/** ${fieldDesc} */`
        }

        let enumValues: string

        if (prop.type === 'string') {
          enumValues = prop.enum.map((v: string) => `'${v}'`).join(' | ')
        } else {
          enumValues = prop.enum.join(' | ')
        }

        result += `${comment}\n${indent}export type ${typeName} = ${enumValues};\n`
        generatedTypes.add(typeName)
      }

      // 递归处理嵌套对象
      if (prop.type === 'object' && prop.properties) {
        result += processProperties(prop.properties, typeName)
      }

      // 递归处理数组中的对象
      if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
        result += processProperties(prop.items.properties, `${typeName}Item`)
      }
    }
    return result
  }

  if (schema.type === 'object' && schema.properties) {
    result = processProperties(schema.properties, typePrefix)
  }

  return result
}

/**
 * 生成嵌套类型和接口（用于复杂请求参数）
 */
export function generateNestedTypesAndInterfaces(endpoint: ApiEndpoint, schemas: any, namespaceName: string): string {
  if (!endpoint.requestBody) return ''

  const schema = endpoint.requestBody
  let result = ''
  const generatedInterfaces = new Set<string>()

  // 递归处理 schema 中的嵌套对象
  const processSchema = (s: any, parentName: string): void => {
    if (!s || !s.properties) return

    for (const [propName, propSchema] of Object.entries(s.properties)) {
      const prop = propSchema as any

      // 处理枚举类型
      if (prop.type === 'string' && prop.enum && prop.enum.length > 0) {
        const typeName = `${parentName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`
        if (!generatedInterfaces.has(typeName)) {
          const enumValues = prop.enum.map((v: any) => typeof v === 'string' ? `'${v}'` : v).join(' | ')
          result += `  export type ${typeName} = ${enumValues};\n\n`
          generatedInterfaces.add(typeName)
        }
      }

      // 处理数字枚举类型
      if ((prop.type === 'number' || prop.type === 'integer') && prop.enum && prop.enum.length > 0) {
        const typeName = `${parentName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`
        if (!generatedInterfaces.has(typeName)) {
          const enumValues = prop.enum.join(' | ')
          result += `  export type ${typeName} = ${enumValues};\n\n`
          generatedInterfaces.add(typeName)
        }
      }

      // 处理嵌套对象
      if (prop.type === 'object' && prop.properties) {
        const interfaceName = `${parentName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`
        if (!generatedInterfaces.has(interfaceName)) {
          result += `  export interface ${interfaceName} {\n`

          const required = prop.required || []
          for (const [nestedPropName, nestedPropSchema] of Object.entries(prop.properties)) {
            const nestedProp = nestedPropSchema as any
            const isRequired = required.includes(nestedPropName)
            const optional = isRequired ? '' : '?'
            const tsType = getTypeScriptTypeWithEnumCheck(nestedProp, `${interfaceName}${nestedPropName.charAt(0).toUpperCase() + nestedPropName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)

            // 转换属性名为驼峰命名（如果需要）
            const propNameCamel = nestedPropName.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())
            const needsQuotes = nestedPropName !== propNameCamel || /[^a-zA-Z0-9_$]/.test(nestedPropName)
            const propNameFormatted = needsQuotes ? `'${nestedPropName}'` : nestedPropName

            result += `    ${propNameFormatted}${optional}: ${tsType};\n`
          }

          result += `  }\n\n`
          generatedInterfaces.add(interfaceName)

          // 递归处理嵌套对象的属性
          processSchema(prop, interfaceName)
        }
      }

      // 处理数组中的对象
      if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
        const interfaceName = `${parentName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}Item`
        if (!generatedInterfaces.has(interfaceName)) {
          result += `  export interface ${interfaceName} {\n`

          const required = prop.items.required || []
          for (const [itemPropName, itemPropSchema] of Object.entries(prop.items.properties)) {
            const itemProp = itemPropSchema as any
            const isRequired = required.includes(itemPropName)
            const optional = isRequired ? '' : '?'
            const tsType = getTypeScriptType(itemProp)

            // 转换属性名为驼峰命名（如果需要）
            const propNameCamel = itemPropName.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())
            const needsQuotes = itemPropName !== propNameCamel || /[^a-zA-Z0-9_$]/.test(itemPropName)
            const propNameFormatted = needsQuotes ? `'${itemPropName}'` : itemPropName

            result += `    ${propNameFormatted}${optional}: ${tsType};\n`
          }

          result += `  }\n\n`
          generatedInterfaces.add(interfaceName)
        }
      }
    }
  }

  processSchema(schema, 'Req')

  return result.trimEnd()
}

/**
 * 生成请求体属性
 */
export function generateRequestBodyPropertiesWithQuotes(schema: any, definitions: any, namespaceName: string, indent: string): string {
  if (!schema) return ''

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()
    if (definitions?.[refName]) {
      return generateRequestBodyPropertiesWithQuotes(definitions[refName], definitions, namespaceName, indent)
    }
  }

  if (schema.type === 'object' && schema.properties) {
    let result = ''
    const required = schema.required || []

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any
      const isRequired = required.includes(propName)
      const optional = isRequired ? '' : '?'

      // 生成注释（与 Mock 保持一致）
      let comment = ''
      const fieldDesc = prop.title || prop.description || ''

      // 处理枚举类型，展示枚举选项
      if (prop['x-apifox-enum'] && Array.isArray(prop['x-apifox-enum'])) {
        const enumItems = prop['x-apifox-enum']
          .map((item: any) => `${item.value}:${item.name}`)
          .join(', ')
        if (enumItems) {
          // 如果有字段说明，格式为：/** 字段说明 枚举选项 */
          comment = fieldDesc ? `\n${indent}/** ${fieldDesc} ${enumItems} */` : `\n${indent}/** ${enumItems} */`
        } else if (fieldDesc) {
          comment = `\n${indent}/** ${fieldDesc} */`
        }
      } else if (fieldDesc) {
        comment = `\n${indent}/** ${fieldDesc} */`
      }

      // 转换属性名为驼峰命名（如果需要）
      const propNameCamel = propName.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())
      const needsQuotes = propName !== propNameCamel || /[^a-zA-Z0-9_$]/.test(propName)

      // 生成类型，对于嵌套对象使用接口名
      let tsType: string
      if (prop.type === 'object' && prop.properties) {
        const interfaceName = `Req${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`
        tsType = interfaceName
      } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
        const interfaceName = `Req${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}Item`
        tsType = `${interfaceName}[]`
      } else if (prop.enum && prop.enum.length > 0) {
        // 使用枚举类型名
        const enumTypeName = `Req${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`
        tsType = enumTypeName
      } else {
        tsType = getTypeScriptType(prop)
      }

      // 只在必要时使用引号
      const propNameFormatted = needsQuotes ? `'${propName}'` : propName
      result += `${comment}\n${indent}${propNameFormatted}${optional}: ${tsType};`
    }

    return result
  }

  return ''
}

