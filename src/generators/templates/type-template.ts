import type { ApiEndpoint } from '../../types/index.js';
import { getTypeScriptType, mapSchemaTypeToTS } from '../../utils/type-mapping.js';

/**
 * 类型生成上下文，用于管理已生成的类型，避免重复
 */
interface TypeGenerationContext {
  /** 已生成的类型名称集合 */
  generatedTypes: Set<string>;
  /** 已生成的复杂类型定义 */
  complexTypes: Map<string, string>;
  /** 当前命名空间名称 */
  namespaceName: string;
}

/**
 * 为单个接口生成命名空间内容
 */
export function generateNamespaceContent(endpoint: ApiEndpoint, schemas: any): string {
  const context: TypeGenerationContext = {
    generatedTypes: new Set(),
    complexTypes: new Map(),
    namespaceName: generateNamespaceName(endpoint)
  };

  // 生成注释标记
  const commentTag = `${endpoint.path}[${endpoint.method}]`;

  let content = `//[start]${commentTag}
export namespace ${context.namespaceName} {`;

  // 生成响应体类型
  if (endpoint.responseBody) {
    const responseTypes = generateResponseTypes(endpoint.responseBody, schemas, context);
    if (responseTypes) {
      content += `\n${responseTypes}`;
    }
  }

  // 生成请求体类型
  if (endpoint.requestBody) {
    const requestTypes = generateRequestTypes(endpoint, schemas, context);
    if (requestTypes) {
      content += `\n\n${requestTypes}`;
    }
  }

  // 生成参数类型
  const parameterTypes = generateParameterTypes(endpoint, context);
  if (parameterTypes) {
    content += `\n\n${parameterTypes}`;
  }

  // 生成复杂类型定义
  const complexTypeDefinitions = generateComplexTypeDefinitions(context);
  if (complexTypeDefinitions) {
    content += `\n\n${complexTypeDefinitions}`;
  }

  content += `\n}
//[end]${commentTag}`;

  return content;
}

/**
 * 生成命名空间名称
 */
function generateNamespaceName(endpoint: ApiEndpoint): string {
  const pathSegments = endpoint.path.split('/').filter(s => s && !s.startsWith('{'));

  // 使用路径的所有有意义的段来生成名称
  const namespaceName = pathSegments
    .map(segment =>
      segment
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    )
    .join('');

  // 添加请求方法后缀
  const methodSuffix =
    endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase();

  return `${namespaceName}${methodSuffix}`;
}

/**
 * 生成响应体类型
 */
function generateResponseTypes(
  responseBody: any,
  schemas: any,
  context: TypeGenerationContext
): string {
  let content = '';

  // 生成响应体主类型
  content += `\n  /** 响应体 */`;
  content += `\n  export interface Res ${generateInterfaceBody(responseBody, schemas, context, 'Res')}`;

  return content;
}

/**
 * 生成请求体类型
 */
function generateRequestTypes(
  endpoint: ApiEndpoint,
  schemas: any,
  context: TypeGenerationContext
): string {
  let content = '';

  // 生成请求体类型
  if (endpoint.requestBody) {
    content += `  /** 请求体 */`;
    content += `\n  export interface Req ${generateInterfaceBody(endpoint.requestBody, schemas, context, 'Req')}`;
  }

  // 生成路径参数类型
  const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
  if (pathParams.length > 0) {
    content += `\n\n  /** 路径参数 */`;
    content += `\n  export interface PathParams {`;
    pathParams.forEach(param => {
      const optional = param.required ? '' : '?';
      const description = param.description ? `\n    /** ${param.description} */` : '';
      content += `${description}\n    ${param.name}${optional}: ${mapSchemaTypeToTS(param.type)};`;
    });
    content += `\n  }`;
  }

  // 生成查询参数类型
  const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
  if (queryParams.length > 0) {
    content += `\n\n  /** 查询参数 */`;
    content += `\n  export interface QueryParams {`;
    queryParams.forEach(param => {
      const optional = param.required ? '' : '?';
      const description = param.description ? `\n    /** ${param.description} */` : '';
      content += `${description}\n    ${param.name}${optional}: ${mapSchemaTypeToTS(param.type)};`;
    });
    content += `\n  }`;
  }

  // 生成统一的请求类型
  if (pathParams.length > 0 || queryParams.length > 0 || endpoint.requestBody) {
    content += `\n\n  /** 完整请求参数 */`;
    content += `\n  export interface Request {`;

    if (pathParams.length > 0) {
      content += `\n    /** 路径参数 */`;
      content += `\n    path: PathParams;`;
    }

    if (queryParams.length > 0) {
      content += `\n    /** 查询参数 */`;
      content += `\n    query?: QueryParams;`;
    }

    if (endpoint.requestBody) {
      content += `\n    /** 请求体 */`;
      content += `\n    body: Req;`;
    }

    content += `\n  }`;
  }

  return content;
}

/**
 * 生成参数类型（兼容旧版本）
 */
function generateParameterTypes(endpoint: ApiEndpoint, context: TypeGenerationContext): string {
  // 这个方法在新架构中已经被 generateRequestTypes 替代
  // 保留是为了兼容性
  return '';
}

/**
 * 生成复杂类型定义
 */
function generateComplexTypeDefinitions(context: TypeGenerationContext): string {
  if (context.complexTypes.size === 0) {
    return '';
  }

  let content = '';
  for (const [typeName, typeDefinition] of context.complexTypes) {
    content += `\n  ${typeDefinition}\n`;
  }

  return content;
}

/**
 * 生成接口体内容
 */
function generateInterfaceBody(
  schema: any,
  definitions: any,
  context: TypeGenerationContext,
  typePrefix: string
): string {
  if (!schema) return '{}';

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (definitions?.[refName]) {
      return generateInterfaceBody(definitions[refName], definitions, context, typePrefix);
    }
  }

  if (schema.type === 'object' && schema.properties) {
    const props = Object.entries(schema.properties);
    if (props.length === 0) {
      return '{}';
    }

    let result = '{';
    const required = schema.required || [];

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any;
      const isRequired = required.includes(propName);
      const optional = isRequired ? '' : '?';

      // 生成注释
      let comment = '';
      const fieldDesc = prop.title || prop.description || '';

      // 处理枚举类型，展示枚举选项
      if (prop['x-apifox-enum'] && Array.isArray(prop['x-apifox-enum'])) {
        const enumItems = prop['x-apifox-enum']
          .map((item: any) => `${item.value}:${item.name}`)
          .join(', ');
        if (enumItems) {
          comment = fieldDesc
            ? `\n    /** ${fieldDesc} ${enumItems} */`
            : `\n    /** ${enumItems} */`;
        } else if (fieldDesc) {
          comment = `\n    /** ${fieldDesc} */`;
        }
      } else if (fieldDesc) {
        comment = `\n    /** ${fieldDesc} */`;
      }

      // 转换属性名为驼峰命名（如果需要）
      const propNameCamel = propName.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase());
      const needsQuotes = propName !== propNameCamel || /[^a-zA-Z0-9_$]/.test(propName);

      // 生成类型
      let tsType: string;
      if (prop.enum && prop.enum.length > 0) {
        // 枚举类型，生成独立类型
        const enumTypeName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`;
        tsType = enumTypeName;

        // 生成枚举类型定义
        if (!context.generatedTypes.has(enumTypeName)) {
          const enumValues = prop.enum
            .map((v: any) => (typeof v === 'string' ? `'${v}'` : v))
            .join(' | ');
          context.complexTypes.set(enumTypeName, `export type ${enumTypeName} = ${enumValues};`);
          context.generatedTypes.add(enumTypeName);
        }
      } else if (prop.type === 'object' && prop.properties) {
        // 嵌套对象，生成独立接口
        const interfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`;
        tsType = interfaceName;

        // 生成嵌套接口定义
        if (!context.generatedTypes.has(interfaceName)) {
          const nestedInterface = generateNestedInterface(
            prop,
            definitions,
            context,
            interfaceName
          );
          context.complexTypes.set(interfaceName, nestedInterface);
          context.generatedTypes.add(interfaceName);
        }
      } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
        // 数组中的对象，生成独立接口
        const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
        tsType = `${itemInterfaceName}[]`;

        // 生成数组项接口定义
        if (!context.generatedTypes.has(itemInterfaceName)) {
          const itemInterface = generateNestedInterface(
            prop.items,
            definitions,
            context,
            itemInterfaceName
          );
          context.complexTypes.set(itemInterfaceName, itemInterface);
          context.generatedTypes.add(itemInterfaceName);
        }
      } else {
        tsType = getTypeScriptType(prop);
      }

      // 只在必要时使用引号
      const propNameFormatted = needsQuotes ? `'${propName}'` : propName;
      result += `${comment}\n    ${propNameFormatted}${optional}: ${tsType};`;
    }

    result += `\n  }`;
    return result;
  }

  return '{}';
}

/**
 * 生成嵌套接口
 */
function generateNestedInterface(
  schema: any,
  definitions: any,
  context: TypeGenerationContext,
  interfaceName: string
): string {
  if (!schema || !schema.properties) {
    return `export interface ${interfaceName} {}`;
  }

  let content = `export interface ${interfaceName} {`;
  const required = schema.required || [];

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const prop = propSchema as any;
    const isRequired = required.includes(propName);
    const optional = isRequired ? '' : '?';

    // 生成注释
    let comment = '';
    const fieldDesc = prop.title || prop.description || '';

    if (prop['x-apifox-enum'] && Array.isArray(prop['x-apifox-enum'])) {
      const enumItems = prop['x-apifox-enum']
        .map((item: any) => `${item.value}:${item.name}`)
        .join(', ');
      if (enumItems) {
        comment = fieldDesc
          ? `\n    /** ${fieldDesc} ${enumItems} */`
          : `\n    /** ${enumItems} */`;
      } else if (fieldDesc) {
        comment = `\n    /** ${fieldDesc} */`;
      }
    } else if (fieldDesc) {
      comment = `\n    /** ${fieldDesc} */`;
    }

    // 转换属性名为驼峰命名（如果需要）
    const propNameCamel = propName.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase());
    const needsQuotes = propName !== propNameCamel || /[^a-zA-Z0-9_$]/.test(propName);

    // 生成类型
    let tsType: string;
    if (prop.enum && prop.enum.length > 0) {
      // 枚举类型，生成独立类型
      const enumTypeName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`;
      tsType = enumTypeName;

      // 生成枚举类型定义
      if (!context.generatedTypes.has(enumTypeName)) {
        const enumValues = prop.enum
          .map((v: any) => (typeof v === 'string' ? `'${v}'` : v))
          .join(' | ');
        context.complexTypes.set(enumTypeName, `export type ${enumTypeName} = ${enumValues};`);
        context.generatedTypes.add(enumTypeName);
      }
    } else if (prop.type === 'object' && prop.properties) {
      // 嵌套对象，递归处理
      const nestedInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`;
      tsType = nestedInterfaceName;

      // 生成嵌套接口定义
      if (!context.generatedTypes.has(nestedInterfaceName)) {
        const nestedInterface = generateNestedInterface(
          prop,
          definitions,
          context,
          nestedInterfaceName
        );
        context.complexTypes.set(nestedInterfaceName, nestedInterface);
        context.generatedTypes.add(nestedInterfaceName);
      }
    } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
      // 数组中的对象，生成独立接口
      const itemInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
      tsType = `${itemInterfaceName}[]`;

      // 生成数组项接口定义
      if (!context.generatedTypes.has(itemInterfaceName)) {
        const itemInterface = generateNestedInterface(
          prop.items,
          definitions,
          context,
          itemInterfaceName
        );
        context.complexTypes.set(itemInterfaceName, itemInterface);
        context.generatedTypes.add(itemInterfaceName);
      }
    } else {
      tsType = getTypeScriptType(prop);
    }

    // 只在必要时使用引号
    const propNameFormatted = needsQuotes ? `'${propName}'` : propName;
    content += `${comment}\n    ${propNameFormatted}${optional}: ${tsType};`;
  }

  content += `\n  }`;
  return content;
}
