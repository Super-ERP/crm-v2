import { describe, expect, it, vi } from "vitest"

import { createGithubIssue } from "@/server/services/github-issues"

describe("createGithubIssue", () => {
  it("posts an issue with the server-side GitHub auth headers", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ number: 42 }), { status: 201 })
    )

    const result = await createGithubIssue({
      token: "secret-token",
      title: "Cannot save quotation",
      body: "The save button does nothing.",
      fetchImpl,
    })

    expect(result).toEqual({ number: 42 })
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.github.com/repos/Super-ERP/crm-v2/issues",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
          "X-GitHub-Api-Version": "2022-11-28",
        }),
        body: JSON.stringify({
          title: "Cannot save quotation",
          body: "The save button does nothing.",
        }),
      })
    )
  })

  it("does not leak the GitHub error response to callers", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response("private GitHub details", { status: 403 })
    )

    await expect(
      createGithubIssue({
        token: "secret-token",
        title: "Issue",
        body: "Details",
        fetchImpl,
      })
    ).rejects.toThrow("GitHub could not create the issue")
  })
})
