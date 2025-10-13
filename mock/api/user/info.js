//[start]/api/user/info[GET]
/**
 * @apiName 获取用户信息
 * @apiURI /api/user/info
 * @apiRequestType GET
 */
import Mock from "mockjs";
import lodash from "lodash";

export const check_GetInfo = function () {
  //ture 本地数据， false 远程服务器数据
  return false;
};

export function GetInfo(query, body, ctx) {
  const options = {
    req: { query, method: ctx.req.method },
    data: JSON.stringify(body),
  };

  let apiMethod = lodash.get(options, "req.method");
  let originQuery = options.req.query;
  let apiParams =
    apiMethod === "GET" ? originQuery : JSON.parse(options.data || "{}");

  // 获取用户信息

  if (apiMethod === "GET") {
    return new Promise((res) => {
      setTimeout(() => {
        res(
          Mock.mock({
            code: "@integer(0, 999)",
            data: {
              id: "@guid", // id号
              name: "@cname", // 名称
              test: "@pick([1, 2, 3])", // 测试名称 1:枚举1, 2:枚举2, 3:枚举3
            },
            msg: "@cword(3, 8)",
          }),
        );
      }, Math.random() * 3000);
    });
  }

  return {
    code: 1,
    msg: "请检查请求的method或者URI的query是否正确",
  };
}
//[end]/api/user/info[GET]

//[insert-flag]
