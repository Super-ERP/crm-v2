"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type DashboardCurrency = { currency: string; available: string[]; setCurrency: (currency: string) => void }

const CurrencyContext = React.createContext<DashboardCurrency | null>(null)

export function selectAvailableCurrency(
  requested: string,
  fallback: string,
  available: string[]
): string {
  return available.includes(requested)
    ? requested
    : available.includes(fallback) ? fallback : available[0] ?? fallback
}

export function DashboardCurrencyProvider({
  available,
  defaultCurrency,
  children,
}: {
  available: string[]
  defaultCurrency: string
  children?: React.ReactNode
}) {
  const [requestedCurrency, setCurrency] = React.useState(() =>
    selectAvailableCurrency(defaultCurrency, defaultCurrency, available)
  )
  const currency = selectAvailableCurrency(requestedCurrency, defaultCurrency, available)
  return (
    <CurrencyContext.Provider value={{ currency, available, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function DashboardCurrencyPicker() {
  const { currency, available, setCurrency } = useDashboardCurrency()
  const currencyLabelId = React.useId()
  return (
    <>
      {available.length > 1 && (
        <div className="flex shrink-0 items-center gap-2">
          <span id={currencyLabelId} className="text-sm font-medium">Currency</span>
          <Select
            value={currency}
            onValueChange={(value) => { if (value) setCurrency(value) }}
            items={available.map((code) => ({ value: code, label: code }))}
          >
            <SelectTrigger aria-labelledby={currencyLabelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {available.map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )
}

export function useDashboardCurrency(): DashboardCurrency {
  const context = React.useContext(CurrencyContext)
  if (!context) throw new Error("Dashboard currency provider is missing")
  return context
}
