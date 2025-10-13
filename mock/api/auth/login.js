//[start]/api/auth/login[POST]
/**
 * @apiName 登录
 * @apiURI /api/auth/login
 * @apiRequestType POST
 */
import Mock from "mockjs";
import lodash from "lodash";

export const check_PostLogin = function () {
  //ture 本地数据， false 远程服务器数据
  return false;
};

export function PostLogin(query, body, ctx) {
  const options = {
    req: { query, method: ctx.req.method },
    data: JSON.stringify(body),
  };

  let apiMethod = lodash.get(options, "req.method");
  let originQuery = options.req.query;
  let apiParams =
    apiMethod === "GET" ? originQuery : JSON.parse(options.data || "{}");

  // 登录

  if (apiMethod === "POST") {
    let mockParams = [
      {
        paramKey: "username",
        paramType: "isString",
        paramIsRequired: true,
      },
      {
        paramKey: "password",
        paramType: "isString",
        paramIsRequired: true,
      },
    ];
    for (let i = 0, len = mockParams.length; i < len; i++) {
      let param = mockParams[i];
      if (param.paramIsRequired && !apiParams.hasOwnProperty(param.paramKey)) {
        return {
          code: 1,
          msg: "缺少必要参数: " + param.paramKey,
        };
      }
      if (
        apiParams.hasOwnProperty(param.paramKey) &&
        lodash[param.paramType] &&
        !lodash[param.paramType](apiParams[param.paramKey])
      ) {
        return {
          code: 1,
          msg: "参数类型错误: " + param.paramKey,
        };
      }
    }

    return new Promise((res) => {
      setTimeout(() => {
        res(
          Mock.mock({
            code: "@float(0, 100, 2, 2)",
            data: {
              access_token: "@cword(3, 8)", // 认证token
              refresh_token: "@cword(3, 8)", // 刷新token
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
//[end]/api/auth/login[POST]

//[insert-flag]
