import path from 'path';
import prettier from 'prettier';
import { FileSystemImpl } from '../infrastructure/file-system/file-system.impl.js';

const fileSystem = new FileSystemImpl();

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
    // 传递文件路径而不是目录路径，让 Prettier 从文件位置向上查找配置
    const config = await prettier.resolveConfig(filePath);

    // 默认配置，确保格式化一致性
    const defaultOptions: prettier.Options = {
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      useTabs: false,
      printWidth: 100,
      trailingComma: 'none',
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: 'avoid',
      endOfLine: 'lf',
      quoteProps: 'preserve'
    };

    const options: prettier.Options = {
      ...defaultOptions,
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
