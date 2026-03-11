import { mkdir, writeFile } from 'node:fs/promises'

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

export async function writeJsonFile(
  path: string,
  data: unknown,
): Promise<void> {
  const json = JSON.stringify(data, null, 2)
  await writeFile(path, `${json}\n`, 'utf-8')
}

export async function writeTextFile(
  path: string,
  content: string,
): Promise<void> {
  await writeFile(path, content, 'utf-8')
}

export async function writeBinaryFile(
  path: string,
  buffer: Buffer,
): Promise<void> {
  await writeFile(path, buffer)
}
