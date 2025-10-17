/**
 * 将 JSON Schema 类型映射到 lodash 类型检查方法
 */
export function mapTypeToLodashCheck(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'isString',
    'number': 'isNumber',
    'integer': 'isNumber',
    'boolean': 'isBoolean',
    'array': 'isArray',
    'object': 'isObject'
  };
  return typeMap[type] || 'isObject';
}

/**
 * 映射基础类型到 TypeScript 类型
 */
export function mapSchemaTypeToTS(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'number': 'number',
    'integer': 'number',
    'boolean': 'boolean',
    'array': 'any[]',
    'object': 'any'
  };
  return typeMap[type] || 'any';
}

/**
 * 获取 TypeScript 类型
 */
export function getTypeScriptType(schema: any): string {
  if (!schema) return 'any';

  if (schema.$ref) {
    return schema.$ref.split('/').pop();
  }

  switch (schema.type) {
    case 'string':
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum.map((e: string) => `'${e}'`).join(' | ');
      }
      return 'string';

    case 'number':
    case 'integer':
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum.map((e: number) => e.toString()).join(' | ');
      }
      return 'number';

    case 'boolean':
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum.join(' | ');
      }
      return 'boolean';

    case 'array':
      return `${getTypeScriptType(schema.items)}[]`;

    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, value]) => `'${key}': ${getTypeScriptType(value as any)}`)
          .join('; ');
        return `{ ${props} }`;
      }
      return 'Record<string, any>';

    default:
      return 'any';
  }
}

/**
 * 获取 TypeScript 类型（支持枚举检查）
 */
export function getTypeScriptTypeWithEnumCheck(schema: any, enumTypeName: string): string {
  if (!schema) return 'any';

  // 如果有枚举，使用类型引用
  if (schema.enum && schema.enum.length > 0) {
    return enumTypeName;
  }

  return getTypeScriptType(schema);
}
