export function createQueue(concurrency: number) {
  let active = 0
  const waiting: Array<() => void> = []

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) {
      await new Promise<void>(resolve => waiting.push(resolve))
    }
    active++
    try {
      return await fn()
    } finally {
      active--
      if (waiting.length > 0) {
        waiting.shift()!()
      }
    }
  }

  return { run }
}
