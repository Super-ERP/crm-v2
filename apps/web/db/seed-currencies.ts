import "dotenv/config"
import { createHash } from "node:crypto"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { and, eq, sql } from "drizzle-orm"
import * as schema from "./schema"

// Additive, repeatable local demo data for the dashboard currency picker.
const tenantId = process.env.DEMO_TENANT_ID?.trim() || "demo-entity"
const examples = [
  { currency: "MYR", amount: "45000.00" },
  { currency: "SGD", amount: "18000.00" },
  { currency: "EUR", amount: "12000.00" },
]

function id(key: string) {
  const hex = createHash("sha256").update(`currency-demo:${tenantId}:${key}`).digest("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Use this seed in local development.")
  const client = postgres(process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/crm", { max: 1 })
  const db = drizzle(client, { schema })
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_tenant', ${tenantId}, true)`)
      const [settings] = await tx.select().from(schema.tenantSettings)
        .where(eq(schema.tenantSettings.organizationId, tenantId)).for("update")
      const [owner] = await tx.select().from(schema.member)
        .where(and(eq(schema.member.organizationId, tenantId), eq(schema.member.id, "sample-mem-s1")))
      const [pipeline] = await tx.select().from(schema.pipelines)
        .where(and(eq(schema.pipelines.tenantId, tenantId), eq(schema.pipelines.isDefault, true)))
      if (!settings || !owner || !pipeline) throw new Error("Run the base and sample seeds first.")
      const [stage] = await tx.select().from(schema.pipelineStages)
        .where(and(eq(schema.pipelineStages.pipelineId, pipeline.id), eq(schema.pipelineStages.code, "0e")))
      if (!stage) throw new Error("The default pipeline needs its initial stage.")
      const currencies = [...new Set([settings.defaultCurrency, ...(settings.currencies ?? []), ...examples.map((example) => example.currency)])]
      await tx.update(schema.tenantSettings).set({ currencies })
        .where(eq(schema.tenantSettings.organizationId, tenantId))
      const year = new Date().getFullYear()
      const [number] = await tx.select({ value: sql<number>`coalesce(max(${schema.opportunities.opportunityNumber}), 0)` })
        .from(schema.opportunities).where(and(eq(schema.opportunities.tenantId, tenantId), eq(schema.opportunities.opportunityYear, year)))
      let nextNumber = Number(number.value)
      for (const { currency, amount } of examples) {
        const accountId = id(`account:${currency}`)
        const opportunityId = id(`opportunity:${currency}`)
        await tx.insert(schema.accounts).values({
          id: accountId, tenantId, name: `${currency} Demo Customer`, code: `DEMO-${currency}`,
          currency, accountType: "client", ownerMemberId: owner.id,
        }).onConflictDoNothing()
        await tx.insert(schema.opportunities).values({
          id: opportunityId, tenantId, accountId, ownerMemberId: owner.id,
          opportunityYear: year, opportunityNumber: ++nextNumber,
          code: `OPP-${year}-${String(nextNumber).padStart(4, "0")}`,
          name: `${currency} Demo Opportunity`, currency,
          totalEstimatedFunnelAmount: amount, estimatedTotalsByCurrency: [{ currency, total: amount }],
        }).onConflictDoNothing()
        await tx.insert(schema.funnels).values({
          id: id(`funnel:${currency}`), tenantId, accountId, opportunityId,
          ownerMemberId: owner.id, pipelineId: pipeline.id, currentStageId: stage.id,
          name: `${currency} Demo Funnel`, currency, estimatedAmount: amount,
          status: "open", expectedCloseDate: `${year}-12-15`,
        }).onConflictDoNothing()
      }
      console.log(`Currency demo ready: ${currencies.join(", ")}`)
    })
  } finally {
    await client.end()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
