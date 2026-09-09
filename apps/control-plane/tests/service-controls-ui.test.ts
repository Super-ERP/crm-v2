import { renderToString } from "hono/jsx/dom/server"
import { describe, expect, it } from "vitest"

import { ClientServicePage, ServiceControlsPage } from "../src/ui/service-controls"

const control = {
  deploymentId: "deployment-1", clientId: "client-1", clientName: "Acme Services",
  deploymentName: "acme-production", environment: "production", enabled: true,
  seatLimit: 25, revision: 7, adopted: true, canSave: true, blockedReason: null,
  syncStatus: "applied" as const, activeUsers: 12, reservedInvitations: 3,
  lastConnectedAt: "2026-09-09T01:02:03.000Z",
}

describe("simple service controls", () => {
  it("renders the everyday deployment form with only access and seats", () => {
    const html = renderToString(ServiceControlsPage({ controls: control, operatorEmail: "owner@example.com" }))
    expect(html).toContain("ERP access")
    expect(html).toContain('name="enabled"')
    expect(html).toContain('value="on"')
    expect(html).toContain('value="off"')
    expect(html).toContain('name="seatLimit"')
    expect(html).toContain('name="expectedRevision" value="7"')
    expect(html).toContain("Applied")
    expect(html).toContain("12 active users")
    expect(html).toContain("3 reserved invitations")
    expect(html).toContain(`/operator/deployments/${control.deploymentId}/advanced`)
    expect(html).not.toMatch(/contract|billing|invoice|entitlement|signing/i)
  })

  it("shows each client environment explicitly", () => {
    const staging = { ...control, deploymentId: "deployment-2", deploymentName: "acme-staging", environment: "staging", syncStatus: "pending" as const }
    const html = renderToString(ClientServicePage({ controls: [control, staging], operatorEmail: "owner@example.com" }))
    expect(html).toContain("Production")
    expect(html).toContain("Staging")
    expect(html).toContain("acme-production")
    expect(html).toContain("acme-staging")
    expect(html).toContain("Waiting")
  })

  it("explains when setup prevents saving", () => {
    const html = renderToString(ServiceControlsPage({ controls: { ...control, enabled: null, seatLimit: null, adopted: false, canSave: false, blockedReason: "service_upgrade_required" }, operatorEmail: "owner@example.com" }))
    expect(html).toContain("Needs attention")
    expect(html).toContain("Upgrade the client service before using these controls.")
    expect(html).not.toContain("Save changes")
  })

  it("states that pending delivery has already saved the settings", () => {
    const html = renderToString(ServiceControlsPage({
      controls: { ...control, syncStatus: "pending" },
      operatorEmail: "owner@example.com",
      notice: { tone: "warning", title: "Settings saved; update pending", message: "Your settings are saved. Delivery will retry automatically." },
    }))
    expect(html).toContain("Settings saved; update pending")
    expect(html).toContain("Your settings are saved. Delivery will retry automatically.")
  })
})
