import Link from "next/link"
import { listRelatedProjectCodes } from "@/app/(app)/_shared/project-code-actions"
import { ProjectCodePanel } from "@/app/(app)/_shared/project-code-panel"
import { notFound } from "next/navigation"

import { PageBody } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import { requireContext } from "@/lib/server-context"
import { PERMISSIONS } from "@/lib/permissions"
import { listAccountOptions } from "@/lib/lookups"
import { listEntityTimeline } from "../../_shared/activity-actions"
import { listEntityDocuments } from "../../_shared/attachment-actions"
import { getPerson } from "../actions"
import { PersonEditButton } from "./person-edit-button"
import { PersonDetailBody, type PersonDetailSection } from "./person-detail-body"

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [data, accounts, ctx] = await Promise.all([
    getPerson(id),
    listAccountOptions(),
    requireContext(),
  ])

  if (!data) notFound()
  const projectCodes = ctx.can(PERMISSIONS.OPPORTUNITY_VIEW) ? await listRelatedProjectCodes("person", id) : null
  const { person, accountName, funnels, projects } = data

  const [activity, documents] = await Promise.all([
    listEntityTimeline("person", id),
    listEntityDocuments("person", id),
  ])

  // Salesforce-named field section (SPEC §7): a single "Contact Information"
  // section grouping the contact's own fields. Only fields already fetched are
  // included.
  const contactInformation: PersonDetailSection["fields"] = [
    { label: "First name", value: person.firstName, editKey: "firstName" },
    { label: "Last name", value: person.lastName ?? "—", editKey: "lastName" },
    { label: "Designation", value: person.title ?? "—", editKey: "title" },
    { label: "Department", value: person.department ?? "—", editKey: "department" },
    {
      label: "Email",
      editKey: "email",
      value: person.email ? (
        <a
          href={`mailto:${person.email}`}
          className="link"
        >
          {person.email}
        </a>
      ) : (
        "—"
      ),
    },
    { label: "Phone", value: person.phone ?? "—", editKey: "phone" },
    {
      label: "Account",
      editKey: "accountId",
      value: person.accountId ? (
        <Link
          href={`/accounts/${person.accountId}`}
          className="link"
        >
          {accountName ?? "—"}
        </Link>
      ) : (
        "—"
      ),
    },
    {
      label: "Primary",
      editKey: "isPrimary",
      value: person.isPrimary ? (
        <Badge variant="secondary">Primary</Badge>
      ) : (
        "—"
      ),
    },
    { label: "Created", value: formatDate(person.createdAt) },
  ]

  const sections: PersonDetailSection[] = [
    { title: "Contact Information", fields: contactInformation },
  ]

  // Raw snapshot for the inline editors — updatePerson is full-replace, so
  // the client merges the one edited field into this.
  const record = {
    accountId: person.accountId,
    firstName: person.firstName,
    lastName: person.lastName,
    title: person.title,
    department: person.department,
    email: person.email,
    phone: person.phone,
    isPrimary: person.isPrimary,
  }

  return (
    <>
      <PageBody>
        <div className="flex justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <PersonEditButton person={person} accounts={accounts} />
          </div>
        </div>

        <PersonDetailBody
          projectCodes={projectCodes ? <ProjectCodePanel kind="person" recordId={id} initialPage={projectCodes} /> : null}
          projectCodeCount={projectCodes?.total}
          personId={id}
          sections={sections}
          record={record}
          canEdit={ctx.can(PERMISSIONS.PERSON_UPDATE)}
          accounts={accounts}
          funnels={funnels}
          projects={projects}
          activity={activity}
          documents={documents}
        />
      </PageBody>
    </>
  )
}
