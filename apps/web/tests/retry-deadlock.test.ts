import { describe, expect, it, vi } from "vitest"
import { retryDeadlockedTransaction } from "@/db/retry-deadlock"

function postgresError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code })
}

describe("deadlock retry", () => {
  it("replays a transaction after PostgreSQL aborts it as a deadlock victim", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(postgresError("40P01"))
      .mockResolvedValueOnce("committed")

    await expect(retryDeadlockedTransaction(operation, 2)).resolves.toBe("committed")
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("does not retry unrelated errors or exceed its retry budget", async () => {
    const unrelated = vi.fn().mockRejectedValue(postgresError("23505"))
    await expect(retryDeadlockedTransaction(unrelated, 2)).rejects.toMatchObject({ code: "23505" })
    expect(unrelated).toHaveBeenCalledTimes(1)

    const repeatedDeadlock = vi.fn().mockRejectedValue(postgresError("40P01"))
    await expect(retryDeadlockedTransaction(repeatedDeadlock, 2)).rejects.toMatchObject({ code: "40P01" })
    expect(repeatedDeadlock).toHaveBeenCalledTimes(3)
  })
})
