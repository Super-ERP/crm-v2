/** @jsxImportSource hono/jsx */
import { Button, Card, DataList, Field, NoticePanel, PageHeader, StatusBadge, type NoticeTone, type StatusTone } from "./components"
import { OperatorLayout } from "./layout"
import { formatUtc, titleCase } from "./presenters"
import type { ServiceControlsView } from "../repos/service-controls"

export interface ServiceControlsNotice {
  tone: NoticeTone
  title: string
  message: string
}

const syncPresentation: Record<ServiceControlsView["syncStatus"], { label: string; tone: StatusTone }> = {
  applied: { label: "Applied", tone: "success" },
  pending: { label: "Waiting", tone: "warning" },
  attention: { label: "Needs attention", tone: "error" },
}

const blockedReasonMessage: Record<string, string> = {
  service_setup_required: "Finish service setup before changing access.",
  service_upgrade_required: "Upgrade the client service before using these controls.",
}

function ServiceControlCard(props: { controls: ServiceControlsView; showHeading?: boolean }) {
  const controls = props.controls
  const sync = syncPresentation[controls.canSave ? controls.syncStatus : "attention"]
  return (
    <Card title={props.showHeading ? `${titleCase(controls.environment)} · ${controls.deploymentName}` : "Service settings"}>
      <div class="section-heading-row">
        <p class="section-description">ERP access and seats allowed for this environment.</p>
        <StatusBadge tone={sync.tone}>{sync.label}</StatusBadge>
      </div>
      {controls.canSave ? (
        <form class="form-grid" method="post" action={`/operator/deployments/${controls.deploymentId}/service-controls`}>
          <fieldset class="module-fieldset">
            <legend>ERP access</legend>
            <label><input type="radio" name="enabled" value="on" checked={controls.enabled === true} required /> On</label>
            <label><input type="radio" name="enabled" value="off" checked={controls.enabled === false} required /> Off</label>
          </fieldset>
          <Field name="seatLimit" label="Seats allowed" type="number" min={1} max={100000} step={1} value={controls.seatLimit ?? ""} required />
          <input type="hidden" name="expectedRevision" value={controls.revision} />
          <div><Button>Save changes</Button></div>
        </form>
      ) : <DataList items={[
        { term: "Access setting", details: controls.enabled === null ? "Not set" : controls.enabled ? "On" : "Off" },
        { term: "Seats allowed", details: controls.seatLimit === null ? "Not set" : String(controls.seatLimit) },
      ]} />}
      {controls.blockedReason ? <p class="notice notice-warning">{blockedReasonMessage[controls.blockedReason] ?? "Service settings need attention before they can be changed."}</p> : null}
      <DataList items={[
        { term: "Usage", details: controls.activeUsers === null ? "Not reported" : `${controls.activeUsers} active users` },
        { term: "Invitations", details: controls.reservedInvitations === null ? "Not reported" : `${controls.reservedInvitations} reserved invitations` },
        { term: "Last connected", details: formatUtc(controls.lastConnectedAt) },
      ]} />
      <p><a class="text-action" href={`/operator/deployments/${controls.deploymentId}/advanced`}>Advanced maintenance</a></p>
    </Card>
  )
}

export function ServiceControlsPage(props: { controls: ServiceControlsView; operatorEmail: string; notice?: ServiceControlsNotice }) {
  const controls = props.controls
  const sync = syncPresentation[controls.canSave ? controls.syncStatus : "attention"]
  return (
    <OperatorLayout title={controls.deploymentName} operatorEmail={props.operatorEmail} breadcrumbs={[
      { label: "Dashboard", href: "/operator" },
      { label: "Clients", href: "/operator/clients" },
      { label: controls.clientName, href: `/operator/clients/${controls.clientId}` },
      { label: controls.deploymentName },
    ]}>
      <PageHeader eyebrow="Service controls" title={controls.deploymentName} description={`${controls.clientName} · ${titleCase(controls.environment)}`} actions={<StatusBadge tone={sync.tone}>{sync.label}</StatusBadge>} />
      <NoticePanel notice={props.notice} />
      <ServiceControlCard controls={controls} />
    </OperatorLayout>
  )
}

export function ClientServicePage(props: { controls: ServiceControlsView[]; operatorEmail: string; notice?: ServiceControlsNotice; clientId?: string; clientName?: string }) {
  const clientName = props.clientName ?? props.controls[0]?.clientName ?? "Client services"
  return (
    <OperatorLayout title={clientName} operatorEmail={props.operatorEmail}>
      <PageHeader eyebrow="Client services" title={clientName} description="Manage ERP access for each environment." actions={props.clientId ? <a class="button-link button-secondary" href={`/operator/clients/${props.clientId}/advanced`}>Advanced setup</a> : undefined} />
      <NoticePanel notice={props.notice} />
      {props.controls.length === 0 ? <p>No service environments are set up yet.</p> : props.controls.map((controls) => (
        <section class="workspace-section" aria-label={`${titleCase(controls.environment)} service controls`}>
          <ServiceControlCard controls={controls} showHeading />
        </section>
      ))}
    </OperatorLayout>
  )
}
