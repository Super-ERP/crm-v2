import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"
import { SetPrimaryQuotationButton } from "@/app/(app)/quotations/set-primary-quotation-button"
it("places independent help and action buttons within one outlined group", async () => {
  const action = vi.fn()
  const html = renderToStaticMarkup(createElement(SetPrimaryQuotationButton, { onSetPrimary: action, disabled: false }))
  expect(html).toContain('role="group"')
  expect(html.match(/<button/g)).toHaveLength(2)
  const tree = SetPrimaryQuotationButton({ disabled: false, onSetPrimary: action })
  const [actionButton, tooltipProvider] = tree.props.children
  const tooltip = tooltipProvider.props.children
  const trigger = tooltip.props.children[0]
  const helpButton = trigger.props.render
  expect(helpButton.type).toBe("button")
  expect(helpButton.props["aria-label"]).toBe("What does setting a primary quotation do?")
  helpButton.props.onClick?.()
  expect(action).not.toHaveBeenCalled()
  actionButton.props.onClick()
  expect(action).toHaveBeenCalledOnce()
})
