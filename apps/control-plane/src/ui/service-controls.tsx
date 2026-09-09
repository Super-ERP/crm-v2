/** @jsxImportSource hono/jsx */
import { Button, NoticePanel, StatusBadge, type NoticeTone, type StatusTone } from "./components"
import { OperatorLayout } from "./layout"
import { titleCase } from "./presenters"
import type { ServiceControlsView } from "../repos/service-controls"

export interface ServiceControlsNotice {
  tone: NoticeTone
  title: string
  message: string
}

const syncPresentation: Record<ServiceControlsView["syncStatus"], { label: string; tone: StatusTone }> = {
  applied: { label: "Applied", tone: "success" },
  pending: { label: "Waiting for server", tone: "warning" },
  attention: { label: "Needs attention", tone: "error" },
}
const blockedReasonMessage: Record<string, string> = {
  service_setup_required: "Finish service setup before changing access.",
  service_upgrade_required: "Upgrade the client service before using these controls.",
}

function connectionTime(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not connected yet"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value)) + " MYT"
}

function ServiceControlCard(props: { controls: ServiceControlsView }) {
  const controls = props.controls
  const sync = syncPresentation[controls.canSave ? controls.syncStatus : "attention"]
  const fieldId = `seats-${controls.deploymentId}`
  return (
    <article class="service-panel" aria-label={`${titleCase(controls.environment)} ERP controls`}>
      <header class="service-panel-header">
        <div class="service-identity">
          <span class="service-mark" aria-hidden="true">{controls.clientName.trim().charAt(0).toUpperCase() || "C"}</span>
          <div><h2>{controls.deploymentName}</h2><p>{titleCase(controls.environment)}</p></div>
        </div>
        <StatusBadge tone={sync.tone}>{sync.label}</StatusBadge>
      </header>
      <form method="post" action={`/operator/deployments/${controls.deploymentId}/service-controls`}>
        <div class="service-control-row">
          <div><h3 id={`access-${controls.deploymentId}`}>ERP access</h3><p>Allow your client to use the ERP.</p></div>
          {controls.canSave ? <fieldset class="service-toggle" aria-labelledby={`access-${controls.deploymentId}`}>
            <label><input type="radio" name="enabled" value="on" checked={controls.enabled === true} required /><span>On</span></label>
            <label><input type="radio" name="enabled" value="off" checked={controls.enabled === false} required /><span>Off</span></label>
          </fieldset> : <strong>{controls.enabled === null ? "Not set" : controls.enabled ? "On" : "Off"}</strong>}
        </div>
        <div class="service-control-row">
          <div><label class="service-field-label" for={fieldId}>Seats allowed</label><p>The maximum number of client users.</p></div>
          {controls.canSave ? <input class="service-seat-input" id={fieldId} name="seatLimit" type="number" min={1} max={100000} step={1} value={controls.seatLimit ?? ""} required /> : <strong>{controls.seatLimit ?? "Not set"}</strong>}
        </div>
        {controls.blockedReason ? <p class="service-help">{blockedReasonMessage[controls.blockedReason] ?? "Service settings need attention before they can be changed."}</p> : null}
        <footer class="service-panel-footer">
          <p>{controls.syncStatus === "pending" ? "Saved changes are waiting for the server." : "Changes take effect after the server confirms them."}</p>
          {controls.canSave ? <><input type="hidden" name="expectedRevision" value={controls.revision} /><Button>Save changes</Button></> : null}
        </footer>
      </form>
      <div class="service-observations">
        <div><span class="service-stat-label">Seat usage</span><strong>{controls.activeUsers === null ? "Not reported" : `${controls.activeUsers} active users`}</strong><small>{controls.reservedInvitations === null ? "Invitations not reported" : `${controls.reservedInvitations} reserved invitations`}</small></div>
        <div><span class="service-stat-label">Last connected</span><strong>{connectionTime(controls.lastConnectedAt)}</strong><small>Reported by the client's server</small></div>
      </div>
      <details class="service-more">
        <summary>Connection &amp; troubleshooting</summary>
        <p>Server connection, diagnostics and recovery. You don’t need these to change access or seats.</p>
        <a href={`/operator/deployments/${controls.deploymentId}/advanced`}>Open server tools →</a>
      </details>
    </article>
  )
}

export function ServiceControlsPage(props: { controls: ServiceControlsView; operatorEmail: string; notice?: ServiceControlsNotice }) {
  const controls = props.controls
  return <OperatorLayout title={controls.clientName} operatorEmail={props.operatorEmail} breadcrumbs={[
    { label: "Clients", href: "/operator/clients" },
    { label: controls.clientName, href: `/operator/clients/${controls.clientId}` },
    { label: controls.deploymentName },
  ]}>
    <div class="service-workspace">
      <header class="service-page-header"><p>Client service</p><h1>{controls.clientName}</h1><span>Access and seats. All in one place.</span></header>
      <NoticePanel notice={props.notice} />
      <ServiceControlCard controls={controls} />
    </div>
  </OperatorLayout>
}

export function ClientServicePage(props: { controls: ServiceControlsView[]; operatorEmail: string; notice?: ServiceControlsNotice; clientId?: string; clientName?: string }) {
  const clientName = props.clientName ?? props.controls[0]?.clientName ?? "Client services"
  return <OperatorLayout title={clientName} operatorEmail={props.operatorEmail}>
    <div class="service-workspace">
      <header class="service-page-header"><p>Client service</p><h1>{clientName}</h1><span>Access and seats. All in one place.</span></header>
      <NoticePanel notice={props.notice} />
      {props.controls.length === 0 ? <p>No service environments are set up yet.</p> : props.controls.map((controls) => <ServiceControlCard controls={controls} />)}
      {props.clientId ? <details class="service-more service-account-options"><summary>More options</summary><p>Initial server setup and historical account records.</p><a href={`/operator/clients/${props.clientId}/advanced`}>Open account setup →</a></details> : null}
    </div>
  </OperatorLayout>
}
