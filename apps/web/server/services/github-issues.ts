import "server-only"

const GITHUB_API_VERSION = "2022-11-28"

export type CreateGithubIssueInput = {
  token: string
  title: string
  body: string
  fetchImpl?: typeof fetch
}

export type CreatedGithubIssue = {
  number: number
}

/** Creates one issue without returning repository metadata to the browser. */
export async function createGithubIssue(
  input: CreateGithubIssueInput
): Promise<CreatedGithubIssue> {
  const response = await (input.fetchImpl ?? fetch)(
    "https://api.github.com/repos/Super-ERP/crm-v2/issues",
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${input.token}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: input.title, body: input.body }),
    }
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    console.error("[github-issues] create failed", {
      status: response.status,
      detail: detail.slice(0, 500),
    })
    throw new Error("GitHub could not create the issue")
  }

  const result = (await response.json()) as { number?: unknown }
  if (typeof result.number !== "number") {
    throw new Error("GitHub returned an invalid issue response")
  }

  return { number: result.number }
}
