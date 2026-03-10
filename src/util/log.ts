export const log = {
  info(message: string): void {
    process.stdout.write(`${message}\n`)
  },
  error(message: string): void {
    console.error(message)
  },
}
