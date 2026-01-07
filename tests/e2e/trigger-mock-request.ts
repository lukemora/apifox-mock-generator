import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../../src/core/config-loader.js';
import { loadMockConfig } from '../../src/core/mock-config-loader.js';
import { loadMockRoutes } from '../../src/server/route-loader.js';
import { RouteManager } from '../../src/server/route-manager.js';
import { RouteHandler } from '../../src/server/route-handler.js';
import { TestHelpers } from './utils/test-helpers.js';

/**
 * 主函数：触发模拟接口调用（使用已启动的服务）
 */
async function triggerMockRequest() {
  try {
    console.log('📋 加载配置...');
    
    // 加载 mock 配置
    const mockConfig = await loadMockConfig();
    const routeManager = new RouteManager();

    // 加载 mock 路由（如果存在 mock 目录）
    const mockDir = join(process.cwd(), 'mock');
    if (existsSync(mockDir)) {
      console.log('📂 发现 mock 目录，加载路由...');
      const apifoxConfig = await loadConfig();
      const routes = await loadMockRoutes(apifoxConfig, mockConfig);
      routes.forEach(route => {
        const key = `${route.method.toUpperCase()} ${route.path}`;
        routeManager.setRoute(key, route);
      });
      console.log(`✅ 已加载 ${routes.length} 个路由`);
    } else {
      console.log('ℹ️  未发现 mock 目录，使用代理模式');
    }

    console.log(`📋 配置信息:`, {
      model: mockConfig.model,
      target: mockConfig.target,
      port: mockConfig.port,
    });

    // 创建模拟请求和响应
    console.log('\n📤 创建模拟请求: GET /v1/auth/captcha');
    const { mockReq, mockRes } = TestHelpers.createMockReqRes('GET', '/mng-common/api/v1/auth/captcha');

    // 处理请求
    console.log('⏳ 处理请求中...');
    const routeHandler = new RouteHandler(mockConfig, routeManager);
    const handled = await routeHandler.handleRequest(mockReq, mockRes);

    // 输出结果
    console.log('\n📥 请求处理结果:');
    console.log(`   是否已处理: ${handled}`);
    console.log(`   状态码: ${mockRes.statusCode}`);
    console.log(`   响应体:`, JSON.stringify(mockRes.body, null, 2));
    console.log(`   响应头:`, mockRes.headers);

    if (handled && mockRes.statusCode === 200) {
      console.log('\n✅ 接口调用成功！');
    } else {
      console.log('\n⚠️  接口调用可能存在问题');
    }
  } catch (error) {
    console.error('\n❌ 发生错误:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
  }
}

// 执行
triggerMockRequest().catch(console.error);

