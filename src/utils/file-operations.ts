import fs from 'fs/promises'
import path from 'path'

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * 读取文件内容
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8')
}

/**
 * 写入文件内容
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath)
  await ensureDir(dir)
  await fs.writeFile(filePath, content, 'utf-8')
}

/**
 * 读取 JSON 文件
 */
export async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath)
  return JSON.parse(content)
}

/**
 * 写入 JSON 文件
 */
export async function writeJson(filePath: string, data: any): Promise<void> {
  const content = JSON.stringify(data, null, 2)
  await writeFile(filePath, content)
}

/**
 * 检查文件是否存在
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 获取项目根目录
 */
export function getProjectRoot(): string {
  // 返回当前工作目录（使用者项目的根目录）
  // 而不是包本身的目录
  return process.cwd()
}

