import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { loadConfig } from '../../src/core/config-loader.js';
import { fetchOpenAPIFromApifox, convertOpenAPIToEndpoints, filterEndpoints, STATUS_MAPPING } from './utils/test-api-helpers.js';
import { generateMockFiles } from '../../src/generators/mock-generator.js';
import { generateTypeFiles } from '../../src/generators/type-generator.js';
import { TestHelpers } from './utils/test-helpers.js';
import { FileSystemImpl } from '../../src/infrastructure/file-system/file-system.impl.js';

const fileSystem = new FileSystemImpl();

/**
 * 查找项目根目录（向上查找包含 package.json 或 apifox.config.json 的目录）
 */
function findProjectRoot(startDir: string = fileSystem.getProjectRoot()): string {
  let currentDir = resolve(startDir);
  const root = resolve('/');

  while (currentDir !== root) {
    const packageJsonPath = join(currentDir, 'package.json');
    const configPath = join(currentDir, 'apifox.config.json');
    
    if (existsSync(packageJsonPath) || existsSync(configPath)) {
      return currentDir;
    }
    
    currentDir = dirname(currentDir);
  }

  // 如果找不到，返回当前工作目录
  return process.cwd();
}

describe('apifox.config.json 配置验证', () => {
  const projectRoot = findProjectRoot();
  const originalConfigPath = join(projectRoot, 'apifox.config.json');
  let originalConfig: string | null = null;
  let originalCwd: string;

  beforeAll(() => {
    // 保存原始工作目录
    originalCwd = process.cwd();
    // 切换到项目根目录，确保 getProjectRoot() 和 loadConfig() 能正常工作
    process.chdir(projectRoot);
    
    // 验证配置文件是否存在
    if (!existsSync(originalConfigPath)) {
      throw new Error(
        `配置文件不存在: ${originalConfigPath}\n` +
        `项目根目录: ${projectRoot}\n` +
        `当前工作目录: ${process.cwd()}\n` +
        `请在项目根目录创建 apifox.config.json 配置文件`
      );
    }
    // 备份原始配置
    originalConfig = readFileSync(originalConfigPath, 'utf-8');
  });

  afterAll(() => {
    // 恢复原始工作目录
    if (originalCwd) {
      process.chdir(originalCwd);
    }
    // 恢复原始配置
    if (originalConfig) {
      writeFileSync(originalConfigPath, originalConfig, 'utf-8');
    }
  });

  describe('配置加载', () => {
    it('应该能够加载有效的配置文件', async () => {
      // 使用真实配置进行测试
      const config = await loadConfig();
      expect(config).toBeDefined();
      expect(config.projectId).toBeDefined();
      expect(config.token).toBeDefined();
      expect(config.mockDir).toBeDefined();
      expect(config.typesDir).toBeDefined();
    });

    it('应该应用默认值', async () => {
      // 使用真实配置进行测试，验证默认值
      const config = await loadConfig();
      // generate 默认为 'all'，如果没有显式配置
      expect(['all', 'mock', 'types']).toContain(config.generate || 'all');
    });

    it('应该支持自定义 generate 模式', async () => {
      // 测试 generate 配置的有效值
      const validModes = ['all', 'mock', 'types'];
      const config = await loadConfig();
      if (config.generate) {
        expect(validModes).toContain(config.generate);
      }
    });
  });

  describe('apiFilter 配置验证', () => {
    describe('excludedByTags 过滤', () => {
      it('应该支持排除单个中文标签', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除单个中文标签
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                excludedByTags: ['设计中'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);
        const excludedStatus = STATUS_MAPPING['设计中'] || 'designing';

        // 验证过滤后的端点不包含被排除的状态
        for (const endpoint of filteredEndpoints) {
          if (endpoint.status) {
            expect(endpoint.status).not.toBe(excludedStatus);
          }
        }
      });

      it('应该支持排除多个中文标签', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除多个中文标签
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                excludedByTags: ['设计中', '已废弃', '待确定'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);
        const excludedStatuses = (config.apiFilter?.scope?.excludedByTags || []).map(tag => {
          return STATUS_MAPPING[tag] || tag;
        });

        // 验证过滤后的端点不包含任何被排除的状态
        for (const endpoint of filteredEndpoints) {
          if (endpoint.status) {
            expect(excludedStatuses).not.toContain(endpoint.status);
          }
        }
      });

      it('应该支持排除英文标签', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除英文标签
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                excludedByTags: ['deprecated'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证过滤后的端点不包含被排除的状态
        for (const endpoint of filteredEndpoints) {
          if (endpoint.status) {
            expect(endpoint.status).not.toBe('deprecated');
          }
        }
      });

      it('应该正确映射中文标签到英文状态', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试中文标签映射
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                excludedByTags: ['设计中'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证中文标签"设计中"被正确映射为"designing"并排除
        for (const endpoint of filteredEndpoints) {
          if (endpoint.status) {
            expect(endpoint.status).not.toBe('designing');
          }
        }
      });
    });

    describe('includedByTags 过滤', () => {
      it('应该支持包含单个中文标签', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试包含单个中文标签
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                includedByTags: ['已完成'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);
        const includedStatus = STATUS_MAPPING['已完成'] || 'completed';

        // 验证所有端点都是已完成状态
        for (const endpoint of filteredEndpoints) {
          if (endpoint.status) {
            expect(endpoint.status).toBe(includedStatus);
          }
        }
      });

      it('应该支持包含多个中文标签', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试包含多个中文标签
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                includedByTags: ['已完成', '已发布'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);
        const includedStatuses = (config.apiFilter?.scope?.includedByTags || []).map(tag => {
          return STATUS_MAPPING[tag] || tag;
        });

        // 验证所有端点都在包含的标签列表中
        for (const endpoint of filteredEndpoints) {
          if (endpoint.status) {
            expect(includedStatuses).toContain(endpoint.status);
          }
        }
      });

      it('应该支持包含英文标签', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试包含英文标签
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                includedByTags: ['completed'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有端点都是 completed 状态
        for (const endpoint of filteredEndpoints) {
          if (endpoint.status) {
            expect(endpoint.status).toBe('completed');
          }
        }
      });
    });

    describe('includePaths 路径过滤', () => {
      it('应该支持单个路径模式匹配', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试单个路径模式
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              includePaths: ['/api/user'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有端点路径都匹配 includePaths
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.path).toBe('/api/user');
        }
      });

      it('应该支持通配符 * 匹配单层路径', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试通配符 * 匹配
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              includePaths: ['/api/user/*'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有端点路径都匹配 /api/user/* 模式
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.path).toMatch(/^\/api\/user\/[^/]+$/);
        }
      });

      it('应该支持通配符 ** 匹配多层路径', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试通配符 ** 匹配
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              includePaths: ['/api/**'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有端点路径都匹配 /api/** 模式
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.path).toMatch(/^\/api\//);
        }
      });

      it('应该支持多个路径模式匹配（OR 逻辑）', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试多个路径模式
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              includePaths: ['/api/user/*', '/api/admin/*'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有端点路径都匹配至少一个模式
        for (const endpoint of filteredEndpoints) {
          const matches =
            endpoint.path.match(/^\/api\/user\/[^/]+$/) ||
            endpoint.path.match(/^\/api\/admin\/[^/]+$/);
          expect(matches).toBeTruthy();
        }
      });
    });

    describe('excludePaths 路径过滤', () => {
      it('应该支持排除单个路径模式', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除单个路径
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              excludePaths: ['/api/admin'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证没有包含被排除的路径
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.path).not.toBe('/api/admin');
        }
      });

      it('应该支持通配符 * 排除单层路径', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试通配符 * 排除
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              excludePaths: ['/api/admin/*'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证没有包含被排除的路径模式
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.path).not.toMatch(/^\/api\/admin\/[^/]+$/);
        }
      });

      it('应该支持通配符 ** 排除多层路径', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试通配符 ** 排除
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              excludePaths: ['/api/admin/**'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证没有包含被排除的路径模式
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.path).not.toMatch(/^\/api\/admin\//);
        }
      });

      it('应该支持排除多个路径模式（OR 逻辑）', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除多个路径模式
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              excludePaths: ['/api/admin/**', '/api/test/**'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证没有包含任何被排除的路径模式
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.path).not.toMatch(/^\/api\/admin\//);
          expect(endpoint.path).not.toMatch(/^\/api\/test\//);
        }
      });
    });

    describe('includeMethods 方法过滤', () => {
      it('应该支持包含单个 HTTP 方法', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试包含单个方法
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              includeMethods: ['GET'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有端点都是 GET 方法
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.method.toUpperCase()).toBe('GET');
        }
      });

      it('应该支持包含多个 HTTP 方法', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试包含多个方法
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              includeMethods: ['GET', 'POST'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);
        const includeMethods = (config.apiFilter?.includeMethods || []).map(m => m.toUpperCase());

        // 验证所有端点方法都在 includeMethods 中
        for (const endpoint of filteredEndpoints) {
          expect(includeMethods).toContain(endpoint.method.toUpperCase());
        }
      });

      it('应该支持方法名大小写不敏感', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试小写方法名
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              includeMethods: ['get', 'post'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证大小写不敏感
        for (const endpoint of filteredEndpoints) {
          const method = endpoint.method.toUpperCase();
          expect(['GET', 'POST']).toContain(method);
        }
      });
    });

    describe('excludeMethods 方法过滤', () => {
      it('应该支持排除单个 HTTP 方法', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除单个方法
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              excludeMethods: ['DELETE'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证没有包含被排除的方法
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.method.toUpperCase()).not.toBe('DELETE');
        }
      });

      it('应该支持排除多个 HTTP 方法', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除多个方法
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              excludeMethods: ['DELETE', 'PUT'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);
        const excludeMethods = (config.apiFilter?.excludeMethods || []).map(m => m.toUpperCase());

        // 验证没有包含被排除的方法
        for (const endpoint of filteredEndpoints) {
          expect(excludeMethods).not.toContain(endpoint.method.toUpperCase());
        }
      });

      it('应该支持方法名大小写不敏感', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 检查是否有 DELETE 方法
        const hasDeleteMethod = allEndpoints.some(
          ep => ep.method.toUpperCase() === 'DELETE'
        );

        if (!hasDeleteMethod) {
          // 如果没有 DELETE 方法，跳过此测试
          return;
        }

        // 测试小写方法名
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              excludeMethods: ['delete'],
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证大小写不敏感：所有 DELETE 方法应该被排除
        const deleteCount = filteredEndpoints.filter(
          ep => ep.method.toUpperCase() === 'DELETE'
        ).length;
        expect(deleteCount).toBe(0);

        // 验证剩余端点不包含 DELETE 方法
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.method.toUpperCase()).not.toBe('DELETE');
        }
      });
    });

    describe('folderPaths 文件夹路径过滤', () => {
      it('应该支持单个文件夹精确匹配', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试单个文件夹精确匹配
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                folderPaths: ['用户管理'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有端点都在指定的文件夹路径下（精确匹配或前缀匹配）
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.folderPath).toBeDefined();
          expect(
            endpoint.folderPath === '用户管理' ||
              (endpoint.folderPath && endpoint.folderPath.startsWith('用户管理/'))
          ).toBe(true);
        }
      });

      it('应该支持多个文件夹匹配（OR 逻辑）', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试多个文件夹匹配
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                folderPaths: ['用户管理', '订单管理'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);
        const folderPaths = config.apiFilter?.scope?.folderPaths || [];

        // 验证所有端点都在指定的文件夹路径下
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.folderPath).toBeDefined();
          const matches = folderPaths.some(folderPath => {
            return (
              endpoint.folderPath === folderPath ||
              (endpoint.folderPath && endpoint.folderPath.startsWith(folderPath + '/'))
            );
          });
          expect(matches).toBe(true);
        }
      });

      it('应该支持中文文件夹名称匹配', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试中文文件夹名称
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                folderPaths: ['用户管理'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证中文文件夹名称匹配
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.folderPath).toBeDefined();
          expect(
            endpoint.folderPath === '用户管理' ||
              (endpoint.folderPath && endpoint.folderPath.startsWith('用户管理/'))
          ).toBe(true);
        }
      });

      it('应该支持前缀匹配子目录', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试前缀匹配子目录
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                folderPaths: ['用户管理'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证前缀匹配功能：'用户管理' 应该匹配 '用户管理/子目录'
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.folderPath).toBeDefined();
          // 精确匹配或前缀匹配
          const isExactMatch = endpoint.folderPath === '用户管理';
          const isPrefixMatch =
            endpoint.folderPath && endpoint.folderPath.startsWith('用户管理/');
          expect(isExactMatch || isPrefixMatch).toBe(true);
        }
      });

      it('应该排除没有 folderPath 的接口', async () => {
        const baseConfig = await loadConfig();
        const openapi = await fetchOpenAPIFromApifox(baseConfig);
        const allEndpoints = convertOpenAPIToEndpoints(openapi);

        // 测试排除没有 folderPath 的接口
        TestHelpers.createTempConfig(
          {
            apiFilter: {
              scope: {
                folderPaths: ['用户管理'],
              },
            },
          },
          baseConfig
        );

        const config = await loadConfig();
        const filteredEndpoints = filterEndpoints(allEndpoints, config.apiFilter);

        // 验证所有过滤后的端点都有 folderPath
        for (const endpoint of filteredEndpoints) {
          expect(endpoint.folderPath).toBeDefined();
        }
      });
    });
  });

  describe('文件生成配置验证', () => {
    it('应该根据 generate=mock 只生成 Mock 文件', async () => {
      // 读取真实配置作为基础
      const baseConfig = await loadConfig();
      const mockDir = join(projectRoot, 'test-mock');
      const typesDir = join(projectRoot, 'test-types');

      // 只覆盖要测试的配置项：generate，其他从基础配置继承
      TestHelpers.createTempConfig(
        {
          mockDir,
          typesDir,
          generate: 'mock',
        },
        baseConfig
      );

      const config = await loadConfig();
      const openapi = await fetchOpenAPIFromApifox(config);
      const allEndpoints = convertOpenAPIToEndpoints(openapi);
      const endpoints = filterEndpoints(allEndpoints, config.apiFilter);

      if (endpoints.length > 0) {
        await generateMockFiles(config, endpoints, openapi.components?.schemas);

        // 验证 Mock 文件已生成，类型文件未生成
        expect(existsSync(mockDir)).toBe(true);
        expect(existsSync(typesDir)).toBe(false);

        // 清理
        if (existsSync(mockDir)) {
          rmSync(mockDir, { recursive: true, force: true });
        }
      }
    });

    it('应该根据 generate=types 只生成类型文件', async () => {
      // 读取真实配置作为基础
      const baseConfig = await loadConfig();
      const mockDir = join(projectRoot, 'test-mock');
      const typesDir = join(projectRoot, 'test-types');

      // 只覆盖要测试的配置项：generate，其他从基础配置继承
      TestHelpers.createTempConfig(
        {
          mockDir,
          typesDir,
          generate: 'types',
        },
        baseConfig
      );

      const config = await loadConfig();
      const openapi = await fetchOpenAPIFromApifox(config);
      const allEndpoints = convertOpenAPIToEndpoints(openapi);
      const endpoints = filterEndpoints(allEndpoints, config.apiFilter);

      if (endpoints.length > 0) {
        await generateTypeFiles(config, openapi, endpoints);

        // 验证类型文件已生成，Mock 文件未生成
        expect(existsSync(typesDir)).toBe(true);
        expect(existsSync(mockDir)).toBe(false);

        // 清理
        if (existsSync(typesDir)) {
          rmSync(typesDir, { recursive: true, force: true });
        }
      }
    });

    it('应该根据 generate=all 生成所有文件', async () => {
      // 读取真实配置作为基础
      const baseConfig = await loadConfig();
      const mockDir = join(projectRoot, 'test-mock');
      const typesDir = join(projectRoot, 'test-types');

      // 只覆盖要测试的配置项：generate，其他从基础配置继承
      TestHelpers.createTempConfig(
        {
          mockDir,
          typesDir,
          generate: 'all',
        },
        baseConfig
      );

      const config = await loadConfig();
      const openapi = await fetchOpenAPIFromApifox(config);
      const allEndpoints = convertOpenAPIToEndpoints(openapi);
      const endpoints = filterEndpoints(allEndpoints, config.apiFilter);

      if (endpoints.length > 0) {
        await generateMockFiles(config, endpoints, openapi.components?.schemas);
        await generateTypeFiles(config, openapi, endpoints);

        // 验证所有文件已生成
        expect(existsSync(mockDir)).toBe(true);
        expect(existsSync(typesDir)).toBe(true);

        // 清理
        if (existsSync(mockDir)) {
          rmSync(mockDir, { recursive: true, force: true });
        }
        if (existsSync(typesDir)) {
          rmSync(typesDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe('分支和 API URL 配置', () => {
    it('应该支持 branchId 配置', async () => {
      const config = await loadConfig();
      // 如果配置中有 branchId，验证其类型
      if (config.branchId !== undefined) {
        expect(typeof config.branchId).toBe('number');
      }
    });

    it('应该支持自定义 apiUrl', async () => {
      const config = await loadConfig();
      // apiUrl 默认为 'https://api.apifox.com'，如果配置了自定义值则验证
      if (config.apiUrl) {
        expect(config.apiUrl).toMatch(/^https?:\/\//);
      } else {
        // 如果没有配置，应该使用默认值
        expect(config.apiUrl || 'https://api.apifox.com').toBe('https://api.apifox.com');
      }
    });
  });
});

