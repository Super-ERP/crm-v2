"use client"

import { HelpCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/** Separate help hit area inside the same outline; help never changes the quote. */
export function SetPrimaryQuotationButton({ disabled, onSetPrimary }: { disabled: boolean; onSetPrimary: () => void }) {
  return (
    <div role="group" aria-label="Primary quotation" className="inline-flex w-full items-center rounded-lg border border-input bg-background">
      <Button type="button" variant="ghost" className="flex-1" disabled={disabled} onClick={onSetPrimary}>Set primary</Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<button type="button" aria-label="What does setting a primary quotation do?" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><HelpCircleIcon className="size-3.5" aria-hidden="true" /></button>} />
          <TooltipContent>Uses this quotation’s net amount for the Funnel’s quoted value. Manual estimates still take precedence in Deal value; own forecast uses estimates. This help control does not change the primary quotation.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
