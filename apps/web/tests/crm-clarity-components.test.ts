import { createElement, type ReactNode, type ReactElement } from "react"
import { act, create, type ReactTestRenderer } from "react-test-renderer"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
vi.mock("next/link", () => ({default: ({children,...props}: {children:ReactNode}) => createElement("a",props,children)}))
vi.mock("@/components/ui/button", () => ({Button: ({children,render,...props}: {children:ReactNode;render?:ReactElement}) => render ? createElement("a",{...props,...render.props as object},children) : createElement("button",props,children)}))
import { FunnelCreateAction } from "@/app/(app)/accounts/[id]/funnel-create-action"
import { RecordReference } from "@/components/record-reference"
import { DealValue } from "@/components/deal-value"
let view: ReactTestRenderer
beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true))
afterEach(() => { act(() => view?.unmount()); vi.unstubAllGlobals() })
it("requires an explicit Funnel choice and links the chosen record rather than reader order", () => {
  act(() => { view=create(createElement(FunnelCreateAction,{accountId:"a",kind:"quotation",funnels:[{funnelId:"first",name:"First deal"},{funnelId:"chosen",name:"Chosen deal"}]})) })
  expect(view.root.findByType("button").props.disabled).toBe(true)
  expect(view.root.findAllByType("a")).toHaveLength(0)
  const select = view.root.findByType("select")
  expect(view.root.findByType("label").props.htmlFor).toBe(select.props.id)
  act(() => select.props.onChange({target:{value:"chosen"}}))
  expect(view.root.findByType("a").props.href).toBe("/quotations/new?funnelId=chosen")
})
it("shows explicit zero as estimated and a primary quote fallback as a revision link", () => {
  act(() => { view=create(createElement(DealValue,{row:{estimatedAmount:"0",amount:"120",currency:"USD",primaryQuotationId:"q",primaryQuotationNumber:"Q100-2"}})) })
  expect(JSON.stringify(view.toJSON())).toContain("US$0.00")
  expect(JSON.stringify(view.toJSON())).toContain("Estimated")
  expect(view.root.findAllByType("a")).toHaveLength(0)
  act(() => view.update(createElement(DealValue,{row:{estimatedAmount:null,amount:"120",currency:"USD",primaryQuotationId:"q",primaryQuotationNumber:"Q100-2"}})))
  expect(view.root.findByType("a").props.href).toBe("/quotations/q")
  expect(view.root.findByType("a").children.join("")).toBe("From Q100-2")
})

it("keeps an out-of-scope record label readable without an actionable link", () => {
  act(() => {view=create(createElement(RecordReference,{href:"/opportunities/other",label:"Parent Opportunity",available:false}))})
  expect(view.root.findAllByType("a")).toHaveLength(0)
  expect(JSON.stringify(view.toJSON())).toContain("Parent Opportunity")
})
