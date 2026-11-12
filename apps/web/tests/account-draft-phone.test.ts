import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
const field = vi.hoisted(() => ({ props: null as null | { onChange: (value: string) => void; onCountryChange: (country: string) => void } }))
vi.mock("@/components/phone-input", () => ({ PhoneInput: (props: typeof field.props) => { field.props = props; return null } }))
import { AccountDraftPhone } from "@/app/(app)/accounts/[id]/account-draft-phone"
describe("phone in account-level draft", () => {
  it("updates the draft immediately without a nested Save, using the selected country", () => {
    const update = vi.fn()
    renderToStaticMarkup(createElement(AccountDraftPhone, {value: "", defaultCountry: "Malaysia", onChange: update}))
    field.props!.onChange("0123456789")
    expect(update).toHaveBeenLastCalledWith("+60123456789")
    field.props!.onCountryChange("SG")
    field.props!.onChange("81234567")
    expect(update).toHaveBeenLastCalledWith("+6581234567")
    field.props!.onChange("")
    expect(update).toHaveBeenLastCalledWith("")
  })
  it("uses an international value received from the other account editor", () => {
    const update = vi.fn()
    renderToStaticMarkup(createElement(AccountDraftPhone, {value: "+6581234567", defaultCountry: "Malaysia", onChange: update}))
    field.props!.onChange("82345678")
    expect(update).toHaveBeenCalledWith("+6582345678")
  })
})
