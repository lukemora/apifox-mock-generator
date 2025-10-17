import type { ApiEndpoint } from '../../types/index.js';
import { mapTypeToLodashCheck } from '../../utils/type-mapping.js';

/**
 * 生成单个接口的 Mock 内容（不包含 import 语句）
 */
export function generateMockEndpointContent(endpoint: ApiEndpoint, definitions?: any): string {
  const method = endpoint.method.toUpperCase();

  // 生成方法前缀和命名空间（用于注释标记）
  const methodPrefix =
    endpoint.method.charAt(0).toUpperCase() + endpoint.method.slice(1).toLowerCase();
  const pathSegments = endpoint.path.split('/').filter(s => s && !s.startsWith('{'));
  const resourceName =
    pathSegments[pathSegments.length - 1]
      ?.split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') || 'Api';
  const namespaceName = `${methodPrefix}${resourceName}`;

  // 生成参数校验数组
  const mockParams = generateMockParams(endpoint);

  // 生成 Mock.js 模板（用于响应数据）
  const interfaceInfo = `${endpoint.path}[${method}]`;
  const mockTemplate = generateMockTemplateForResponse(
    endpoint.responseBody,
    definitions,
    '\t\t\t\t\t',
    interfaceInfo
  );

  // 生成注释标记
  const commentTag = `${endpoint.path}[${method}]`;

  const content = `//[start]${commentTag}
/**
 * @apiName ${endpoint.name}
 * @apiURI ${endpoint.path}
 * @apiRequestType ${method}
 */
export const check_${namespaceName} = function () {
\t//true 本地数据， false 远程服务器数据
\treturn true;
};

export function ${namespaceName}(query, body, ctx) {
    const options = { req: { query, method: ctx.req.method }, data: JSON.stringify(body) }
    
    let apiMethod = lodash.get(options, 'req.method');
    let originQuery = options.req.query;
    let apiParams = apiMethod === 'GET' ? originQuery : JSON.parse(options.data || '{}');
    
    // ${endpoint.name}
    
    if (apiMethod === '${method}') {
        ${
          mockParams
            ? `
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
        `
            : ''
        }
        return new Promise(res => {
            setTimeout(() => {
                res(Mock.mock(${mockTemplate}))
            }, Math.random() * 300)
            
        })
        ;
    }
        

    return {
        "code": 1,
    "msg": '请检查请求的method或者URI的query是否正确'
  };
}
//[end]${commentTag}
`;

  return content;
}

/**
 * 生成参数校验数组
 */
function generateMockParams(endpoint: ApiEndpoint): string | null {
  const params: any[] = [];

  // 收集请求体参数
  if (endpoint.requestBody) {
    const bodyParams = extractParamsFromSchema(endpoint.requestBody);
    params.push(...bodyParams);
  }

  // 收集查询参数和路径参数
  if (endpoint.parameters && endpoint.parameters.length > 0) {
    endpoint.parameters.forEach(param => {
      params.push({
        paramKey: param.name,
        paramType: mapTypeToLodashCheck(param.type),
        paramIsRequired: param.required
      });
    });
  }

  if (params.length === 0) {
    return null;
  }

  // 格式化为多行数组
  const formattedParams = params
    .map(
      p =>
        `\n            {\n                paramKey: '${p.paramKey}',\n                paramType: '${p.paramType}',\n                paramIsRequired: ${p.paramIsRequired}\n            }`
    )
    .join(',');

  return `[${formattedParams}\n        ]`;
}

/**
 * 从 schema 提取参数配置
 */
function extractParamsFromSchema(schema: any, required: string[] = []): any[] {
  if (!schema) return [];

  const params: any[] = [];
  const requiredFields = schema.required || required;

  if (schema.type === 'object' && schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const propSchema = prop as any;
      params.push({
        paramKey: key,
        paramType: mapTypeToLodashCheck(propSchema.type),
        paramIsRequired: requiredFields.includes(key)
      });
    }
  }

  return params;
}

/**
 * 生成 Mock.js 响应模板（格式化为对象字面量）
 */
function generateMockTemplateForResponse(
  schema: any,
  definitions?: any,
  indent: string = '\t\t\t\t\t',
  interfaceInfo?: string
): string {
  if (!schema) return '{}';

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (definitions?.[refName]) {
      return generateMockTemplateForResponse(
        definitions[refName],
        definitions,
        indent,
        interfaceInfo
      );
    }
  }

  // 根据类型生成模板
  switch (schema.type) {
    case 'object':
      if (!schema.properties || Object.keys(schema.properties).length === 0) {
        return '{}';
      }

      let objContent = '{';
      const props = Object.entries(schema.properties);

      // 检查是否同时存在 code 和 msg 字段
      const hasCode = props.some(([key]) => key === 'code');
      const hasMsg = props.some(([key]) => key === 'msg');
      const needsSharedRandom = hasCode && hasMsg;

      props.forEach(([key, prop], index) => {
        const propSchema = prop as any;
        let mockValue = generateMockValueForField(key, propSchema, definitions, interfaceInfo);

        // 如果同时存在 code 和 msg 字段，使用共享的随机数
        if (needsSharedRandom) {
          if (key === 'code' && (propSchema.type === 'integer' || propSchema.type === 'number')) {
            mockValue = 'randomCode';
          } else if (key === 'msg' && propSchema.type === 'string') {
            const apiInfo = interfaceInfo;
            mockValue = `randomCode === 1 ? "接口调用失败:${apiInfo}" : "接口调用成功"`;
          }
        }

        const comma = index < props.length - 1 ? ',' : '';
        // 添加字段说明作为行内注释
        let comment = '';
        const fieldDesc = propSchema.title || propSchema.description || '';

        // 处理枚举类型，展示枚举选项
        if (propSchema['x-apifox-enum'] && Array.isArray(propSchema['x-apifox-enum'])) {
          const enumItems = propSchema['x-apifox-enum']
            .map((item: any) => `${item.value}:${item.name}`)
            .join(', ');
          if (enumItems) {
            // 如果有字段说明，格式为：// 字段说明 枚举选项
            comment = fieldDesc ? ` // ${fieldDesc} ${enumItems}` : ` // ${enumItems}`;
          } else if (fieldDesc) {
            comment = ` // ${fieldDesc}`;
          }
        } else if (fieldDesc) {
          comment = ` // ${fieldDesc}`;
        }

        // 为数组字段生成正确的 Mock.js 语法
        let fieldKey: string;
        if (propSchema.type === 'array') {
          // 对于数组类型，使用 Mock.js 的长度控制语法
          // 注意：这需要在字符串模板中工作，而不是对象字面量
          fieldKey = `"${key}|0-11"`;
        } else {
          fieldKey = `"${key}"`;
        }

        objContent += `\n${indent}${fieldKey}: ${mockValue}${comma}${comment}`;
      });
      objContent += `\n${indent.slice(0, -1)}}`; // 减少一级缩进

      // 如果同时存在 code 和 msg 字段，需要包装一个函数来生成共享的随机数
      if (needsSharedRandom) {
        const apiInfo = interfaceInfo || '接口';
        return `(() => {
        const randomCode = Math.random() < 0.05 ? 1 : 0;
        return ${objContent};
    })()`;
      }

      return objContent;

    case 'array':
      const itemTemplate = generateMockTemplateForResponse(
        schema.items,
        definitions,
        indent + '\t',
        interfaceInfo
      );
      // 为数组添加 Mock.js 的长度控制语法
      return `[${itemTemplate}]`;

    default:
      return generateMockValueForField('', schema, definitions, interfaceInfo);
  }
}

/**
 * 为单个字段生成 Mock 值（直接使用 Apifox mock 规则）
 */
function generateMockValueForField(
  fieldName: string,
  schema: any,
  definitions?: any,
  interfaceInfo?: string
): string {
  if (!schema) return 'null';

  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (definitions?.[refName]) {
      return generateMockValueForField(fieldName, definitions[refName], definitions, interfaceInfo);
    }
  }

  // 特殊处理 code 字段，生成随机 0 或 1
  if (fieldName === 'code' && (schema.type === 'integer' || schema.type === 'number')) {
    return 'Math.random() < 0.05 ? 1 : 0';
  }

  // 特殊处理 msg 字段，根据 code 值生成相应消息
  if (fieldName === 'msg' && schema.type === 'string') {
    const apiInfo = interfaceInfo || '接口';
    return `Math.random() < 0.5 ? "接口调用失败:${apiInfo}" : "接口调用成功"`;
  }

  // 使用 Apifox 的 mock 规则
  const apifoxMockValue = extractApifoxMockRule(schema);
  if (apifoxMockValue) {
    return wrapMockTemplate(apifoxMockValue);
  }

  // 如果没有 Apifox 规则，使用基本的默认值
  switch (schema.type) {
    case 'string':
      // 优先使用示例值
      if (schema.example !== undefined) {
        return `"${schema.example}"`;
      }
      // 使用枚举值
      if (schema.enum && schema.enum.length > 0) {
        const enumValues = schema.enum.map((v: any) => `"${v}"`).join(', ');
        return wrapMockTemplate(`@pick([${enumValues}])`);
      }
      return wrapMockTemplate('@cword(3, 8)');

    case 'number':
    case 'integer':
      // 优先使用示例值
      if (schema.example !== undefined) {
        return schema.example.toString();
      }
      // 使用枚举值
      if (schema.enum && schema.enum.length > 0) {
        const enumValues = schema.enum.join(', ');
        return wrapMockTemplate(`@pick([${enumValues}])`);
      }
      // 使用范围
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 100;
      if (schema.type === 'integer') {
        return wrapMockTemplate(`@integer(${min}, ${max})`);
      } else {
        return wrapMockTemplate(`@float(${min}, ${max}, 2, 2)`);
      }

    case 'boolean':
      // 优先使用示例值
      if (schema.example !== undefined) {
        return schema.example.toString();
      }
      return wrapMockTemplate('@boolean');

    case 'array':
      const itemTemplate = generateMockTemplateForResponse(schema.items, definitions);
      return `[${itemTemplate}]`;

    case 'object':
      return generateMockTemplateForResponse(schema, definitions);

    default:
      return 'null';
  }
}

/**
 * 提取 Apifox 的 mock 规则
 * Apifox 的 mock 规则存储在 x-apifox-mock 字段中
 */
function extractApifoxMockRule(schema: any): string | null {
  if (!schema) return null;

  // 检查是否有 Apifox 的 mock 规则（存储在 x-apifox-mock 字段）
  const apifoxMock = schema['x-apifox-mock'];

  if (!apifoxMock) {
    return null;
  }

  let mockRule: string | null = null;

  // x-apifox-mock 可能是字符串或对象
  if (typeof apifoxMock === 'string') {
    mockRule = apifoxMock;
  } else if (typeof apifoxMock === 'object' && apifoxMock.mock) {
    mockRule = apifoxMock.mock;
  }

  if (!mockRule) {
    return null;
  }

  // 转换 Apifox 模板语法为 Mock.js 语法
  const convertedRule = convertApifoxTemplateToMockJs(mockRule);

  return convertedRule;
}

/**
 * 转换 Apifox 模板语法为 Mock.js 语法
 * Apifox 使用 {{...}} 语法，需要转换为 Mock.js 的 @xxx 语法
 */
function convertApifoxTemplateToMockJs(template: string): string {
  // 如果已经是 Mock.js 语法（以 @ 开头），直接返回
  if (template.startsWith('@') || template.startsWith('/')) {
    return template;
  }

  // 如果是 Apifox 的模板语法 {{...}}，尝试转换
  if (template.includes('{{') && template.includes('}}')) {
    // Apifox 常见模板映射到 Mock.js
    const mappings: Record<string, string> = {
      '{{$string.uuid}}': '@guid',
      '{{$person.fullName}}': '@cname',
      "{{$person.fullName(locale='zh_CN')}}": '@cname',
      "{{$person.fullName(locale='en_US')}}": '@name',
      '{{$person.firstName}}': '@cfirst',
      '{{$person.lastName}}': '@clast',
      '{{$internet.email}}': '@email',
      '{{$internet.url}}': '@url',
      '{{$internet.ip}}': '@ip',
      '{{$phone.number}}': '/^1[3-9]\\d{9}$/',
      '{{$address.city}}': '@city',
      '{{$address.province}}': '@province',
      '{{$address.county}}': '@county',
      '{{$date.now}}': '@now',
      '{{$date.recent}}': '@datetime',
      '{{$image.image}}': '@image',
      '{{$string.sample}}': '@cword(3, 8)',
      '{{$number.int}}': '@integer(0, 100)',
      '{{$number.float}}': '@float(0, 100, 2, 2)',
      '{{$boolean}}': '@boolean'
    };

    // 尝试精确匹配
    if (mappings[template]) {
      return mappings[template];
    }

    // 尝试模糊匹配常见模式
    for (const [pattern, replacement] of Object.entries(mappings)) {
      if (template.includes(pattern.replace('{{', '').replace('}}', ''))) {
        return replacement;
      }
    }

    // 如果无法转换，返回空字符串（使用回退策略）
    return '';
  }

  return template;
}

/**
 * 包装 Mock.js 模板，确保正确的引号格式
 * Mock.js 占位符（@xxx）需要用单引号包裹
 */
function wrapMockTemplate(template: string): string {
  // 如果已经是用引号包裹的字符串，直接返回（使用单引号）
  if (template.startsWith('"') && template.endsWith('"')) {
    return "'" + template.slice(1, -1) + "'";
  }
  if (template.startsWith("'") && template.endsWith("'")) {
    return template;
  }

  // 如果是 Mock.js 占位符（以@开头）或正则表达式（以/开头），用单引号包裹
  if (template.startsWith('@') || template.startsWith('/')) {
    return `'${template}'`;
  }

  // 其他情况（数字、布尔值、函数调用等）直接返回
  return template;
}
