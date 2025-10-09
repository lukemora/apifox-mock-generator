import type { ApiEndpoint } from '../../types/index.js'
import { getTypeScriptType, getTypeScriptTypeWithEnumCheck, mapSchemaTypeToTS } from '../../utils/type-mapping.js'

/**
 * 为单个接口生成类型文件
 */
export function generateEndpointTypeFile(endpoint: ApiEndpoint, schemas: any): string {
  // 生成方法前缀（如 Post, Get, Put 等）
  const methodPrefix = endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase()

  // 生成命名空间名称（基于路径的最后一段，转为驼峰命名）
  const pathSegments = endpoint.path.split('/').filter(s => s && !s.startsWith('{'))
  const resourceName = pathSegments[pathSegments.length - 1]
    ?.split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'Api'

  const namespaceName = `${methodPrefix}${resourceName}`

  // 生成注释标记
  const commentTag = `${endpoint.path}[${endpoint.method}]`

  let content = `//[start]${commentTag}
export namespace ${namespaceName} {`

  // 生成响应类型
  content += `\n  export interface Res ${generateInterfaceBodyWithQuotes(endpoint.responseBody, schemas, '  ')}`

  // 生成嵌套类型和接口（用于请求参数）
  const nestedTypes = generateNestedTypesAndInterfaces(endpoint, schemas, namespaceName)
  if (nestedTypes) {
    content += `\n\n${nestedTypes}`
  }

  // 生成请求参数类型（合并 query, path params 和 body）
  const hasParams = endpoint.parameters && endpoint.parameters.length > 0
  const hasBody = endpoint.requestBody

  if (hasParams || hasBody) {
    content += `\n\n  export interface Request {`

    // 添加路径参数和查询参数
    if (hasParams) {
      endpoint.parameters?.forEach(param => {
        const optional = param.required ? '' : '?'
        const description = param.description ? `\n    /** ${param.description} */` : ''
        content += `${description}\n    '${param.name}'${optional}: ${mapSchemaTypeToTS(param.type)};`
      })
    }

    // 添加请求体参数
    if (hasBody) {
      const bodyProps = generateRequestBodyPropertiesWithQuotes(endpoint.requestBody, schemas, namespaceName, '    ')
      content += bodyProps
    }

    content += `\n  }`
  }

  content += `\n}\n//[end]${commentTag}\n`

  return content
}

/**
 * 生成接口体内容（属性名带引号）
 */
export function generateInterfaceBodyWithQuotes(schema: any, definitions: any, indent: string): string {
  if (!schema) return '{}'

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()
    if (definitions?.[refName]) {
      return generateInterfaceBodyWithQuotes(definitions[refName], definitions, indent)
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
      const description = prop.description ? `\n${indent}  /** ${prop.description} */` : ''
      const tsType = getTypeScriptType(prop)

      result += `${description}\n${indent}  '${propName}'${optional}: ${tsType};`
    }

    result += `\n${indent}}`
    return result
  }

  return '{}'
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

            result += `    '${nestedPropName}'${optional}: ${tsType};\n`
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

            result += `    '${itemPropName}'${optional}: ${tsType};\n`
          }

          result += `  }\n\n`
          generatedInterfaces.add(interfaceName)
        }
      }
    }
  }

  processSchema(schema, `${namespaceName}Request`)

  return result.trimEnd()
}

/**
 * 生成请求体属性（带引号）
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
      const description = prop.description ? `\n${indent}/** ${prop.description} */` : ''

      // 生成类型，对于嵌套对象使用接口名
      let tsType: string
      if (prop.type === 'object' && prop.properties) {
        const interfaceName = `${namespaceName}Request${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`
        tsType = interfaceName
      } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
        const interfaceName = `${namespaceName}Request${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}Item`
        tsType = `${interfaceName}[]`
      } else if (prop.enum && prop.enum.length > 0) {
        // 使用枚举类型名
        const enumTypeName = `${namespaceName}Request${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`
        tsType = enumTypeName
      } else {
        tsType = getTypeScriptType(prop)
      }

      result += `${description}\n${indent}'${propName}'${optional}: ${tsType};`
    }

    return result
  }

  return ''
}

