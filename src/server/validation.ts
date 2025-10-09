import type express from 'express'

/**
 * 校验请求参数
 */
export function validateRequest(req: express.Request, validation: any): string | null {
  // 校验路径参数
  if (validation.params && Object.keys(validation.params).length > 0) {
    for (const [key, config] of Object.entries(validation.params)) {
      const paramConfig = config as any
      if (paramConfig.required && !req.params[key]) {
        return `路径参数 '${key}' 是必填的`
      }
      if (req.params[key] && !validateType(req.params[key], paramConfig.type)) {
        return `路径参数 '${key}' 类型错误，期望 ${paramConfig.type}`
      }
    }
  }

  // 校验查询参数
  if (validation.query && Object.keys(validation.query).length > 0) {
    for (const [key, config] of Object.entries(validation.query)) {
      const queryConfig = config as any
      if (queryConfig.required && !req.query[key]) {
        return `查询参数 '${key}' 是必填的`
      }
      if (req.query[key] && !validateType(req.query[key], queryConfig.type)) {
        return `查询参数 '${key}' 类型错误，期望 ${queryConfig.type}`
      }
    }
  }

  // 校验请求体
  if (validation.body) {
    if (validation.body.required && (!req.body || Object.keys(req.body).length === 0)) {
      return '请求体不能为空'
    }

    if (validation.body.schema && req.body) {
      const bodyError = validateSchema(req.body, validation.body.schema)
      if (bodyError) {
        return bodyError
      }
    }
  }

  return null
}

/**
 * 校验数据类型
 */
function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string'
    case 'number':
    case 'integer':
      return !isNaN(Number(value))
    case 'boolean':
      return value === 'true' || value === 'false' || typeof value === 'boolean'
    default:
      return true
  }
}

/**
 * 校验请求体 schema
 */
function validateSchema(data: any, schema: any, path: string = ''): string | null {
  if (!schema) return null

  // 对象类型
  if (schema.type === 'object' && schema.properties) {
    const required = schema.required || []

    // 检查必填字段
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        return `字段 '${path}${field}' 是必填的`
      }
    }

    // 递归校验每个属性
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined) {
        const error = validateSchema(data[key], propSchema, `${path}${key}.`)
        if (error) return error
      }
    }
  }

  // 数组类型
  if (schema.type === 'array' && Array.isArray(data)) {
    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        const error = validateSchema(data[i], schema.items, `${path}[${i}].`)
        if (error) return error
      }
    }
  }

  // 基础类型校验
  if (schema.type && !validateBasicType(data, schema.type)) {
    return `字段 '${path.slice(0, -1)}' 类型错误，期望 ${schema.type}`
  }

  return null
}

/**
 * 校验基础类型
 */
function validateBasicType(value: any, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
    case 'integer':
      return typeof value === 'number' && !isNaN(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'array':
      return Array.isArray(value)
    default:
      return true
  }
}

