"use client"

import * as React from "react"
import { checkConversionDuplicates } from "@/app/(app)/leads/conversion-duplicate-actions"

type Result = { key: string; registrationDuplicate?: boolean; codeDuplicate?: boolean; similarName?: boolean; error?: boolean }
export function useConversionDuplicateCheck(leadId: string, registration: string, code: string | undefined, enabled: boolean) {
  const key = JSON.stringify([leadId, registration, code])
  const [result, setResult] = React.useState<Result | null>(null)
  React.useEffect(() => {
    if (!enabled) return
    let current = true
    const timer = setTimeout(() => {
      checkConversionDuplicates(leadId, registration, code).then(value => {
        if (current) setResult({ key, ...value })
      }).catch(() => { if (current) setResult({ key, error: true }) })
    }, 400)
    return () => { current = false; clearTimeout(timer) }
  }, [leadId, registration, code, enabled, key])
  const checked = enabled && result?.key === key ? result : null
  return { checking: enabled && !checked, ...checked, blocked: enabled && (!checked || !!checked.error || !!checked.registrationDuplicate || !!checked.codeDuplicate) }
}
