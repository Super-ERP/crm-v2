"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient, genericOAuthClient, twoFactorClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), genericOAuthClient(), twoFactorClient()],
})

export const { signIn, signOut, signUp, useSession, useActiveOrganization } =
  authClient
