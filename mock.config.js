/**
 * Mock 服务器配置文件
 */

export default {
  // 工作模式：'proxy', 'mock'，访问服务器或者访问本地数据。可以在query中写入\$_mock，\$_proxy定义单个请求
  model: 'mock',
  // 是否开启https
  https: false,
  // 本地服务的端口
  port: 10000,
  // 默认代理至系统测试环境, 请配置本地host
  target: 'http://36.133.230.52:9101',
  // 开始remote参数, 通过url中remote=xxx来代理多个后端地址, 需要mock直接在url中设置?remote=mock即可
  remoteTarget: true,
  // 当 Apifox 生成的路径与真实请求存在统一前缀差异时（如生成的是 /v1/xxx，实际请求是 /mng-common/api/v1/xxx），
  // 在这里声明真实请求的前缀。设置 pathPrefixes 后仅注册“带前缀路径”（如 /mng-common/api/v1/...）；未设置则按生成的原始路径。
  pathPrefixes: '/mng-common/api',
  // 按接口粒度控制 Mock/Proxy（可选）
  mockRoutes: [
    // 示例：这些接口强制使用本地 Mock
    // '/auth/login',
    // 'GET /user/info'
  ],
  proxyRoutes: [
    // 示例：这些接口强制直连后端
    // 'POST /payment/pay',
    // '/config/remote'
  ]
};
