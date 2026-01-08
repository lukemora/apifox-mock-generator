import type express from 'express';
import type { OpenAPISchema, OpenAPISchemaReference } from '../../types/openapi.js';

/**
 * 验证配置类型
 */
interface ValidationConfig {
  params?: Record<string, { required?: boolean; type: string }>;
  query?: Record<string, { required?: boolean; type: string }>;
  body?: {
    required?: boolean;
    schema?: OpenAPISchema | OpenAPISchemaReference;
  };
}

/**
 * 校验请求参数
 */
export function validateRequest(req: express.Request, validation: ValidationConfig): string | null {
  // 校验路径参数
  if (validation.params && Object.keys(validation.params).length > 0) {
    for (const [key, config] of Object.entries(validation.params)) {
      const paramConfig = config;
      if (paramConfig.required && !req.params[key]) {
        return `路径参数 '${key}' 是必填的`;
      }
      if (req.params[key] && !validateType(req.params[key], paramConfig.type)) {
        return `路径参数 '${key}' 类型错误，期望 ${paramConfig.type}`;
      }
    }
  }

  // 校验查询参数
  if (validation.query && Object.keys(validation.query).length > 0) {
    for (const [key, config] of Object.entries(validation.query)) {
      const queryConfig = config;
      if (queryConfig.required && !req.query[key]) {
        return `查询参数 '${key}' 是必填的`;
      }
      if (req.query[key] && !validateType(req.query[key], queryConfig.type)) {
        return `查询参数 '${key}' 类型错误，期望 ${queryConfig.type}`;
      }
    }
  }

  // 校验请求体
  if (validation.body) {
    if (validation.body.required && (!req.body || Object.keys(req.body).length === 0)) {
      return '请求体不能为空';
    }

    if (validation.body.schema && req.body) {
      const bodyError = validateSchema(req.body, validation.body.schema);
      if (bodyError) {
        return bodyError;
      }
    }
  }

  return null;
}

/**
 * 校验数据类型
 */
function validateType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
    case 'integer':
      return !isNaN(Number(value));
    case 'boolean':
      return value === 'true' || value === 'false' || typeof value === 'boolean';
    default:
      return true;
  }
}

/**
 * 校验请求体 schema
 */
function validateSchema(
  data: unknown,
  schema: OpenAPISchema | OpenAPISchemaReference,
  path: string = ''
): string | null {
  if (!schema) return null;

  // 如果是引用，跳过验证（实际应该解析引用）
  if ('$ref' in schema) {
    return null;
  }

  const concreteSchema = schema as OpenAPISchema;

  // 对象类型
  if (concreteSchema.type === 'object' && concreteSchema.properties) {
    const required = concreteSchema.required || [];

    // 检查必填字段
    for (const field of required) {
      if (
        typeof data === 'object' &&
        data !== null &&
        !Array.isArray(data) &&
        (data as Record<string, unknown>)[field] === undefined &&
        (data as Record<string, unknown>)[field] === null
      ) {
        return `字段 '${path}${field}' 是必填的`;
      }
    }

    // 递归校验每个属性
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const dataObj = data as Record<string, unknown>;
      for (const [key, propSchema] of Object.entries(concreteSchema.properties)) {
        if (dataObj[key] !== undefined) {
          const error = validateSchema(dataObj[key], propSchema, `${path}${key}.`);
          if (error) return error;
        }
      }
    }
  }

  // 数组类型
  if (concreteSchema.type === 'array' && Array.isArray(data)) {
    if (concreteSchema.items) {
      for (let i = 0; i < data.length; i++) {
        const error = validateSchema(data[i], concreteSchema.items, `${path}[${i}].`);
        if (error) return error;
      }
    }
  }

  // 基础类型校验
  if (concreteSchema.type && !validateBasicType(data, concreteSchema.type)) {
    return `字段 '${path.slice(0, -1)}' 类型错误，期望 ${concreteSchema.type}`;
  }

  return null;
}

/**
 * 校验基础类型
 */
function validateBasicType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
    case 'integer':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return true;
  }
}
