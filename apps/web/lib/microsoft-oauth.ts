import { microsoftEntraId } from "better-auth/plugins/generic-oauth"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { microsoftEmailDomain, type MicrosoftDirectory } from "./microsoft-directories"

type Provider = ReturnType<typeof microsoftEntraId>
type KeySet = Parameters<typeof jwtVerify>[1]

/** Each provider has a fixed authority, signed-token issuer/audience and domain boundary. */
export function createMicrosoftProviders(options: {
  directories: MicrosoftDirectory[]
  clientId: string
  clientSecret: string
  baseURL: string
  /** Test seams; production always uses Microsoft's JWKS and userinfo endpoint. */
  keySet?: (tenantId: string) => KeySet
  userInfo?: NonNullable<Provider["getUserInfo"]>
}): Provider[] {
  const externalDomains = new Set(options.directories.slice(1).flatMap((directory) => directory.domains))
  return options.directories.map((directory) => {
    const provider = microsoftEntraId({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      tenantId: directory.tenantId,
      pkce: true,
      redirectURI: `${options.baseURL.replace(/\/$/, "")}/api/auth/oauth2/callback/${directory.providerId}`,
    })
    const keys = options.keySet?.(directory.tenantId) ?? createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${directory.tenantId}/discovery/v2.0/keys`),
    )
    const getUserInfo = options.userInfo ?? provider.getUserInfo!
    return {
      ...provider,
      providerId: directory.providerId,
      getUserInfo: async (tokens) => {
        if (!tokens.idToken || !tokens.accessToken) return null
        try {
          const { payload } = await jwtVerify(tokens.idToken, keys, {
            issuer: `https://login.microsoftonline.com/${directory.tenantId}/v2.0`,
            audience: options.clientId,
            algorithms: ["RS256"],
            requiredClaims: ["exp", "iat", "sub", "tid"],
          })
          if (payload.tid !== directory.tenantId) return null
          const profile = await getUserInfo(tokens)
          if (!profile || profile.id !== payload.sub || typeof profile.email !== "string") return null
          const domain = microsoftEmailDomain(profile.email)
          if (!domain) return null
          if (directory.domains.length ? !directory.domains.includes(domain) : externalDomains.has(domain)) return null
          return { ...profile, email: profile.email.trim().toLowerCase() }
        } catch {
          // Fail closed without logging tokens or personal information.
          return null
        }
      },
    }
  })
}
