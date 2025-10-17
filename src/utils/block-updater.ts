import path from 'path';
import fs from 'fs/promises';
import { ensureDir, exists, readFile } from './file-operations.js';
import { formatCode } from './code-formatter.js';
import { deduplicateImports } from '../generators/templates/file-architecture.js';

/**
 * 增量更新文件内容
 * 用于支持在同一文件中管理多个接口定义
 */
export async function updateFileWithBlock(
  filePath: string,
  content: string,
  blockIdentifier: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  // 如果文件不存在，直接创建并添加 insert-flag
  if (!(await exists(filePath))) {
    const contentWithFlag = content + '\n\n//[insert-flag]\n';
    const formattedContent = await formatCode(contentWithFlag, filePath);
    await fs.writeFile(filePath, formattedContent, 'utf-8');
    return;
  }

  // 读取现有文件
  let existingContent = await readFile(filePath);

  // 查找插入标记
  const insertFlagPattern = /\/\/\[insert-flag\]/g;
  const insertFlagMatches = [...existingContent.matchAll(insertFlagPattern)];

  // 移除多余的 insert-flag，只保留一个
  if (insertFlagMatches.length > 1) {
    // 保留第一个，移除其余的
    for (let i = 1; i < insertFlagMatches.length; i++) {
      existingContent = existingContent.replace('//[insert-flag]', '');
    }
  }

  const insertFlagMatch = existingContent.match(/\/\/\[insert-flag\]/);

  if (!insertFlagMatch) {
    // 如果没有插入标记，在文件末尾添加内容和标记
    const updatedContent = existingContent.trim() + '\n\n' + content + '\n\n//[insert-flag]\n';
    const formattedContent = await formatCode(updatedContent, filePath);
    await fs.writeFile(filePath, formattedContent, 'utf-8');
    return;
  }

  // 提取新内容的开始和结束标记
  const startPattern = /\/\/\[start\]([^\n]+)/;
  const endPattern = /\/\/\[end\]([^\n]+)/;

  const startMatch = content.match(startPattern);
  const endMatch = content.match(endPattern);

  if (!startMatch || !endMatch) {
    // 如果新内容没有标记，在 insert-flag 之前插入
    const insertPosition = insertFlagMatch.index!;
    const updatedContent =
      existingContent.slice(0, insertPosition) +
      content +
      '\n\n' +
      existingContent.slice(insertPosition);
    const formattedContent = await formatCode(updatedContent, filePath);
    await fs.writeFile(filePath, formattedContent, 'utf-8');
    return;
  }

  const blockTag = startMatch[1];

  // 检查现有内容中是否已有相同的块
  const existingBlockPattern = new RegExp(
    `//\\[start\\]${blockTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?//\\[end\\]${blockTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );

  let updatedContent: string;

  if (existingBlockPattern.test(existingContent)) {
    // 替换已有的块
    updatedContent = existingContent.replace(existingBlockPattern, content.trim());
  } else {
    // 在 insert-flag 之前插入新块
    const insertPosition = insertFlagMatch.index!;
    updatedContent =
      existingContent.slice(0, insertPosition) +
      content +
      '\n\n' +
      existingContent.slice(insertPosition);
  }

  // 在格式化前先执行去重
  const deduplicatedContent = deduplicateImports(updatedContent);
  const formattedContent = await formatCode(deduplicatedContent, filePath);
  await fs.writeFile(filePath, formattedContent, 'utf-8');
}
