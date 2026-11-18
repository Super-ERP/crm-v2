"use client"

import { LocationCatalogueSettings } from "@/components/location-catalogue-settings"
import { PicklistCard } from "@/components/picklist-card"
import {
  updateIndustries,
  updateLeadSources,
  updateLossReasons,
  type TenantSettingsView,
} from "@/app/(app)/settings/actions"
import { DEFAULT_LEAD_SOURCES, DEFAULT_LOSS_REASONS } from "@/lib/tenant-defaults"

// ─── Industries — a plain PicklistCard instance (standard chip-list CRUD) ────

function IndustriesCard({ industries }: { industries: string[] }) {
  return (
    <PicklistCard
      title="Industries"
      description="Industry picklist offered on accounts."
      items={industries}
      defaults={[]}
      placeholder="e.g. Banking"
      save={updateIndustries}
    />
  )
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export function IndustriesClient({ settings }: { settings: TenantSettingsView }) {
  return (
    <div className="grid gap-4">
      <IndustriesCard industries={settings.industries} />
      <LocationCatalogueSettings />
      <div className="grid gap-4 lg:grid-cols-2">
        <PicklistCard
          title="Lead sources"
          description="Where a lead came from — offered in the lead form so sources stay consistent for reporting."
          items={settings.leadSources}
          defaults={DEFAULT_LEAD_SOURCES}
          placeholder="e.g. Webinar"
          save={updateLeadSources}
        />
        <PicklistCard
          title="Loss / disqualify reasons"
          description="Offered when disqualifying a lead (and available for lost-deal analysis)."
          items={settings.lossReasons}
          defaults={DEFAULT_LOSS_REASONS}
          placeholder="e.g. No budget"
          save={updateLossReasons}
        />
      </div>
    </div>
  )
}
