"use client"

import {
  MilestonesPanel as SharedMilestonesPanel,
  type MilestoneItemBase,
} from "@/components/milestones-panel"
import {
  createMilestone,
  reorderMilestones,
  updateMilestone,
  type MilestoneItem,
} from "../actions"

export function MilestonesPanel({
  projectId,
  milestones,
  projectValue,
  currency,
  canManage = true,
}: {
  projectId: string
  milestones: MilestoneItem[]
  projectValue: string | null
  currency: string
  /** When false the panel is read-only: no inline edits, status changes,
   * reordering, or add-row (gated on project.update). */
  canManage?: boolean
}) {
  return (
    <SharedMilestonesPanel
      milestones={milestones as MilestoneItemBase[]}
      valueCeiling={projectValue}
      valueCeilingLabel="net project value, ex-tax"
      currency={currency}
      canManage={canManage}
      onCreate={(values) => createMilestone({ projectId, ...values })}
      onUpdate={(id, values) => updateMilestone(id, values)}
      onReorder={(order) => reorderMilestones(projectId, order)}
    />
  )
}
