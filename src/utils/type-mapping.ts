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
export function getTypeScriptType(
  schema: any,
  schemaNameMap?: Map<string, string>,
  context?: any,
  definitions?: any,
  typePrefix?: string
): string {
  if (!schema) return 'any';

  // 处理 Apifox 数据模型引用
  if (schema['x-apifox-refs']) {
    const refs = schema['x-apifox-refs'];
    const refKeys = Object.keys(refs);

    if (refKeys.length > 0) {
      const ref = refs[refKeys[0]];
      if (ref && ref.$ref) {
        const refName = ref.$ref.split('/').pop();
        // 解码 URL 编码的 schema 名称
        const decodedRefName = decodeURIComponent(refName || '');
        const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

        // 如果有context和definitions，生成类型定义
        if (context && definitions && typePrefix) {
          if (definitions[decodedRefName]) {
            const interfaceName = `${typePrefix}${actualRefName}`;

            // 检查是否已经生成过这个类型
            if (!context.generatedTypes?.has(interfaceName)) {
              return `__GENERATE_TYPE__${interfaceName}`;
            }
          }
        }

        return actualRefName;
      }
    }
  }

  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    // 解码 URL 编码的 schema 名称
    const decodedRefName = decodeURIComponent(refName || '');
    // 使用映射关系查找实际的schema名称
    const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

    // 如果有context和definitions，生成类型定义
    if (context && definitions && typePrefix) {
      if (definitions[decodedRefName]) {
        const interfaceName = `${typePrefix}${actualRefName}`;

        // 检查是否已经生成过这个类型
        if (!context.generatedTypes?.has(interfaceName)) {
          // 这里需要生成类型定义，但getTypeScriptType函数没有生成接口的能力
          // 我们需要返回一个特殊的标记，让调用者知道需要生成类型定义
          return `__GENERATE_TYPE__${interfaceName}`;
        }
      }
    }

    return actualRefName;
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
      return `${getTypeScriptType(schema.items, schemaNameMap, context, definitions, typePrefix)}[]`;

    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, value]) => `'${key}': ${getTypeScriptType(value as any, schemaNameMap)}`)
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
export function getTypeScriptTypeWithEnumCheck(
  schema: any,
  enumTypeName: string,
  schemaNameMap?: Map<string, string>
): string {
  if (!schema) return 'any';

  // 如果有枚举，使用类型引用
  if (schema.enum && schema.enum.length > 0) {
    return enumTypeName;
  }

  return getTypeScriptType(schema, schemaNameMap);
}
