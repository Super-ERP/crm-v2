"use server"

import { env } from "@/lib/env"
import { requireContext } from "@/lib/server-context"
import type { ActionResult } from "@/lib/action-result"
import { createGithubIssue } from "@/server/services/github-issues"

const MAX_TITLE_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 10_000

export type IssueReportInput = {
  title: string
  description: string
}

export type IssueReportResult = { number: number }

function invalid(message: string): ActionResult<IssueReportResult> {
  return { ok: false, error: message }
}

export async function reportIssue(
  input: IssueReportInput
): Promise<ActionResult<IssueReportResult>> {
  try {
    const ctx = await requireContext()
    const title = input?.title?.trim() ?? ""
    const description = input?.description?.trim() ?? ""

    if (!title) return invalid("Please enter a short issue title.")
    if (title.length > MAX_TITLE_LENGTH) {
      return invalid(`The issue title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
    }
    if (!description) return invalid("Please describe the issue.")
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return invalid("The issue description is too long.")
    }
    if (!env.GITHUB_ISSUES_TOKEN) {
      console.error("[issue-report] GITHUB_ISSUES_TOKEN is not configured")
      return { ok: false, error: "Issue reporting is not configured yet. Please contact the administrator." }
    }

    const body = [
      description,
      "",
      "---",
      `Reported by: ${ctx.userName} <${ctx.userEmail}>`,
      `Organization ID: ${ctx.tenantId}`,
    ].join("\n")

    const issue = await createGithubIssue({
      token: env.GITHUB_ISSUES_TOKEN,
      title,
      body,
    })

    return { ok: true, data: issue }
  } catch (error) {
    console.error("[issue-report] unexpected failure", error)
    return { ok: false, error: "We could not submit the issue. Please try again." }
  }
}
