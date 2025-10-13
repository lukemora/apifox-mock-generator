//[start]/api/auth/login[POST]
export namespace ApiAuthLogin {
  export interface Res {
    code: number;
    data: {
      /** 认证token */
      access_token: string;
      /** 刷新token */
      refresh_token: string;
    };
    msg: string;
  }

  /** 请求体 */
  export interface Req {
    /** 用户名 */
    username: string;
    /** 密码 */
    password: string;
  }

  /** 完整请求参数 */
  export interface Request {
    /** 请求体 */
    body: Req;
  }
}
//[end]/api/auth/login[POST]

//[insert-flag]
