"use client"

import { useRef } from "react"
import { parsePhoneNumber } from "react-phone-number-input"
import { PhoneInput } from "@/components/phone-input"
import { normalizePhoneCountry, toPhoneE164 } from "@/lib/phone-validation"

/** No nested Save: every phone keystroke updates the account-level draft. */
export function AccountDraftPhone({ value, defaultCountry, onChange }: {
  value?: string | null
  defaultCountry?: string | null
  onChange: (value: string) => void
}) {
  const initialCountry = parsePhoneNumber(value ?? "")?.country ?? normalizePhoneCountry(defaultCountry) ?? "MY"
  // Remember an explicit selector choice only while it belongs to this value.
  // Incoming values from the other editor resolve their own international country.
  const selected = useRef<{ value: string; country: string } | null>(null)
  return <PhoneInput standalone value={value ?? ""} defaultCountry={initialCountry}
    onCountryChange={country => { selected.current = { value: value ?? "", country } }}
    onChange={next => {
      const country = selected.current?.value === (value ?? "") ? selected.current.country : initialCountry
      const normalized = toPhoneE164(next, country)
      selected.current = { value: normalized, country: parsePhoneNumber(normalized)?.country ?? country }
      onChange(normalized)
    }} />
}
