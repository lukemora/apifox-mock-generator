import type { ApiEndpoint } from '../../types/index.js';
import type {
  OpenAPISchema,
  OpenAPISchemaReference
} from '../../types/openapi.js';
import { getTypeScriptType, mapSchemaTypeToTS } from '../../utils/type-mapping.js';
import { isSchemaReference } from '../../types/openapi.js';

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
  schemas: Record<string, OpenAPISchema | OpenAPISchemaReference>,
  schemaNameMap?: Map<string, string>
): string {
  const context: TypeGenerationContext = {
    generatedTypes: new Set(),
    complexTypes: new Map(),
    namespaceName: generateNamespaceName(endpoint)
  };

  // 生成注释标记
  const commentTag = `${endpoint.path}[${endpoint.method}]`;

  let content = `// [start]${commentTag}
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
// [end]${commentTag}`;

  return content;
}

/**
 * 生成命名空间名称
 */
function generateNamespaceName(endpoint: ApiEndpoint): string {
  const pathSegments = endpoint.path.split('/').filter(s => s);
  const pathParams: string[] = [];
  const regularSegments: string[] = [];

  // 分离路径参数和普通段
  for (const segment of pathSegments) {
    if (segment.startsWith('{') && segment.endsWith('}')) {
      // 提取路径参数名（去掉 { } 括号）
      const paramName = segment.slice(1, -1);
      pathParams.push(paramName);
    } else {
      regularSegments.push(segment);
    }
  }

  // 使用路径的所有有意义的段来生成名称
  let namespaceName = regularSegments
    .map(segment =>
      segment
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
    )
    .join('');

  // 如果有路径参数，添加到命名空间名称中以区分同名接口
  if (pathParams.length > 0) {
    const pathParamsSuffix = pathParams
      .map(param =>
        param
          .split(/[-_]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('')
      )
      .join('And');
    namespaceName += `By${pathParamsSuffix}`;
  }

  // 添加请求方法后缀
  const methodSuffix =
    endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase();

  return `${namespaceName}${methodSuffix}`;
}

/**
 * 生成响应体类型
 */
function generateResponseTypes(
  responseBody: OpenAPISchema | OpenAPISchemaReference,
  schemas: Record<string, OpenAPISchema | OpenAPISchemaReference>,
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
      // 从 complexTypes 中移除，因为已经展开到 Res 中了，避免生成未使用的接口
      context.complexTypes.delete(responseType);
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
  schemas: Record<string, OpenAPISchema | OpenAPISchemaReference>,
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
        // 从 complexTypes 中移除，因为已经展开到 ReqData 中了，避免生成未使用的接口
        context.complexTypes.delete(requestType);
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

      // 处理参数类型，优先使用 schema 中的类型定义
      let paramType: string;
      if (param.schema) {
        // 如果有 schema 定义，使用 getTypeScriptType 处理（支持枚举）
        paramType = getTypeScriptType(param.schema, schemaNameMap, context, schemas, 'PathParams');
      } else {
        // 否则使用基础类型映射
        paramType = mapSchemaTypeToTS(param.type);
      }

      content += `${description}\n    ${param.name}${optional}: ${paramType};`;
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

      // 处理参数类型，优先使用 schema 中的类型定义
      let paramType: string;
      if (param.schema && !isSchemaReference(param.schema)) {
        const paramSchema = param.schema as OpenAPISchema;
        // 如果有枚举定义，生成独立枚举类型
        if (paramSchema.enum && paramSchema.enum.length > 0) {
          const enumTypeName = `Query${param.name.charAt(0).toUpperCase() + param.name.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}`;

          // 生成枚举类型定义
          if (!context.generatedTypes.has(enumTypeName)) {
            const enumValues = paramSchema.enum
              .map((v: unknown) => (typeof v === 'string' ? `'${v}'` : String(v)))
              .join(' | ');
            context.complexTypes.set(enumTypeName, `export type ${enumTypeName} = ${enumValues};`);
            context.generatedTypes.add(enumTypeName);
          }

          paramType = enumTypeName;
        } else {
          // 否则使用 getTypeScriptType 处理
          paramType = getTypeScriptType(param.schema, schemaNameMap, context, schemas, 'Query');
        }
      } else {
        // 否则使用基础类型映射
        paramType = mapSchemaTypeToTS(param.type);
      }

      content += `${description}\n    ${param.name}${optional}: ${paramType};`;
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
  schema: OpenAPISchema | OpenAPISchemaReference | null | undefined,
  definitions: Record<string, OpenAPISchema | OpenAPISchemaReference>,
  context: TypeGenerationContext,
  typePrefix: string,
  schemaNameMap?: Map<string, string>,
  currentSchemaName?: string // 当前 schema 的原始名称
): string {
  if (!schema) return '{}';

  // 如果没有传入 currentSchemaName，尝试从 definitions 中查找
  if (!currentSchemaName && definitions) {
    for (const [name, def] of Object.entries(definitions)) {
      if (def === schema) {
        currentSchemaName = name;
        break;
      }
    }
  }

  // 处理引用
  if (schema && isSchemaReference(schema)) {
    const refName = schema.$ref.split('/').pop();
    // 解码 URL 编码的 schema 名称
    const decodedRefName = decodeURIComponent(refName || '');
    // 使用映射关系查找实际的schema名称
    const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

    // 设置 currentSchemaName 为引用的 schema 名称
    if (!currentSchemaName && decodedRefName) {
      currentSchemaName = decodedRefName;
    }

    // 检查是否是标准响应体 schema，如果是则直接展开字段
    // 标准响应体通常包含 code, msg, data 字段
    if (definitions?.[decodedRefName] && !isSchemaReference(definitions[decodedRefName])) {
      const refSchema = definitions[decodedRefName] as OpenAPISchema;
      if (
        refSchema.properties &&
        refSchema.properties.code &&
        refSchema.properties.msg &&
        refSchema.properties.data
      ) {
        // 这是一个标准响应体结构，直接展开字段而不是返回空对象
        return generateStandardResponseBody(
          refSchema,
          definitions,
          context,
          schemaNameMap,
          decodedRefName
        );
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
          schemaNameMap,
          0,
          new Set()
        );
        context.complexTypes.set(interfaceName, nestedInterface);
        context.generatedTypes.add(interfaceName);
      }

      return interfaceName;
    }
  }

  if (schema && !isSchemaReference(schema) && schema.type === 'object' && schema.properties) {
    const objectSchema = schema as OpenAPISchema;
    if (!objectSchema.properties) {
      return '{}';
    }
    const props = Object.entries(objectSchema.properties);
    if (props.length === 0) {
      return '{}';
    }

    let result = '{';
    const required = objectSchema.required || [];

    for (const [propName, propSchema] of Object.entries(objectSchema.properties)) {
      if (isSchemaReference(propSchema)) {
        continue; // 跳过引用，应该已经处理过了
      }
      const prop = propSchema as OpenAPISchema;
      const isRequired = required.includes(propName);
      const optional = isRequired ? '' : '?';

      // 生成注释
      let comment = '';
      const fieldDesc = prop.title || prop.description || '';

      // 处理枚举类型，展示枚举选项
      if (prop['x-apifox-enum'] && Array.isArray(prop['x-apifox-enum'])) {
        const enumItems = (prop['x-apifox-enum'] as Array<{ value: unknown; name: string }>)
          .map((item) => `${String(item.value)}:${item.name}`)
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
      const propNameCamel = propName.replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase());
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
              schemaNameMap,
              0,
              new Set()
            );
            context.complexTypes.set(resDataInterfaceName, nestedInterface);
            context.generatedTypes.add(resDataInterfaceName);
          }
          tsType = resDataInterfaceName;
        }
      } else {
        // 处理 Apifox 数据模型引用
        const apifoxRefs = (prop as Record<string, unknown>)['x-apifox-refs'];
        if (apifoxRefs && typeof apifoxRefs === 'object' && !Array.isArray(apifoxRefs)) {
          const refs = apifoxRefs as Record<string, { $ref?: string }>;
          const refKeys = Object.keys(refs);

          if (refKeys.length > 0) {
            const ref = refs[refKeys[0]];
            if (ref && ref.$ref) {
              const refName = ref.$ref.split('/').pop();
              const decodedRefName = decodeURIComponent(refName || '');
              const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

              // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
              const interfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}`;
              tsType = interfaceName;

              // 生成数据模型接口定义
              if (!context.generatedTypes.has(interfaceName)) {
                const nestedInterface = generateNestedInterface(
                  definitions?.[decodedRefName],
                  definitions,
                  context,
                  interfaceName,
                  schemaNameMap,
                  0,
                  new Set()
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
          const enumTypeName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}`;
          tsType = enumTypeName;

          // 生成枚举类型定义
          if (!context.generatedTypes.has(enumTypeName)) {
            const enumValues = prop.enum
              .map((v: unknown) => (typeof v === 'string' ? `'${v}'` : String(v)))
              .join(' | ');
            context.complexTypes.set(enumTypeName, `export type ${enumTypeName} = ${enumValues};`);
            context.generatedTypes.add(enumTypeName);
          }
        } else if (prop.type === 'object' && prop.properties) {
          // 嵌套对象，生成独立接口
          const interfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}`;
          tsType = interfaceName;

          // 生成嵌套接口定义
          if (!context.generatedTypes.has(interfaceName)) {
            const nestedInterface = generateNestedInterface(
              prop,
              definitions,
              context,
              interfaceName,
              schemaNameMap,
              0,
              new Set()
            );
            context.complexTypes.set(interfaceName, nestedInterface);
            context.generatedTypes.add(interfaceName);
          }
        } else if (prop.type === 'array' && prop.items) {
          // 处理数组类型
          const itemsApifoxRefs = (prop.items as Record<string, unknown>)['x-apifox-refs'];
          if (itemsApifoxRefs && typeof itemsApifoxRefs === 'object' && !Array.isArray(itemsApifoxRefs)) {
            // 数组项是 Apifox 数据模型引用
            const refs = itemsApifoxRefs as Record<string, { $ref?: string }>;
            const refKeys = Object.keys(refs);

            if (refKeys.length > 0) {
              const ref = refs[refKeys[0]];
              if (ref && ref.$ref) {
                const refName = ref.$ref.split('/').pop();
                const decodedRefName = decodeURIComponent(refName || '');
                const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

                // 对于 children 字段，直接使用父类型引用，避免生成嵌套类型
                if (propName === 'children') {
                  const parentInterfaceName = `${typePrefix}${actualRefName}`;
                  tsType = `${parentInterfaceName}[]`;
                  console.log(
                    `[Type Generator] x-apifox-refs children字段直接使用父类型: ${parentInterfaceName}[]`
                  );
                } else {
                  // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
                  const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}Item`;
                  tsType = `${itemInterfaceName}[]`;

                  // 生成数组项接口定义
                  if (!context.generatedTypes.has(itemInterfaceName)) {
                    const itemInterface = generateNestedInterface(
                      definitions?.[decodedRefName],
                      definitions,
                      context,
                      itemInterfaceName,
                      schemaNameMap,
                      0,
                      new Set(),
                      decodedRefName // 传递引用的 schema 名称
                    );
                    context.complexTypes.set(itemInterfaceName, itemInterface);
                    context.generatedTypes.add(itemInterfaceName);
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
                    const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}Item`;
                    const itemInterface = generateNestedInterface(
                      definitions[originalSchemaName],
                      definitions,
                      context,
                      itemInterfaceName,
                      schemaNameMap,
                      0,
                      new Set()
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
          } else if (isSchemaReference(prop.items)) {
            // 数组项是引用类型
            const refName = prop.items.$ref.split('/').pop();
            const decodedRefName = decodeURIComponent(refName || '');
            const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

            if (definitions?.[decodedRefName]) {
              // 对于 children 字段，直接使用父类型引用，避免生成嵌套类型
              if (propName === 'children') {
                const parentInterfaceName = `${typePrefix}${actualRefName}`;
                tsType = `${parentInterfaceName}[]`;
                console.log(
                  `[Type Generator] generateInterfaceBody children字段直接使用父类型: ${parentInterfaceName}[]`
                );
              }
              // 检测其他自引用情况
              else {
                const isSelfReference = currentSchemaName && decodedRefName === currentSchemaName;

                if (isSelfReference) {
                  // 自引用结构，直接使用父类型
                  const parentInterfaceName = `${typePrefix}${actualRefName}`;
                  tsType = `${parentInterfaceName}[]`;
                  console.log(
                    `[Type Generator] generateInterfaceBody 检测到自引用字段: ${typePrefix}.${propName}，使用类型: ${parentInterfaceName}[]`
                  );
                } else {
                  // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
                  const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}Item`;
                  tsType = `${itemInterfaceName}[]`;

                  // 生成数组项接口定义
                  if (!context.generatedTypes.has(itemInterfaceName)) {
                    const itemInterface = generateNestedInterface(
                      definitions[decodedRefName],
                      definitions,
                      context,
                      itemInterfaceName,
                      schemaNameMap,
                      0,
                      new Set(),
                      decodedRefName // 传递引用的 schema 名称
                    );
                    context.complexTypes.set(itemInterfaceName, itemInterface);
                    context.generatedTypes.add(itemInterfaceName);
                  }
                }
              }
            } else {
              // 如果没有找到 schema 定义，使用原始名称
              tsType = `${actualRefName}[]`;
            }
          } else if (!isSchemaReference(prop.items) && prop.items.type === 'object' && prop.items.properties) {
            // 数组中的对象，生成独立接口
            const itemInterfaceName = `${typePrefix}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}Item`;
            tsType = `${itemInterfaceName}[]`;

            // 生成数组项接口定义
            if (!context.generatedTypes.has(itemInterfaceName)) {
              const itemInterface = generateNestedInterface(
                prop.items,
                definitions,
                context,
                itemInterfaceName,
                schemaNameMap,
                0,
                new Set()
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
                  schemaNameMap,
                  0,
                  new Set()
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
  schema: OpenAPISchema,
  schemas: Record<string, OpenAPISchema | OpenAPISchemaReference>,
  context: TypeGenerationContext,
  schemaNameMap?: Map<string, string>,
  currentSchemaName?: string // 当前 schema 的原始名称
): string {
  if (!schema.properties) {
    return '{}';
  }

  let result = '{';
  const required = schema.required || [];

  // 处理标准响应体的字段：code, msg, data
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    if (isSchemaReference(propSchema)) {
      continue; // 跳过引用，应该已经处理过了
    }
    const prop = propSchema as OpenAPISchema;
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
          // 提取 data 字段的 schema 名称
          let dataSchemaName: string | undefined;
          if (isSchemaReference(prop)) {
            const refName = prop.$ref.split('/').pop();
            dataSchemaName = decodeURIComponent(refName || '');
          } else if (prop.properties) {
            // 对于直接定义的对象，尝试从 definitions 中查找
            for (const [name, def] of Object.entries(schemas || {})) {
              if (def === prop) {
                dataSchemaName = name;
                break;
              }
            }
          }

          const nestedInterface = generateNestedInterface(
            prop,
            schemas,
            context,
            resDataInterfaceName,
            schemaNameMap,
            0,
            new Set(),
            dataSchemaName // 传递 data 字段的 schema 名称
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
  schema: OpenAPISchema | OpenAPISchemaReference | null | undefined,
  definitions: Record<string, OpenAPISchema | OpenAPISchemaReference>,
  context: TypeGenerationContext,
  interfaceName: string,
  schemaNameMap?: Map<string, string>,
  depth: number = 0,
  visitedRefs: Set<string> = new Set(),
  currentSchemaName?: string // 当前 schema 的原始名称（用于检测自引用）
): string {
  // 防止递归深度过深，最大深度设置为 3（允许更深一层的递归）
  if (depth > 3) {
    console.warn(
      `[Type Generator] 递归深度超过限制(depth: ${depth})，接口: ${interfaceName}，返回空接口`
    );
    return `export interface ${interfaceName} {}`;
  }

  if (!schema) {
    return `export interface ${interfaceName} {}`;
  }

  // 处理引用
  if (schema && isSchemaReference(schema)) {
    const refName = schema.$ref.split('/').pop();
    // 解码 URL 编码的 schema 名称
    const decodedRefName = decodeURIComponent(refName || '');

    // 检测循环引用
    if (visitedRefs.has(decodedRefName)) {
      console.warn(`[Type Generator] 检测到循环引用: ${decodedRefName}，接口: ${interfaceName}`);
      return `export interface ${interfaceName} {}`;
    }

    // 使用映射关系查找实际的schema名称
    const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

    // 检查是否是标准响应体 schema，如果是则直接展开字段
    // 标准响应体通常包含 code, msg, data 字段
    if (definitions?.[decodedRefName] && !isSchemaReference(definitions[decodedRefName])) {
      const refSchema = definitions[decodedRefName] as OpenAPISchema;
      if (
        refSchema.properties &&
        refSchema.properties.code &&
        refSchema.properties.msg &&
        refSchema.properties.data
      ) {
        // 这是一个标准响应体结构，直接展开字段而不是返回空接口
        const standardBody = generateStandardResponseBody(
          refSchema,
          definitions,
          context,
          schemaNameMap
        );
        return `export interface ${interfaceName} ${standardBody}`;
      }
    }

    // 如果在 definitions 中找到了引用的 schema，直接递归处理
    if (definitions?.[decodedRefName]) {
      // 添加到已访问集合
      const newVisitedRefs = new Set(visitedRefs);
      newVisitedRefs.add(decodedRefName);

      // 递归处理引用的schema，传递当前 schema 名称
      return generateNestedInterface(
        definitions[decodedRefName],
        definitions,
        context,
        interfaceName,
        schemaNameMap,
        depth + 1,
        newVisitedRefs,
        decodedRefName // 传递当前 schema 的原始名称
      );
    }
  }

  // 如果没有传入 currentSchemaName，尝试从 definitions 中查找
  if (!currentSchemaName && definitions) {
    for (const [name, def] of Object.entries(definitions)) {
      if (def === schema) {
        currentSchemaName = name;
        break;
      }
    }
  }

  if (!schema || isSchemaReference(schema) || !schema.properties) {
    return `export interface ${interfaceName} {}`;
  }

  const objectSchema = schema as OpenAPISchema;
  if (!objectSchema.properties) {
    return `export interface ${interfaceName} {}`;
  }
  let content = `export interface ${interfaceName} {`;
  const required = objectSchema.required || [];

  for (const [propName, propSchema] of Object.entries(objectSchema.properties)) {
    if (isSchemaReference(propSchema)) {
      continue; // 跳过引用，应该已经处理过了
    }
    const prop = propSchema as OpenAPISchema;
    const isRequired = required.includes(propName);
    const optional = isRequired ? '' : '?';

    // 生成注释
    let comment = '';
    const fieldDesc = prop.title || prop.description || '';

    const apifoxEnum = (prop as Record<string, unknown>)['x-apifox-enum'];
    if (apifoxEnum && Array.isArray(apifoxEnum)) {
      const enumItems = (apifoxEnum as Array<{ value: unknown; name: string }>)
        .map((item) => `${String(item.value)}:${item.name}`)
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
    const propNameCamel = propName.replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase());
    const needsQuotes = propName !== propNameCamel || /[^a-zA-Z0-9_$]/.test(propName);

    // 生成类型
    let tsType: string;

    // 处理 Apifox 数据模型引用
    const apifoxRefs = (prop as Record<string, unknown>)['x-apifox-refs'];
    if (apifoxRefs && typeof apifoxRefs === 'object' && !Array.isArray(apifoxRefs)) {
      const refs = apifoxRefs as Record<string, { $ref?: string }>;
      const refKeys = Object.keys(refs);

      if (refKeys.length > 0) {
        const ref = refs[refKeys[0]];
        if (ref && ref.$ref) {
          const refName = ref.$ref.split('/').pop();
          const decodedRefName = decodeURIComponent(refName || '');
          const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

          // 为 Apifox 数据模型生成新的类型名称，避免与原始 schema 名称冲突
          const nestedInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}`;
          tsType = nestedInterfaceName;

          // 生成数据模型接口定义
          if (!context.generatedTypes.has(nestedInterfaceName)) {
            const nestedInterface = generateNestedInterface(
              definitions?.[decodedRefName],
              definitions,
              context,
              nestedInterfaceName,
              schemaNameMap,
              depth + 1,
              visitedRefs
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
      const enumTypeName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}`;
      tsType = enumTypeName;

      // 生成枚举类型定义
      if (!context.generatedTypes.has(enumTypeName)) {
        const enumValues = prop.enum
          .map((v: unknown) => (typeof v === 'string' ? `'${v}'` : String(v)))
          .join(' | ');
        context.complexTypes.set(enumTypeName, `export type ${enumTypeName} = ${enumValues};`);
        context.generatedTypes.add(enumTypeName);
      }
    } else if (prop.type === 'object' && prop.properties) {
      // 嵌套对象，递归处理
      const nestedInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}`;
      tsType = nestedInterfaceName;

      // 生成嵌套接口定义
      if (!context.generatedTypes.has(nestedInterfaceName)) {
        const nestedInterface = generateNestedInterface(
          prop,
          definitions,
          context,
          nestedInterfaceName,
          schemaNameMap,
          depth + 1,
          visitedRefs
        );
        context.complexTypes.set(nestedInterfaceName, nestedInterface);
        context.generatedTypes.add(nestedInterfaceName);
      }
    } else if (prop.type === 'array' && prop.items) {
      // 处理数组类型
      const itemsApifoxRefs = (prop.items as Record<string, unknown>)['x-apifox-refs'];
      if (itemsApifoxRefs && typeof itemsApifoxRefs === 'object' && !Array.isArray(itemsApifoxRefs)) {
        // 数组项是 Apifox 数据模型引用
        const refs = itemsApifoxRefs as Record<string, { $ref?: string }>;
        const refKeys = Object.keys(refs);

        if (refKeys.length > 0) {
          const ref = refs[refKeys[0]];
          if (ref && ref.$ref) {
            const refName = ref.$ref.split('/').pop();
            const decodedRefName = decodeURIComponent(refName || '');
            const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

            if (definitions?.[decodedRefName]) {
              // 对于 children 字段，如果递归深度超过1层，直接使用父类型引用
              if (propName === 'children' && depth > 1) {
                tsType = `${interfaceName}[]`;
                console.log(
                  `[Type Generator] x-apifox-refs children字段递归深度超过1层(depth: ${depth})，使用父类型: ${interfaceName}[]`
                );
              }
              // 检测自引用
              else {
                const refSchema = definitions[decodedRefName];
                const isSelfReference =
                  visitedRefs.has(decodedRefName) ||
                  (propName === 'children' &&
                    currentSchemaName &&
                    decodedRefName === currentSchemaName) ||
                  (propName === 'children' && refSchema === schema);

                if (isSelfReference) {
                  // 自引用结构（如树形结构的 children），直接使用父类型
                  tsType = `${interfaceName}[]`;
                  console.log(
                    `[Type Generator] 检测到 x-apifox-refs 自引用字段: ${interfaceName}.${propName} (schemaName: ${currentSchemaName}, refName: ${decodedRefName})，使用自身类型`
                  );
                } else {
                  // 为 Apifox 数据模型生成新的类型名称
                  const itemInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}Item`;
                  tsType = `${itemInterfaceName}[]`;

                  // 生成数组项接口定义
                  if (!context.generatedTypes.has(itemInterfaceName)) {
                    const itemInterface = generateNestedInterface(
                      definitions[decodedRefName],
                      definitions,
                      context,
                      itemInterfaceName,
                      schemaNameMap,
                      depth + 1,
                      visitedRefs,
                      decodedRefName // 传递引用的 schema 名称
                    );
                    context.complexTypes.set(itemInterfaceName, itemInterface);
                    context.generatedTypes.add(itemInterfaceName);
                  }
                }
              }
            } else {
              tsType = `${actualRefName}[]`;
            }
          } else {
            tsType =
              getTypeScriptType(prop.items, schemaNameMap, context, definitions, interfaceName) +
              '[]';
          }
        } else {
          tsType = 'unknown[]';
        }
      } else if (isSchemaReference(prop.items)) {
        // 数组项是引用类型
        const refName = prop.items.$ref.split('/').pop();
        const decodedRefName = decodeURIComponent(refName || '');
        const actualRefName = schemaNameMap?.get(decodedRefName) || decodedRefName;

        if (definitions?.[decodedRefName]) {
          // 对于 children 字段，如果递归深度超过1层，直接使用父类型引用
          if (propName === 'children' && depth > 1) {
            tsType = `${interfaceName}[]`;
            console.log(
              `[Type Generator] children字段递归深度超过1层(depth: ${depth})，使用父类型: ${interfaceName}[]`
            );
          }
          // 检测自引用：
          // 1. 字段名是 children 且引用的 schema 名称与当前 schema 名称相同
          // 2. 或者 visitedRefs 中已经有这个引用（说明正在递归生成中）
          else {
            const refSchema = definitions[decodedRefName];
            const isSelfReference =
              visitedRefs.has(decodedRefName) ||
              (propName === 'children' &&
                currentSchemaName &&
                decodedRefName === currentSchemaName) ||
              (propName === 'children' && refSchema === schema);

            if (isSelfReference) {
              // 自引用结构（如树形结构的 children），直接使用父类型
              tsType = `${interfaceName}[]`;
              console.log(
                `[Type Generator] 检测到引用自引用字段: ${interfaceName}.${propName} (schemaName: ${currentSchemaName}, refName: ${decodedRefName})，使用自身类型`
              );
            } else {
              // 为 Apifox 数据模型生成新的类型名称
              const itemInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}Item`;
              tsType = `${itemInterfaceName}[]`;

              // 生成数组项接口定义
              if (!context.generatedTypes.has(itemInterfaceName)) {
                const itemInterface = generateNestedInterface(
                  definitions[decodedRefName],
                  definitions,
                  context,
                  itemInterfaceName,
                  schemaNameMap,
                  depth + 1,
                  visitedRefs,
                  decodedRefName // 传递引用的 schema 名称
                );
                context.complexTypes.set(itemInterfaceName, itemInterface);
                context.generatedTypes.add(itemInterfaceName);
              }
            }
          }
        } else {
          tsType = `${actualRefName}[]`;
        }
      } else if (!isSchemaReference(prop.items) && prop.items.type === 'object' && prop.items.properties) {
        // 数组中的对象，检查是否是自引用
        if (propName === 'children' && prop.items === objectSchema) {
          // 自引用：children 引用自身
          tsType = `${interfaceName}[]`;
          console.log(
            `[Type Generator] 检测到对象自引用字段: ${interfaceName}.${propName}，使用自身类型`
          );
        } else {
          // 生成独立接口
          const itemInterfaceName = `${interfaceName}${propName.charAt(0).toUpperCase() + propName.slice(1).replace(/_([a-z])/g, (_: unknown, c: string) => c.toUpperCase())}Item`;
          tsType = `${itemInterfaceName}[]`;

          // 生成数组项接口定义
          if (!context.generatedTypes.has(itemInterfaceName)) {
            const itemInterface = generateNestedInterface(
              prop.items,
              definitions,
              context,
              itemInterfaceName,
              schemaNameMap,
              depth + 1,
              visitedRefs,
              undefined // 对于非引用的对象，不传递 schema 名称
            );
            context.complexTypes.set(itemInterfaceName, itemInterface);
            context.generatedTypes.add(itemInterfaceName);
          }
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
            schemaNameMap,
            depth + 1,
            visitedRefs
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
