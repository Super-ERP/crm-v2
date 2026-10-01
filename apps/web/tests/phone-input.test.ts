import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PhoneInput } from "@/components/phone-input"

describe("PhoneInput", () => {
  it("renders standalone controlled fields without a form context", () => {
    const html = renderToStaticMarkup(
      React.createElement(PhoneInput, {
        standalone: true,
        label: "Company phone",
        value: "",
        onChange: () => undefined,
      }),
    )
    expect(html).toContain("Company phone")
    expect(html).toContain("Selected country")
  })

  it("does not mark a phone number invalid before the user leaves the field", () => {
    const untouched = renderToStaticMarkup(
      React.createElement(PhoneInput, {
        standalone: true,
        label: "Company phone",
        value: "123",
        onChange: () => undefined,
      }),
    )
    expect(untouched).not.toContain("Invalid phone number")

    const serverError = renderToStaticMarkup(
      React.createElement(PhoneInput, {
        standalone: true,
        label: "Company phone",
        value: "123",
        error: "Enter a valid phone number.",
        onChange: () => undefined,
      }),
    )
    expect(serverError).toContain("Invalid phone number")
    expect(serverError).toContain("Enter a valid phone number.")
  })
})
