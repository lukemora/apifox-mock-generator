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
export function generateNamespaceContent(
  endpoint: ApiEndpoint,
  schemas: any,
  schemaNameMap?: Map<string, string>
): string {
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
    const responseTypes = generateResponseTypes(
      endpoint.responseBody,
      schemas,
      context,
      schemaNameMap
    );
    if (responseTypes) {
      content += `\n${responseTypes}`;
    }
  }

  // 生成请求体类型和参数类型
  if (endpoint.requestBody || endpoint.parameters?.length) {
    const requestTypes = generateRequestTypes(endpoint, schemas, context, schemaNameMap);
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
  context: TypeGenerationContext,
  schemaNameMap?: Map<string, string>
): string {
  let content = '';

  // 生成响应体主类型
  content += `\n  /** 响应体 */`;
  const responseType = generateInterfaceBody(responseBody, schemas, context, 'Res', schemaNameMap);
  if (responseType.startsWith('export interface')) {
    // 如果返回的是完整的接口定义，直接使用
    content += `\n  ${responseType}`;
  } else if (responseType.startsWith('{')) {
    // 如果返回的是对象字面量，直接使用
    content += `\n  export interface Res ${responseType}`;
  } else {
    // 如果返回的是类型名称，生成完整的接口定义而不是继承
    const referencedInterface = context.complexTypes.get(responseType);
    if (referencedInterface) {
      // 提取接口体内容，去掉 export interface 部分
      const interfaceBody = referencedInterface.replace(/export interface \w+ /, '');
      content += `\n  export interface Res ${interfaceBody}`;
    } else {
      // 如果没有找到引用的接口，使用继承作为后备
      content += `\n  export interface Res extends ${responseType} {}`;
    }
  }

  return content;
}

/**
 * 生成请求体类型
 */
function generateRequestTypes(
  endpoint: ApiEndpoint,
  schemas: any,
  context: TypeGenerationContext,
  schemaNameMap?: Map<string, string>
): string {
  let content = '';

  // 生成请求体类型
  if (endpoint.requestBody) {
    content += `  /** 请求体 */`;
    const requestType = generateInterfaceBody(
      endpoint.requestBody,
      schemas,
      context,
      'ReqData',
      schemaNameMap
    );
    if (requestType.startsWith('export interface')) {
      // 如果返回的是完整的接口定义，直接使用
      content += `\n  ${requestType}`;
    } else if (requestType.startsWith('{')) {
      // 如果返回的是对象字面量，直接使用
      content += `\n  export interface ReqData ${requestType}`;
    } else {
      // 如果返回的是类型名称，生成完整的接口定义而不是继承
      const referencedInterface = context.complexTypes.get(requestType);
      if (referencedInterface) {
        // 提取接口体内容，去掉 export interface 部分
        const interfaceBody = referencedInterface.replace(/export interface \w+ /, '');
        content += `\n  export interface ReqData ${interfaceBody}`;
      } else {
        // 如果没有找到引用的接口，使用继承作为后备
        content += `\n  export interface ReqData extends ${requestType} {}`;
      }
    }
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
    content += `\n  export interface Query {`;
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
    content += `\n  export interface Req {`;

    if (pathParams.length > 0) {
      content += `\n    /** 路径参数 */`;
      content += `\n    path: PathParams;`;
    }

    if (queryParams.length > 0) {
      content += `\n    /** 查询参数 */`;
      content += `\n    query?: Query;`;
    }

    if (endpoint.requestBody) {
      content += `\n    /** 请求体 */`;
      content += `\n    body: ReqData;`;
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
  typePrefix: string,
  schemaNameMap?: Map<string, string>
): string {
  if (!schema) return '{}';

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    // 解码 URL 编码的 schema 名称
    const decodedRefName = decodeURIComponent(refName || '');
    // 使用映射关系查找实际的schema名称
    const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

    // 检查是否是标准响应体 schema，如果是则直接展开字段
    // 标准响应体通常包含 code, msg, data 字段
    if (definitions?.[decodedRefName]) {
      const schema = definitions[decodedRefName];
      if (
        schema.properties &&
        schema.properties.code &&
        schema.properties.msg &&
        schema.properties.data
      ) {
        // 这是一个标准响应体结构，直接展开字段而不是返回空对象
        return generateStandardResponseBody(schema, definitions, context, schemaNameMap);
      }
    }

    if (definitions?.[decodedRefName]) {
      // 生成一个基于当前上下文的类型名称
      const interfaceName = `${typePrefix}${actualRefName}`;

      // 检查是否已经生成过这个类型
      if (!context.generatedTypes.has(interfaceName)) {
        const nestedInterface = generateNestedInterface(
          definitions[decodedRefName],
          definitions,
          context,
          interfaceName,
          schemaNameMap
        );
        context.complexTypes.set(interfaceName, nestedInterface);
        context.generatedTypes.add(interfaceName);
      }

      return interfaceName;
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

      // 特殊处理data字段：强制生成ResData接口
      if (propName === 'data') {
        const resDataInterfaceName = 'ResData';

        // 检查data字段是否为null类型
        if (prop.type === 'null') {
          // 只有当type明确为null时，ResData才应该是null类型
          if (!context.generatedTypes.has(resDataInterfaceName)) {
            context.complexTypes.set(
              resDataInterfaceName,
              `export type ${resDataInterfaceName} = null;`
            );
            context.generatedTypes.add(resDataInterfaceName);
          }
          tsType = resDataInterfaceName;
        } else {
          // 如果data不是null，生成正常的ResData接口
          if (!context.generatedTypes.has(resDataInterfaceName)) {
            const nestedInterface = generateNestedInterface(
              prop,
              definitions,
              context,
              resDataInterfaceName,
              schemaNameMap
            );
            context.complexTypes.set(resDataInterfaceName, nestedInterface);
            context.generatedTypes.add(resDataInterfaceName);
          }
          tsType = resDataInterfaceName;
        }
      } else {
        // 处理 Apifox 数据模型引用
        if (prop['x-apifox-refs']) {
          const refs = prop['x-apifox-refs'];
          const refKeys = Object.keys(refs);

          if (refKeys.length > 0) {
            const ref = refs[refKeys[0]];
            if (ref && ref.$ref) {
              const refName = ref.$ref.split('/').pop();
              const decodedRefName = decodeURIComponent(refName || '');
              const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

              // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
              const interfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`;
              tsType = interfaceName;

              // 生成数据模型接口定义
              if (!context.generatedTypes.has(interfaceName)) {
                const nestedInterface = generateNestedInterface(
                  definitions?.[decodedRefName],
                  definitions,
                  context,
                  interfaceName,
                  schemaNameMap
                );
                context.complexTypes.set(interfaceName, nestedInterface);
                context.generatedTypes.add(interfaceName);
              }
            } else {
              tsType = getTypeScriptType(prop, schemaNameMap, context, definitions, typePrefix);
            }
          } else {
            tsType = getTypeScriptType(prop, schemaNameMap, context, definitions, typePrefix);
          }
        } else if (prop.enum && prop.enum.length > 0) {
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
              interfaceName,
              schemaNameMap
            );
            context.complexTypes.set(interfaceName, nestedInterface);
            context.generatedTypes.add(interfaceName);
          }
        } else if (prop.type === 'array' && prop.items) {
          // 处理数组类型
          if (prop.items['x-apifox-refs']) {
            // 数组项是 Apifox 数据模型引用
            const refs = prop.items['x-apifox-refs'];
            const refKeys = Object.keys(refs);

            if (refKeys.length > 0) {
              const ref = refs[refKeys[0]];
              if (ref && ref.$ref) {
                const refName = ref.$ref.split('/').pop();
                const decodedRefName = decodeURIComponent(refName || '');
                const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

                // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
                const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
                tsType = `${itemInterfaceName}[]`;

                // 生成数组项接口定义
                if (!context.generatedTypes.has(itemInterfaceName)) {
                  const itemInterface = generateNestedInterface(
                    definitions?.[decodedRefName],
                    definitions,
                    context,
                    itemInterfaceName,
                    schemaNameMap
                  );
                  context.complexTypes.set(itemInterfaceName, itemInterface);
                  context.generatedTypes.add(itemInterfaceName);
                }
              } else {
                const itemType = getTypeScriptType(
                  prop.items,
                  schemaNameMap,
                  context,
                  definitions,
                  typePrefix
                );
                if (itemType.startsWith('__GENERATE_TYPE__')) {
                  const interfaceName = itemType.replace('__GENERATE_TYPE__', '');
                  tsType = `${interfaceName}[]`;
                } else {
                  tsType = `${itemType}[]`;
                }
              }
            } else {
              const itemType = getTypeScriptType(
                prop.items,
                schemaNameMap,
                context,
                definitions,
                typePrefix
              );
              if (itemType.startsWith('__GENERATE_TYPE__')) {
                const interfaceName = itemType.replace('__GENERATE_TYPE__', '');
                tsType = `${interfaceName}[]`;

                // 类型定义已经在 getTypeScriptType 中通过 __GENERATE_TYPE__ 标记了
                // 但是我们需要确保它被生成，所以这里再次检查并生成
                if (!context.generatedTypes.has(interfaceName)) {
                  const schemaName = interfaceName.replace(typePrefix, '');
                  const originalSchemaName = Array.from(schemaNameMap?.entries() || []).find(
                    ([key, value]) => value === schemaName
                  )?.[0];

                  if (originalSchemaName && definitions?.[originalSchemaName]) {
                    const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
                    const itemInterface = generateNestedInterface(
                      definitions[originalSchemaName],
                      definitions,
                      context,
                      itemInterfaceName,
                      schemaNameMap
                    );
                    context.complexTypes.set(itemInterfaceName, itemInterface);
                    context.generatedTypes.add(itemInterfaceName);
                    tsType = `${itemInterfaceName}[]`;
                  }
                }
              } else {
                tsType = `${itemType}[]`;
              }
            }
          } else if (prop.items.$ref) {
            // 数组项是引用类型
            const refName = prop.items.$ref.split('/').pop();
            const decodedRefName = decodeURIComponent(refName || '');
            const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

            if (definitions?.[decodedRefName]) {
              // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
              const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
              tsType = `${itemInterfaceName}[]`;

              // 生成数组项接口定义
              if (!context.generatedTypes.has(itemInterfaceName)) {
                const itemInterface = generateNestedInterface(
                  definitions[decodedRefName],
                  definitions,
                  context,
                  itemInterfaceName,
                  schemaNameMap
                );
                context.complexTypes.set(itemInterfaceName, itemInterface);
                context.generatedTypes.add(itemInterfaceName);
              }
            } else {
              // 如果没有找到 schema 定义，使用原始名称
              tsType = `${actualRefName}[]`;
            }
          } else if (prop.items.type === 'object' && prop.items.properties) {
            // 数组中的对象，生成独立接口
            const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
            tsType = `${itemInterfaceName}[]`;

            // 生成数组项接口定义
            if (!context.generatedTypes.has(itemInterfaceName)) {
              const itemInterface = generateNestedInterface(
                prop.items,
                definitions,
                context,
                itemInterfaceName,
                schemaNameMap
              );
              context.complexTypes.set(itemInterfaceName, itemInterface);
              context.generatedTypes.add(itemInterfaceName);
            }
          } else {
            tsType = `${getTypeScriptType(prop.items, schemaNameMap, context, definitions, typePrefix)}[]`;
          }
        } else {
          tsType = getTypeScriptType(prop, schemaNameMap, context, definitions, typePrefix);

          // 处理需要生成类型定义的情况
          if (tsType.startsWith('__GENERATE_TYPE__')) {
            const interfaceName = tsType.replace('__GENERATE_TYPE__', '');
            tsType = interfaceName;

            // 检查是否已经生成过这个类型
            if (!context.generatedTypes.has(interfaceName)) {
              // 从 interfaceName 中提取原始 schema 名称
              const schemaName = interfaceName.replace(typePrefix, '');

              // 查找原始的中文schema名称
              const originalSchemaName = Array.from(schemaNameMap?.entries() || []).find(
                ([key, value]) => value === schemaName
              )?.[0];

              if (originalSchemaName && definitions?.[originalSchemaName]) {
                const nestedInterface = generateNestedInterface(
                  definitions[originalSchemaName],
                  definitions,
                  context,
                  interfaceName,
                  schemaNameMap
                );
                context.complexTypes.set(interfaceName, nestedInterface);
                context.generatedTypes.add(interfaceName);
              }
            }
          }
        }
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
 * 生成标准响应体结构
 */
function generateStandardResponseBody(
  schema: any,
  schemas: any,
  context: TypeGenerationContext,
  schemaNameMap?: Map<string, string>
): string {
  if (!schema.properties) {
    return '{}';
  }

  let result = '{';
  const required = schema.required || [];

  // 处理标准响应体的字段：code, msg, data
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const prop = propSchema as any;
    const isRequired = required.includes(propName);
    const optional = isRequired ? '' : '?';

    // 生成注释
    let comment = '';
    const fieldDesc = prop.title || prop.description || '';
    if (fieldDesc) {
      comment = `\n    /** ${fieldDesc} */`;
    }

    // 生成类型
    let tsType: string;

    if (propName === 'data') {
      // 特殊处理data字段：强制生成ResData接口
      const resDataInterfaceName = 'ResData';

      // 检查data字段是否为null类型
      if (prop.type === 'null') {
        // 只有当type明确为null时，ResData才应该是null类型
        if (!context.generatedTypes.has(resDataInterfaceName)) {
          context.complexTypes.set(
            resDataInterfaceName,
            `export type ${resDataInterfaceName} = null;`
          );
          context.generatedTypes.add(resDataInterfaceName);
        }
        tsType = resDataInterfaceName;
      } else {
        // 如果data不是null，生成正常的ResData接口
        if (!context.generatedTypes.has(resDataInterfaceName)) {
          const nestedInterface = generateNestedInterface(
            prop,
            schemas,
            context,
            resDataInterfaceName,
            schemaNameMap
          );
          context.complexTypes.set(resDataInterfaceName, nestedInterface);
          context.generatedTypes.add(resDataInterfaceName);
        }
        tsType = resDataInterfaceName;
      }
    } else {
      // 其他字段使用标准类型映射
      tsType = getTypeScriptType(prop, schemaNameMap, context, schemas, '');
    }

    result += `${comment}\n    ${propName}${optional}: ${tsType};`;
  }

  result += `\n  }`;
  return result;
}

/**
 * 生成嵌套接口
 */
function generateNestedInterface(
  schema: any,
  definitions: any,
  context: TypeGenerationContext,
  interfaceName: string,
  schemaNameMap?: Map<string, string>
): string {
  if (!schema) {
    return `export interface ${interfaceName} {}`;
  }

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    // 使用映射关系查找实际的schema名称
    const actualRefName = schemaNameMap?.get(refName || '') || refName;

    // 检查是否是标准响应体 schema，如果是则直接展开字段
    // 标准响应体通常包含 code, msg, data 字段
    if (definitions?.[refName || '']) {
      const schema = definitions[refName || ''];
      if (
        schema.properties &&
        schema.properties.code &&
        schema.properties.msg &&
        schema.properties.data
      ) {
        // 这是一个标准响应体结构，直接展开字段而不是返回空接口
        const standardBody = generateStandardResponseBody(
          schema,
          definitions,
          context,
          schemaNameMap
        );
        return `export interface ${interfaceName} ${standardBody}`;
      }
    }

    // 查找原始的中文schema名称
    const originalSchemaName = Array.from(schemaNameMap?.entries() || []).find(
      ([key, value]) => value === actualRefName
    )?.[0];

    if (originalSchemaName && definitions?.[originalSchemaName]) {
      // 递归处理引用的schema
      return generateNestedInterface(
        definitions[originalSchemaName],
        definitions,
        context,
        interfaceName,
        schemaNameMap
      );
    }
  }

  if (!schema.properties) {
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

    // 处理 Apifox 数据模型引用
    if (prop['x-apifox-refs']) {
      const refs = prop['x-apifox-refs'];
      const refKeys = Object.keys(refs);

      if (refKeys.length > 0) {
        const ref = refs[refKeys[0]];
        if (ref && ref.$ref) {
          const refName = ref.$ref.split('/').pop();
          const decodedRefName = decodeURIComponent(refName || '');
          const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

          // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
          const nestedInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}`;
          tsType = nestedInterfaceName;

          // 生成数据模型接口定义
          if (!context.generatedTypes.has(nestedInterfaceName)) {
            const nestedInterface = generateNestedInterface(
              definitions?.[decodedRefName],
              definitions,
              context,
              nestedInterfaceName,
              schemaNameMap
            );
            context.complexTypes.set(nestedInterfaceName, nestedInterface);
            context.generatedTypes.add(nestedInterfaceName);
          }
        } else {
          tsType = getTypeScriptType(prop, schemaNameMap, context, definitions, interfaceName);
        }
      } else {
        tsType = getTypeScriptType(prop, schemaNameMap, context, definitions, interfaceName);
      }
    } else if (prop.enum && prop.enum.length > 0) {
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
          nestedInterfaceName,
          schemaNameMap
        );
        context.complexTypes.set(nestedInterfaceName, nestedInterface);
        context.generatedTypes.add(nestedInterfaceName);
      }
    } else if (prop.type === 'array' && prop.items) {
      // 处理数组类型
      if (prop.items.$ref) {
        // 数组项是引用类型
        const refName = prop.items.$ref.split('/').pop();
        const decodedRefName = decodeURIComponent(refName || '');
        const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

        if (definitions?.[decodedRefName]) {
          // 为 Apifox 数据模型生成新的类型名称
          const itemInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
          tsType = `${itemInterfaceName}[]`;

          // 生成数组项接口定义
          if (!context.generatedTypes.has(itemInterfaceName)) {
            const itemInterface = generateNestedInterface(
              definitions[decodedRefName],
              definitions,
              context,
              itemInterfaceName,
              schemaNameMap
            );
            context.complexTypes.set(itemInterfaceName, itemInterface);
            context.generatedTypes.add(itemInterfaceName);
          }
        } else {
          tsType = `${actualRefName}[]`;
        }
      } else if (prop.items.type === 'object' && prop.items.properties) {
        // 数组中的对象，生成独立接口
        const itemInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())}Item`;
        tsType = `${itemInterfaceName}[]`;

        // 生成数组项接口定义
        if (!context.generatedTypes.has(itemInterfaceName)) {
          const itemInterface = generateNestedInterface(
            prop.items,
            definitions,
            context,
            itemInterfaceName,
            schemaNameMap
          );
          context.complexTypes.set(itemInterfaceName, itemInterface);
          context.generatedTypes.add(itemInterfaceName);
        }
      } else {
        tsType = `${getTypeScriptType(prop.items, schemaNameMap, context, definitions, interfaceName)}[]`;
      }
    } else {
      tsType = getTypeScriptType(prop, schemaNameMap, context, definitions, interfaceName);

      // 处理需要生成类型定义的情况
      if (tsType.startsWith('__GENERATE_TYPE__')) {
        const typeName = tsType.replace('__GENERATE_TYPE__', '');
        tsType = typeName;

        // 查找原始的中文schema名称
        const originalSchemaName = Array.from(schemaNameMap?.entries() || []).find(
          ([key, value]) => value === typeName.replace(interfaceName, '')
        )?.[0];

        if (originalSchemaName && definitions?.[originalSchemaName]) {
          const nestedInterface = generateNestedInterface(
            definitions[originalSchemaName],
            definitions,
            context,
            typeName,
            schemaNameMap
          );
          context.complexTypes.set(typeName, nestedInterface);
          context.generatedTypes.add(typeName);
        }
      }
    }

    // 只在必要时使用引号
    const propNameFormatted = needsQuotes ? `'${propName}'` : propName;
    content += `${comment}\n    ${propNameFormatted}${optional}: ${tsType};`;
  }

  content += `\n  }`;
  return content;
}
