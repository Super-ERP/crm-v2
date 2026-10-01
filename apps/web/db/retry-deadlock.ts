/** Retry a replayable transaction after PostgreSQL aborts it as a deadlock victim. */
export async function retryDeadlockedTransaction<T>(
  operation: () => Promise<T>,
  retries: number
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= retries || !(error instanceof Error && "code" in error && error.code === "40P01"))
        throw error
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)))
    }
  }
}
