import { cn } from "@/lib/utils"
import { renderQuotationDescriptionHtml } from "@/lib/quotation-description"

export function QuotationDescription({ value, className }: { value: string; className?: string }) {
  return (
    <div
      className={cn("min-w-0 break-words text-sm [&_h1]:mb-2 [&_h1]:font-bold [&_h1]:text-base [&_h2]:mb-2 [&_h2]:font-semibold [&_p]:my-0 [&_p+p]:mt-2 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ins]:underline [&_a]:underline [&_strong]:font-semibold", className)}
      dangerouslySetInnerHTML={{ __html: renderQuotationDescriptionHtml(value) }}
    />
  )
}
