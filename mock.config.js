/**
 * Mock 服务器配置文件
 */

export default {
  // 工作模式：'proxy', 'mock'，访问服务器或者访问本地数据。可以在query中写入\$_mock，\$_proxy定义单个请求
  model: 'mock',
  // 是否开启https
  https: false,
  // 本地服务的端口
  port: 1000,
  // 默认代理至系统测试环境, 请配置本地host
  target: 'http://xxx.xxxx.com.cn',
  // 开始remote参数, 通过url中remote=xxx来代理多个后端地址, 需要mock直接在url中设置remote=mock即可
  remoteTarget: true,
  // 处理映射路径
  handleMapPath(req) {
    const url = req.req.url.slice(1);
    const splitUrl = url.split('/');
    const fileName = splitUrl[splitUrl.length - 1].split('?')[0];
    const relativePath = splitUrl.splice(0, splitUrl.length - 1).join('/');
    if (!fileName || !relativePath) {
      console.log('无映射路径文件名fileName值: ', fileName);
      console.log('无映射路径文件路径relativePath值: ', relativePath || '空映射路径');
      return {
        fileName: fileName || 'fileName',
        relativePath: relativePath || './'
      };
    }
    return {
      relativePath,
      fileName
    };
  }
};
