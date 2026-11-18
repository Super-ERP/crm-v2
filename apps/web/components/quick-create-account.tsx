"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { usePermissions } from "@/components/command-palette"
import { PERMISSIONS } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { showActionError } from "@/lib/show-action-error"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { createAccount } from "@/app/(app)/accounts/actions"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().regex(/^[A-Za-z0-9]{2,6}$/, "Account code must be 2–6 letters/digits"),
})

type FormValues = z.infer<typeof schema>

/**
 * Minimal "add on the fly" dialog for an Account, opened from an entity picker's
 * inline "+ Create" row. Captures only the required Name (account type defaults
 * to "client" in createAccount); the user fills the rest later on the account
 * page. On success it hands the new {id,name} back so the caller can select it
 * and append it to the picker's options.
 */
export function AccountQuickCreate({
  open,
  onOpenChange,
  defaultName,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName?: string
  onCreated: (rec: { id: string; name: string; ownerMemberId: string | null }) => void
}) {
  const canManageCode = usePermissions().has(PERMISSIONS.ACCOUNT_CODE_MANAGE)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultName ?? "", code: "" },
  })

  // Re-seed with the typed text each time the dialog opens.
  React.useEffect(() => {
    if (open) form.reset({ name: defaultName ?? "", code: "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultName])

  async function onSubmit(values: FormValues) {
    const res = await createAccount({ name: values.name, currency: "", code: values.code })
    if (!res.ok) {
      showActionError(res)
      return
    }
    toast.success("Account created")
    onCreated({ id: res.data.id, name: res.data.name, ownerMemberId: res.data.ownerMemberId })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New account</DialogTitle>
          <DialogDescription>
            {canManageCode ? "Create an account with a manually assigned unique code." : "Ask Sales Admin to create the account, or submit a Lead conversion for review."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canManageCode ? <FormField control={form.control} name="code" render={({ field }) => <FormItem><FormLabel required>Account code</FormLabel><FormControl><Input {...field} maxLength={6} className="uppercase" /></FormControl><FormMessage /></FormItem>} /> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canManageCode || form.formState.isSubmitting}>
                Create account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
