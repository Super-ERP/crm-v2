export function formatMoney(
  value: string | number | null | undefined,
  currency = "MYR"
): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0)
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || "MYR",
  }).format(Number.isFinite(n) ? (n as number) : 0)
}

/** Compact currency for chart axes / tight labels, e.g. "RM 1.2M". */
export function formatMoneyCompact(
  value: string | number | null | undefined,
  currency = "MYR"
): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0)
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || "MYR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n) ? (n as number) : 0)
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(date)
}

/** Display a Malaysian number in the usual international quotation format. */
export function formatMalaysianPhone(value: string | null | undefined): string {
  const raw = value?.trim() ?? ""
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (!digits) return raw

  const international = digits.startsWith("60")
    ? digits
    : `60${digits.replace(/^0/, "")}`
  const national = international.slice(2)

  if (national.startsWith("1")) {
    const mobileCode = national.slice(0, 2)
    const subscriber = national.slice(2)
    if (subscriber.length === 8) {
      return `+60${mobileCode}-${subscriber.slice(0, 4)} ${subscriber.slice(4)}`
    }
    if (subscriber.length === 7) {
      return `+60${mobileCode}-${subscriber.slice(0, 3)} ${subscriber.slice(3)}`
    }
  }

  if (national.startsWith("3") && national.length === 9) {
    return `+603-${national.slice(1, 5)} ${national.slice(5)}`
  }

  return `+${international}`
}

/** Short month label, e.g. "Jul 2026". */
export function formatMonth(d: string | Date | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-MY", {
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatPercent(p: string | number | null | undefined): string {
  const n = typeof p === "string" ? Number(p) : (p ?? 0)
  return `${Number.isFinite(n) ? n : 0}%`
}
