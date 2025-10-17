import path from 'path';
import prettier from 'prettier';
import { getProjectRoot } from './file-operations.js';

/**
 * 格式化代码
 */
export async function formatCode(content: string, filePath: string): Promise<string> {
  try {
    // 根据文件扩展名确定解析器
    const ext = path.extname(filePath);
    let parser: string;

    switch (ext) {
      case '.ts':
        parser = 'typescript';
        break;
      case '.js':
        parser = 'babel';
        break;
      case '.json':
        parser = 'json';
        break;
      default:
        // 不支持的文件类型，直接返回原内容
        return content;
    }

    // 使用 Prettier 的 resolveConfig 自动查找项目配置
    // 支持 .prettierrc, .prettierrc.json, .prettierrc.js, prettier.config.js 等多种格式
    const projectRoot = getProjectRoot();
    const config = await prettier.resolveConfig(projectRoot);

    const options: prettier.Options = {
      ...config,
      parser
    };

    // 格式化代码
    return await prettier.format(content, options);
  } catch (error) {
    // 格式化失败时返回原内容
    console.warn(`格式化文件失败 ${filePath}:`, error);
    return content;
  }
}
