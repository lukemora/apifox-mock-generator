/**
 * 生成 Mock 文件架构（基础结构）
 * 包含必要的 import 语句和基础设置
 */
export function generateFileArchitecture(): string {
  return `import Mock from "mockjs";
import lodash from "lodash";

//[insert-flag]
`
}

/**
 * 检查文件是否已有基础架构
 */
export function hasFileArchitecture(content: string): boolean {
  return content.includes('import Mock from "mockjs"') && content.includes('import lodash from "lodash"')
}
