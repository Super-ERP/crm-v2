"use client"

import * as React from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { disableOwnBreakGlassAccess, enableOwnBreakGlassAccess } from "./actions"

export function SecurityClient() {
  const [password, setPassword] = React.useState("")
  const [code, setCode] = React.useState("")
  const [totpURI, setTotpURI] = React.useState<string | null>(null)
  const [backupCodes, setBackupCodes] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState(false)

  async function enable() {
    setBusy(true)
    const { data, error } = await authClient.twoFactor.enable({ password })
    setBusy(false)
    if (error || !data) {
      toast.error(error?.message ?? "Could not start MFA enrollment")
      return
    }
    setTotpURI(data.totpURI)
    setBackupCodes(data.backupCodes)
    setPassword("")
  }

  async function verify() {
    setBusy(true)
    const { error } = await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
    setBusy(false)
    if (error) {
      toast.error(error.message ?? "Invalid authentication code")
      return
    }
    toast.success("Multi-factor authentication enabled")
    setTotpURI(null)
    setCode("")
  }

  async function enableEmergencyAccess() {
    setBusy(true)
    try {
      await enableOwnBreakGlassAccess()
      toast.success("Emergency password access enabled")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable emergency access")
    } finally {
      setBusy(false)
    }
  }

  async function disableEmergencyAccess() {
    setBusy(true)
    try {
      await disableOwnBreakGlassAccess()
      toast.success("Emergency password access disabled")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disable emergency access")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Multi-factor authentication</CardTitle>
        <CardDescription>
          Required before an administrator can designate this account for emergency password access.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {totpURI ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="totp-uri">Authenticator setup URI</Label>
              <Input id="totp-uri" value={totpURI} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="totp-code">Authentication code</Label>
              <Input id="totp-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Recovery codes — store these offline now</p>
              <code className="mt-2 block whitespace-pre-wrap">{backupCodes.join("\n")}</code>
            </div>
            <Button onClick={verify} disabled={busy || code.length < 6}>Verify and enable</Button>
          </>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <Button onClick={enable} disabled={busy || !password}>Start enrollment</Button>
          </>
        )}
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={enableEmergencyAccess} disabled={busy}>
              Enable emergency password access
            </Button>
            <Button variant="outline" onClick={disableEmergencyAccess} disabled={busy}>
              Disable emergency password access
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
