/**
 * 扩展 Express Request 类型
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * 覆盖的目标服务器地址（用于远程代理）
       */
      __overrideTarget?: string;
    }
  }
}

export {};

