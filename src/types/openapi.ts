/**
 * OpenAPI 3.0 规范类型定义
 * 用于消除代码中的 any 类型，提供完整的类型安全
 */

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

/**
 * OpenAPI Schema 类型
 */
export type OpenAPISchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

/**
 * OpenAPI Schema 对象
 */
export interface OpenAPISchema {
  type?: OpenAPISchemaType;
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  enum?: unknown[];
  const?: unknown;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  items?: OpenAPISchema | OpenAPISchemaReference;
  additionalItems?: OpenAPISchema | OpenAPISchemaReference;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: Record<string, OpenAPISchema | OpenAPISchemaReference>;
  additionalProperties?: boolean | OpenAPISchema | OpenAPISchemaReference;
  patternProperties?: Record<string, OpenAPISchema | OpenAPISchemaReference>;
  allOf?: Array<OpenAPISchema | OpenAPISchemaReference>;
  oneOf?: Array<OpenAPISchema | OpenAPISchemaReference>;
  anyOf?: Array<OpenAPISchema | OpenAPISchemaReference>;
  not?: OpenAPISchema | OpenAPISchemaReference;
  discriminator?: OpenAPIDiscriminator;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: OpenAPIXML;
  externalDocs?: OpenAPIExternalDocumentation;
  deprecated?: boolean;
  'x-apifox-orders'?: string[];
  'x-apifox-mock'?: string;
  [key: string]: unknown; // 允许扩展属性
}

/**
 * OpenAPI Schema 引用
 */
export interface OpenAPISchemaReference {
  $ref: string;
}

/**
 * OpenAPI Discriminator
 */
export interface OpenAPIDiscriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

/**
 * OpenAPI XML 对象
 */
export interface OpenAPIXML {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

/**
 * OpenAPI External Documentation
 */
export interface OpenAPIExternalDocumentation {
  description?: string;
  url: string;
}

/**
 * OpenAPI Parameter 对象
 */
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema | OpenAPISchemaReference;
  example?: unknown;
  examples?: Record<string, OpenAPIExample | OpenAPIExampleReference>;
  content?: Record<string, OpenAPIMediaType>;
  'x-apifox-orders'?: string[];
  [key: string]: unknown; // 允许扩展属性
}

/**
 * OpenAPI Example 对象
 */
export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
  [key: string]: unknown;
}

/**
 * OpenAPI Example 引用
 */
export interface OpenAPIExampleReference {
  $ref: string;
}

/**
 * OpenAPI Media Type 对象
 */
export interface OpenAPIMediaType {
  schema?: OpenAPISchema | OpenAPISchemaReference;
  example?: unknown;
  examples?: Record<string, OpenAPIExample | OpenAPIExampleReference>;
  encoding?: Record<string, OpenAPIEncoding>;
  [key: string]: unknown;
}

/**
 * OpenAPI Encoding 对象
 */
export interface OpenAPIEncoding {
  contentType?: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIHeaderReference>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  [key: string]: unknown;
}

/**
 * OpenAPI Header 对象
 */
export interface OpenAPIHeader {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema | OpenAPISchemaReference;
  example?: unknown;
  examples?: Record<string, OpenAPIExample | OpenAPIExampleReference>;
  content?: Record<string, OpenAPIMediaType>;
  [key: string]: unknown;
}

/**
 * OpenAPI Header 引用
 */
export interface OpenAPIHeaderReference {
  $ref: string;
}

/**
 * OpenAPI Request Body 对象
 */
export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
  'x-apifox-orders'?: string[];
  [key: string]: unknown;
}

/**
 * OpenAPI Response 对象
 */
export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIHeaderReference>;
  content?: Record<string, OpenAPIMediaType>;
  links?: Record<string, OpenAPILink | OpenAPILinkReference>;
  'x-apifox-orders'?: string[];
  [key: string]: unknown;
}

/**
 * OpenAPI Link 对象
 */
export interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
  description?: string;
  server?: OpenAPIServer;
  [key: string]: unknown;
}

/**
 * OpenAPI Link 引用
 */
export interface OpenAPILinkReference {
  $ref: string;
}

/**
 * OpenAPI Server 对象
 */
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
  [key: string]: unknown;
}

/**
 * OpenAPI Server Variable
 */
export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * OpenAPI Operation 对象
 */
export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocumentation;
  operationId?: string;
  parameters?: Array<OpenAPIParameter | OpenAPIParameterReference>;
  requestBody?: OpenAPIRequestBody | OpenAPIRequestBodyReference;
  responses: OpenAPIResponses;
  callbacks?: Record<string, OpenAPICallback | OpenAPICallbackReference>;
  deprecated?: boolean;
  security?: OpenAPISecurityRequirement[];
  servers?: OpenAPIServer[];
  'x-apifox-status'?: string;
  'x-apifox-folder'?: string;
  'x-apifox-orders'?: string[];
  [key: string]: unknown; // 允许扩展属性
}

/**
 * OpenAPI Parameter 引用
 */
export interface OpenAPIParameterReference {
  $ref: string;
}

/**
 * OpenAPI Request Body 引用
 */
export interface OpenAPIRequestBodyReference {
  $ref: string;
}

/**
 * OpenAPI Responses 对象
 */
export interface OpenAPIResponses {
  default?: OpenAPIResponse | OpenAPIResponseReference;
  [statusCode: string]: OpenAPIResponse | OpenAPIResponseReference | undefined;
}

/**
 * OpenAPI Response 引用
 */
export interface OpenAPIResponseReference {
  $ref: string;
}

/**
 * OpenAPI Callback 对象
 */
export interface OpenAPICallback {
  [expression: string]: OpenAPIPathItem;
}

/**
 * OpenAPI Callback 引用
 */
export interface OpenAPICallbackReference {
  $ref: string;
}

/**
 * OpenAPI Security Requirement
 */
export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

/**
 * OpenAPI Path Item 对象
 */
export interface OpenAPIPathItem {
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  servers?: OpenAPIServer[];
  parameters?: Array<OpenAPIParameter | OpenAPIParameterReference>;
  [key: string]: unknown; // 允许扩展属性和方法
}

/**
 * OpenAPI Components 对象
 */
export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema | OpenAPISchemaReference>;
  responses?: Record<string, OpenAPIResponse | OpenAPIResponseReference>;
  parameters?: Record<string, OpenAPIParameter | OpenAPIParameterReference>;
  examples?: Record<string, OpenAPIExample | OpenAPIExampleReference>;
  requestBodies?: Record<string, OpenAPIRequestBody | OpenAPIRequestBodyReference>;
  headers?: Record<string, OpenAPIHeader | OpenAPIHeaderReference>;
  securitySchemes?: Record<string, OpenAPISecurityScheme | OpenAPISecuritySchemeReference>;
  links?: Record<string, OpenAPILink | OpenAPILinkReference>;
  callbacks?: Record<string, OpenAPICallback | OpenAPICallbackReference>;
  [key: string]: unknown;
}

/**
 * OpenAPI Security Scheme
 */
export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
  [key: string]: unknown;
}

/**
 * OpenAPI Security Scheme 引用
 */
export interface OpenAPISecuritySchemeReference {
  $ref: string;
}

/**
 * OpenAPI OAuth Flows
 */
export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
  [key: string]: unknown;
}

/**
 * OpenAPI OAuth Flow
 */
export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
  [key: string]: unknown;
}

/**
 * OpenAPI Info 对象
 */
export interface OpenAPIInfo {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
  version: string;
  [key: string]: unknown;
}

/**
 * OpenAPI Contact 对象
 */
export interface OpenAPIContact {
  name?: string;
  url?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * OpenAPI License 对象
 */
export interface OpenAPILicense {
  name: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * OpenAPI Document (完整规范)
 */
export interface OpenAPIDocument {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components?: OpenAPIComponents;
  security?: OpenAPISecurityRequirement[];
  tags?: OpenAPITag[];
  externalDocs?: OpenAPIExternalDocumentation;
  [key: string]: unknown; // 允许扩展属性
}

/**
 * OpenAPI Tag 对象
 */
export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocumentation;
  [key: string]: unknown;
}

/**
 * 类型守卫：判断是否为 Schema 引用
 */
export function isSchemaReference(
  schema: OpenAPISchema | OpenAPISchemaReference
): schema is OpenAPISchemaReference {
  return '$ref' in schema && typeof schema.$ref === 'string';
}

/**
 * 类型守卫：判断是否为 Parameter 引用
 */
export function isParameterReference(
  param: OpenAPIParameter | OpenAPIParameterReference
): param is OpenAPIParameterReference {
  return '$ref' in param && typeof param.$ref === 'string';
}

/**
 * 类型守卫：判断是否为 Response 引用
 */
export function isResponseReference(
  response: OpenAPIResponse | OpenAPIResponseReference
): response is OpenAPIResponseReference {
  return '$ref' in response && typeof response.$ref === 'string';
}

