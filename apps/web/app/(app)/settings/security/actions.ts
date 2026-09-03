"use server"

import { eq } from "drizzle-orm"
import { db } from "@/db"
import { user } from "@/db/schema"
import { requireContext } from "@/lib/actions"
import { writeOperatorAlert } from "@/server/services/operator-alerts"

export async function enableOwnBreakGlassAccess(): Promise<void> {
  const ctx = await requireContext()
  if (!ctx.isSuperadmin) throw new Error("Only the platform master can enable emergency access")
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ twoFactorEnabled: user.twoFactorEnabled })
      .from(user)
      .where(eq(user.id, ctx.userId))
      .limit(1)
    if (!current?.twoFactorEnabled) throw new Error("Enable multi-factor authentication first")
    await tx
      .update(user)
      .set({ isBreakGlass: true, updatedAt: new Date() })
      .where(eq(user.id, ctx.userId))
  })
  await writeOperatorAlert({
    severity: "warning",
    summary: "Break-glass access enabled",
    source: "security_settings",
    ctx,
  })
}

export async function disableOwnBreakGlassAccess(): Promise<void> {
  const ctx = await requireContext()
  if (!ctx.isSuperadmin) throw new Error("Only the platform master can disable emergency access")
  await db
    .update(user)
    .set({ isBreakGlass: false, updatedAt: new Date() })
    .where(eq(user.id, ctx.userId))
  await writeOperatorAlert({
    severity: "info",
    summary: "Break-glass access disabled",
    source: "security_settings",
    ctx,
  })
}
