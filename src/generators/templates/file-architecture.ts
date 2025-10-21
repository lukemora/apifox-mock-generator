/**
 * 生成 Mock 文件架构（基础结构）
 * 包含必要的 import 语句和基础设置
 */
export function generateFileArchitecture(): string {
  return `import Mock from 'mockjs';
import lodash from 'lodash';

// [insert-flag]
`;
}

/**
 * 检查文件是否已有基础架构
 */
export function hasFileArchitecture(content: string): boolean {
  // 检查是否包含必要的 import 语句（支持单引号和双引号）
  const hasMockImport =
    content.includes('import Mock from "mockjs"') || content.includes("import Mock from 'mockjs'");
  const hasLodashImport =
    content.includes('import lodash from "lodash"') ||
    content.includes("import lodash from 'lodash'");

  // 检查是否有 insert-flag 标记（表示文件已经初始化）
  const hasInsertFlag = content.includes('// [insert-flag]') || content.includes('//[insert-flag]');

  return hasMockImport && hasLodashImport && hasInsertFlag;
}

/**
 * 移除重复的 import 语句（通用函数）
 */
function removeDuplicateImports(content: string, importRegex: RegExp): string {
  const matches = [...content.matchAll(importRegex)];
  if (matches.length > 1) {
    // 保留第一个，移除其余的
    let firstMatch = true;
    content = content.replace(importRegex, match => {
      if (firstMatch) {
        firstMatch = false;
        return match;
      }
      return '';
    });
  }
  return content;
}

/**
 * 清理重复的 import 语句
 */
export function deduplicateImports(content: string): string {
  // 移除重复的 Mock import（支持单引号和双引号）
  const mockImportRegex = /import Mock from ["']mockjs["'];\s*\n?/g;
  content = removeDuplicateImports(content, mockImportRegex);

  // 移除重复的 lodash import（支持单引号和双引号）
  const lodashImportRegex = /import lodash from ["']lodash["'];\s*\n?/g;
  content = removeDuplicateImports(content, lodashImportRegex);

  // 清理多余的空行
  content = content.replace(/\n{3,}/g, '\n\n');

  return content;
}
