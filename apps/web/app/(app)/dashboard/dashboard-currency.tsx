"use client"

import * as React from "react"

type DashboardCurrency = { currency: string }

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
    <CurrencyContext.Provider value={{ currency }}>
      {available.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Monetary totals are shown separately by currency. No exchange rate is assumed.
          </p>
          <label className="flex items-center gap-2 text-sm font-medium">
            Display currency
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-foreground"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {available.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {children}
    </CurrencyContext.Provider>
  )
}

export function useDashboardCurrency(): DashboardCurrency {
  const context = React.useContext(CurrencyContext)
  if (!context) throw new Error("Dashboard currency provider is missing")
  return context
}
