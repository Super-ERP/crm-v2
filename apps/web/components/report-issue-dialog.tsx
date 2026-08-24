"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { showActionError } from "@/lib/show-action-error"
import { reportIssue } from "@/app/(app)/_shared/issue-report-actions"

export function ReportIssueDialog() {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [pending, startTransition] = React.useTransition()

  function reset() {
    setTitle("")
    setDescription("")
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await reportIssue({ title, description })
      if (!result.ok) return showActionError(result)
      toast.success(`Issue submitted (#${result.data.number})`)
      reset()
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
      >
        <span className="hidden sm:inline">Report an issue</span>
        <span className="sm:hidden">Report</span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !pending) reset()
          setOpen(nextOpen)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Report an issue</DialogTitle>
              <DialogDescription>
                Send a bug or suggestion to the CRM support team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <label className="grid gap-2 text-sm font-medium" htmlFor="issue-title">
                Title
                <Input
                  id="issue-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What went wrong?"
                  maxLength={160}
                  required
                  disabled={pending}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="issue-description">
                Description
                <Textarea
                  id="issue-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Tell us what you expected and what happened."
                  maxLength={10_000}
                  rows={6}
                  required
                  disabled={pending}
                />
              </label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Submitting…" : "Submit issue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
