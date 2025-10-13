//[start]/api/user/info[GET]
export namespace ApiUserInfo {
  /** 测试名称 1:枚举1, 2:枚举2, 3:枚举3 */
  export type ResDataTest = 1 | 2 | 3;

  export interface Res {
    code?: number;
    data: {
      /** id号 */
      id?: string;
      /** 名称 */
      name?: string;
      /** 测试名称 1:枚举1, 2:枚举2, 3:枚举3 */
      test: ResDataTest;
    };
    msg: string;
  }
}
//[end]/api/user/info[GET]

//[insert-flag]
