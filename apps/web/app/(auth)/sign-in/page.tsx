import { env, microsoftConfigured } from "@/lib/env"
import { parseMicrosoftDirectories } from "@/lib/microsoft-directories"
import SignInForm from "./sign-in-form"

// Read deployment configuration at request time, never bake it into the image.
export const dynamic = "force-dynamic"

export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ microsoftError?: string }>
}) {
  const directories = microsoftConfigured
    ? parseMicrosoftDirectories(env.MICROSOFT_TENANT_ID, process.env.MICROSOFT_EXTERNAL_DIRECTORIES ?? "")
    : []
  const params = await searchParams
  return <SignInForm
    directories={directories.map(({ providerId, domains }) => ({ providerId, domains }))}
    microsoftEnabled={microsoftConfigured}
    microsoftError={params.microsoftError === "1"}
  />
}
