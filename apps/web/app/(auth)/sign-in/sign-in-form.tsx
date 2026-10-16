"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { resolveMicrosoftProvider, type MicrosoftDirectory } from "@/lib/microsoft-directories"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SignInForm({ directories, microsoftEnabled, microsoftError }: {
  directories: Pick<MicrosoftDirectory, "providerId" | "domains">[]
  microsoftEnabled: boolean
  microsoftError: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [showEmail, setShowEmail] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [workEmail, setWorkEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [totpCode, setTotpCode] = React.useState("")
  const [requiresTotp, setRequiresTotp] = React.useState(false)

  async function signInWithMicrosoft(e: React.FormEvent) {
    e.preventDefault()
    const providerId = directories.length > 1
      ? resolveMicrosoftProvider(workEmail, directories)
      : "microsoft-entra-id"
    if (!providerId) {
      toast.error("Enter your work email address to continue.")
      return
    }
    setLoading(true)
    try {
      const { error } = await authClient.signIn.oauth2({
        providerId,
        callbackURL: "/dashboard",
        errorCallbackURL: "/sign-in?microsoftError=1",
      })
      if (error) {
        setLoading(false)
        toast.error("Microsoft sign-in could not start. Try again or contact your administrator.")
      }
    } catch {
      setLoading(false)
      toast.error("Unable to connect. Check your connection and try again.")
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (error) {
      toast.error("Invalid email or password")
      return
    }
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      setRequiresTotp(true)
      return
    }
    router.push("/dashboard")
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await authClient.twoFactor.verifyTotp({ code: totpCode, trustDevice: false })
    setLoading(false)
    if (error) {
      toast.error("Invalid authentication code")
      return
    }
    router.push("/dashboard")
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Sign in to CRM</CardTitle>
        <CardDescription>Use your Microsoft account to continue</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {microsoftError && (
          <p role="alert" className="text-sm text-destructive">
            Microsoft sign-in was unsuccessful. Check that you used your invited work account, or contact your administrator.
          </p>
        )}
        {microsoftEnabled && (
          <form onSubmit={signInWithMicrosoft} className="grid gap-3">
            {directories.length > 1 && (
              <div className="grid gap-2">
                <Label htmlFor="work-email">Work email</Label>
                <Input
                  id="work-email"
                  type="email"
                  autoComplete="username"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  aria-describedby="work-email-help"
                  disabled={loading}
                  required
                />
                <p id="work-email-help" className="text-xs text-muted-foreground">
                  Use the email address invited to CRM. We’ll open your organisation’s Microsoft sign-in.
                </p>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              <MicrosoftLogo />
              {loading ? "Connecting…" : "Continue with Microsoft"}
            </Button>
          </form>
        )}

        {requiresTotp ? (
          <form onSubmit={verifyTotp} className="grid gap-3">
            <Label htmlFor="totp">Authentication code</Label>
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>Verify</Button>
          </form>
        ) : showEmail ? (
          <form onSubmit={signInWithEmail} className="grid gap-3">
            <div className="relative my-1 text-center text-xs text-muted-foreground">
              <span className="bg-card px-2">or sign in with email</span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={loading}>
              Sign in
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowEmail(true)}
          >
            Use email and password
          </Button>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Email sign-in is enabled per entity for provisioned accounts only.
        </p>
      </CardContent>
    </Card>
  )
}

function MicrosoftLogo() {
  return (
    <svg className="size-4" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
