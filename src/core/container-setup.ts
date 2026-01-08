import { Container } from './container.js';
import { SERVICE_KEYS } from './service-keys.js';
import type { IApifoxClient, IRouteManager, ILogger, IHttpClient } from '../domain/interfaces.js';
import { EndpointFilterService } from '../domain/services/endpoint-filter.service.js';
import { RouteMatcherService } from '../domain/services/route-matcher.service.js';
import { OpenAPIConverterService } from '../domain/services/openapi-converter.service.js';
import { FetchApifoxDataUseCase } from '../application/use-cases/fetch-apifox-data.use-case.js';
import { GenerateMockUseCase } from '../application/use-cases/generate-mock.use-case.js';
import { GenerateTypesUseCase } from '../application/use-cases/generate-types.use-case.js';
import { ServeMockUseCase } from '../application/use-cases/serve-mock.use-case.js';
import { ConsoleLoggerImpl } from '../infrastructure/logger/console-logger.impl.js';
import { FileSystemImpl } from '../infrastructure/file-system/file-system.impl.js';
import { AxiosHttpClientImpl } from '../infrastructure/http/axios-client.impl.js';
import { ApifoxClientImpl } from '../infrastructure/apifox/apifox-client.impl.js';
import { RouteManagerImpl } from '../infrastructure/route-manager/route-manager.impl.js';

/**
 * 设置依赖注入容器
 * 注册所有服务和用例
 * 
 * 所有服务通过接口定义，实现位于 infrastructure 层
 */
export function setupContainer(): Container {
  const container = new Container();

  // 注册基础设施实现
  container.register(
    SERVICE_KEYS.LOGGER,
    () => new ConsoleLoggerImpl(),
    true
  );

  container.register(
    SERVICE_KEYS.FILE_SYSTEM,
    () => new FileSystemImpl(),
    true
  );

  container.register(
    SERVICE_KEYS.HTTP_CLIENT,
    () => new AxiosHttpClientImpl(),
    true
  );

  container.register(
    SERVICE_KEYS.APIFOX_CLIENT,
    (c) => {
      const httpClient = c.resolve<IHttpClient>(SERVICE_KEYS.HTTP_CLIENT);
      const logger = c.resolve<ILogger>(SERVICE_KEYS.LOGGER);
      return new ApifoxClientImpl(httpClient, logger);
    },
    true
  );

  container.register(
    SERVICE_KEYS.ROUTE_MANAGER,
    () => new RouteManagerImpl(),
    true
  );

  // 注册业务服务
  container.register(
    SERVICE_KEYS.ENDPOINT_FILTER,
    (c) => {
      const logger = c.resolve<ILogger>(SERVICE_KEYS.LOGGER);
      return new EndpointFilterService(logger);
    },
    true
  );

  container.register(
    SERVICE_KEYS.ROUTE_MATCHER,
    () => new RouteMatcherService(),
    true
  );

  container.register(
    SERVICE_KEYS.OPENAPI_CONVERTER,
    () => new OpenAPIConverterService(),
    true
  );

  // 注册用例
  container.register(
    SERVICE_KEYS.FETCH_APIFOX_DATA_USE_CASE,
    (c) => {
      const apifoxClient = c.resolve<IApifoxClient>(SERVICE_KEYS.APIFOX_CLIENT);
      const logger = c.resolve<ILogger>(SERVICE_KEYS.LOGGER);
      return new FetchApifoxDataUseCase(apifoxClient, logger);
    }
  );

  container.register(
    SERVICE_KEYS.GENERATE_MOCK_USE_CASE,
    (c) => {
      const endpointFilter = c.resolve<EndpointFilterService>(
        SERVICE_KEYS.ENDPOINT_FILTER
      );
      const openapiConverter = c.resolve<OpenAPIConverterService>(
        SERVICE_KEYS.OPENAPI_CONVERTER
      );
      const logger = c.resolve<ILogger>(SERVICE_KEYS.LOGGER);
      return new GenerateMockUseCase(endpointFilter, openapiConverter, logger);
    }
  );

  container.register(
    SERVICE_KEYS.GENERATE_TYPES_USE_CASE,
    (c) => {
      const endpointFilter = c.resolve<EndpointFilterService>(
        SERVICE_KEYS.ENDPOINT_FILTER
      );
      const openapiConverter = c.resolve<OpenAPIConverterService>(
        SERVICE_KEYS.OPENAPI_CONVERTER
      );
      const logger = c.resolve<ILogger>(SERVICE_KEYS.LOGGER);
      return new GenerateTypesUseCase(endpointFilter, openapiConverter, logger);
    }
  );

  container.register(
    SERVICE_KEYS.SERVE_MOCK_USE_CASE,
    (c) => {
      const logger = c.resolve<ILogger>(SERVICE_KEYS.LOGGER);
      return new ServeMockUseCase(logger);
    }
  );

  return container;
}

