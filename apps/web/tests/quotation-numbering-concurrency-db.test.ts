import { readFileSync } from "node:fs"
import path from "node:path"
import { randomBytes, randomUUID } from "node:crypto"
import postgres, { type Sql } from "postgres"
import { sql as query } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { Tx } from "@/db"
import { nextQuoteNumber } from "@/server/services/numbering"

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL
const required = process.env.REQUIRE_QUOTATION_DB_TESTS === "1"
const integration = adminUrl ? describe.sequential : required ? describe.sequential : describe.skip

integration("quotation numbering PostgreSQL boundary", () => {
  let server: Sql
  let sql: Sql
  let databaseName: string
  let db: ReturnType<typeof drizzle>
  const tenantId = `task10-numbering-${process.pid}-${randomBytes(4).toString("hex")}`
  const funnelId = randomUUID()

  beforeAll(async () => {
    if (!adminUrl) throw new Error("Quotation numbering tests require TEST_DATABASE_ADMIN_URL")
    const serverUrl = new URL(adminUrl)
    serverUrl.pathname = "/postgres"
    server = postgres(serverUrl.toString(), { max: 1 })
    databaseName = `crm_task10_numbering_${process.pid}_${randomBytes(4).toString("hex")}`
    await server.unsafe(`CREATE DATABASE "${databaseName}"`)

    const targetUrl = new URL(adminUrl)
    targetUrl.pathname = `/${databaseName}`
    sql = postgres(targetUrl.toString(), { max: 4 })
    db = drizzle(sql)
    await sql.unsafe(`
      CREATE TABLE "funnels" (
        "id" uuid PRIMARY KEY,
        "quote_running_number" integer,
        "tenant_id" text,
        "deleted_at" timestamp with time zone,
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE TABLE "tenant_settings" (
        "organization_id" text PRIMARY KEY,
        "quote_next_number" integer NOT NULL,
        "quote_pad_width" integer,
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE TABLE "quotations" (
        "id" uuid PRIMARY KEY,
        "funnel_id" uuid NOT NULL,
        "quote_number" text NOT NULL UNIQUE,
        "version" integer NOT NULL,
        "tenant_id" text NOT NULL DEFAULT 'boundary',
        "created_at" timestamp with time zone NOT NULL,
        "deleted_at" timestamp with time zone
      )
    `)
    await sql.unsafe(`CREATE UNIQUE INDEX quotations_funnel_version_uq ON quotations(funnel_id,version)`)
    const legacyIds=[randomUUID(),randomUUID()]
    for (const [i,id] of legacyIds.entries()) {
      await sql`INSERT INTO quotations(id,funnel_id,quote_number,version,created_at) VALUES (${id},${randomUUID()},${`Q-SMP-000${i+1}`},1,now())`
    }
    await sql.unsafe(readFileSync(path.join(process.cwd(),'db/migrations/0101_quotation_series.sql'),'utf8'))
    expect(await sql`SELECT quote_number,series_key FROM quotations ORDER BY quote_number`).toEqual([
      {quote_number:'Q-SMP-0001',series_key:'Q-SMP-0001'}, {quote_number:'Q-SMP-0002',series_key:'Q-SMP-0002'},
    ])
    await sql`INSERT INTO "funnels" ("id", "tenant_id") VALUES (${funnelId}, ${tenantId})`
    await sql`
      INSERT INTO "tenant_settings" ("organization_id", "quote_next_number", "quote_pad_width")
      VALUES (${tenantId}, 100, 4)
    `
  }, 30_000)

  afterAll(async () => {
    await sql?.end()
    if (databaseName && server) {
      await server.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    }
    await server?.end()
  }, 30_000)

  it("allocates distinct versions and quote numbers under transaction contention", async () => {
    let releaseFirst!: () => void
    const firstHeld = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    let firstAllocated!: () => void
    const firstAllocatedPromise = new Promise<void>((resolve) => {
      firstAllocated = resolve
    })

    const ctx = { tenantId } as Parameters<typeof nextQuoteNumber>[1]
    const first = db.transaction(async (tx) => {
      const allocation = await nextQuoteNumber(tx as unknown as Tx, ctx, funnelId)
      firstAllocated()
      await tx.execute(query`INSERT INTO "quotations" ("id", "funnel_id", "quote_number", "version", "series_key", "created_at") VALUES (${randomUUID()}, ${funnelId}, ${allocation.quoteNumber}, ${allocation.version}, ${allocation.seriesKey}, now())`)
      await firstHeld
      return allocation
    })
    await Promise.race([firstAllocatedPromise, first.then(() => undefined)])

    const second = db.transaction(async (tx) => {
      const allocation = await nextQuoteNumber(tx as unknown as Tx, ctx, funnelId)
      await tx.execute(query`INSERT INTO "quotations" ("id", "funnel_id", "quote_number", "version", "series_key", "created_at") VALUES (${randomUUID()}, ${funnelId}, ${allocation.quoteNumber}, ${allocation.version}, ${allocation.seriesKey}, now())`)
      return allocation
    })
    const secondFinishedBeforeCommit = await Promise.race([
      second.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 100)),
    ])
    expect(secondFinishedBeforeCommit).toBe(false)

    releaseFirst()
    const [firstResult, secondResult] = await Promise.all([first, second])
    expect(firstResult.version).toBe(1)
    expect(secondResult.version).toBe(2)
    expect(firstResult.quoteNumber).not.toBe(secondResult.quoteNumber)

    const rows = await sql`
      SELECT "quote_number", "version"
      FROM "quotations"
      WHERE "funnel_id" = ${funnelId}
      ORDER BY "version"
    `
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.version)).toEqual([1, 2])
    expect(new Set(rows.map((row) => row.quote_number)).size).toBe(2)
    expect(await sql`SELECT "quote_running_number", "quote_next_number" FROM "funnels" CROSS JOIN "tenant_settings" WHERE "funnels"."id" = ${funnelId} AND "tenant_settings"."organization_id" = ${tenantId}`)
      .toEqual([{ quote_running_number: 100, quote_next_number: 101 }])
  }, 30_000)
  it("reserves deleted versions and running numbers even after all quotes are deleted", async () => {
    await sql`UPDATE quotations SET deleted_at = now() WHERE funnel_id = ${funnelId}`
    const ctx = { tenantId } as Parameters<typeof nextQuoteNumber>[1]
    const next = await db.transaction(async (tx) => {
      const allocation = await nextQuoteNumber(tx as unknown as Tx, ctx, funnelId)
      await tx.execute(query`INSERT INTO quotations (id, funnel_id, quote_number, version, series_key, created_at) VALUES (${randomUUID()}, ${funnelId}, ${allocation.quoteNumber}, ${allocation.version}, ${allocation.seriesKey}, now())`)
      return allocation
    })
    expect(next.version).toBe(3)
    expect(next.quoteNumber).toMatch(/-3$/)
    expect(await sql`SELECT quote_running_number FROM funnels WHERE id = ${funnelId}`)
      .toEqual([{ quote_running_number: 100 }])
    expect(await sql`SELECT count(*)::int AS count FROM quotations WHERE funnel_id = ${funnelId} AND deleted_at IS NOT NULL`)
      .toEqual([{ count: 2 }])
    const otherFunnel = randomUUID()
    await sql`INSERT INTO funnels (id,tenant_id) VALUES (${otherFunnel},${tenantId})`
    const other = await db.transaction((tx) => nextQuoteNumber(tx as unknown as Tx, ctx, otherFunnel))
    expect(other.version).toBe(1)
    expect(await sql`SELECT quote_running_number FROM funnels WHERE id = ${otherFunnel}`)
      .toEqual([{ quote_running_number: 101 }])
  })

  it("creates independent same-funnel series and revises only the selected series", async () => {
    const ctx = {tenantId} as Parameters<typeof nextQuoteNumber>[1]
    const fresh = await db.transaction(async tx => {
      const result=await nextQuoteNumber(tx as unknown as Tx,ctx,funnelId,{newSeries:true})
      await tx.execute(query`INSERT INTO quotations (id,funnel_id,quote_number,version,series_key,created_at) VALUES (${randomUUID()},${funnelId},${result.quoteNumber},${result.version},${result.seriesKey},now())`)
      return result
    })
    expect(fresh.version).toBe(1)
    expect(fresh.quoteNumber).not.toMatch(/^Q10100-/)
    const revision=await db.transaction(async tx=>{
      const result=await nextQuoteNumber(tx as unknown as Tx,ctx,funnelId,{sourceQuoteNumber:fresh.quoteNumber})
      await tx.execute(query`INSERT INTO quotations (id,funnel_id,quote_number,version,series_key,created_at) VALUES (${randomUUID()},${funnelId},${result.quoteNumber},${result.version},${result.seriesKey},now())`)
      return result
    })
    expect(revision).toEqual({quoteNumber:fresh.quoteNumber.replace(/-1$/,'-2'),version:2,seriesKey:fresh.seriesKey})
    const original=await db.transaction(tx=>nextQuoteNumber(tx as unknown as Tx,ctx,funnelId,{sourceQuoteNumber:'Q10100-1'}))
    expect(original).toEqual({quoteNumber:'Q10100-4',version:4,seriesKey:'Q10100'})
    const defaultSeries=await db.transaction(tx=>nextQuoteNumber(tx as unknown as Tx,ctx,funnelId))
    expect(defaultSeries).toEqual(original)
  })
  it("allocates distinct fresh series concurrently", async()=>{
    const ctx={tenantId} as Parameters<typeof nextQuoteNumber>[1]
    const results=await Promise.all([0,1].map(()=>db.transaction(async tx=>{
      const result=await nextQuoteNumber(tx as unknown as Tx,ctx,funnelId,{newSeries:true})
      await tx.execute(query`INSERT INTO quotations (id,funnel_id,quote_number,version,series_key,created_at) VALUES (${randomUUID()},${funnelId},${result.quoteNumber},${result.version},${result.seriesKey},now())`)
      return result
    })))
    expect(new Set(results.map(row=>row.quoteNumber)).size).toBe(2)
    expect(results.every(row=>row.version===1)).toBe(true)
  })
  it("retains the exact legacy prefix when revising a selected series",async()=>{
    await sql`INSERT INTO quotations (id,funnel_id,quote_number,version,series_key,created_at) VALUES (${randomUUID()},${funnelId},'Q24-0099-7',7,'Q24-0099','2024-01-01')`
    const ctx={tenantId} as Parameters<typeof nextQuoteNumber>[1]
    expect(await db.transaction(tx=>nextQuoteNumber(tx as unknown as Tx,ctx,funnelId,{sourceQuoteNumber:'Q24-0099-7'}))).toEqual({quoteNumber:'Q24-0099-8',version:8,seriesKey:'Q24-0099'})
  })

  it("initializes series on old-style inserts and enforces uniqueness within each series",async()=>{
    const id=randomUUID()
    await sql`INSERT INTO quotations(id,funnel_id,quote_number,version,created_at) VALUES (${id},${funnelId},'Q19998-1',1,now())`
    expect(await sql`SELECT series_key FROM quotations WHERE id=${id}`).toEqual([{series_key:'Q19998'}])
    await expect(sql`INSERT INTO quotations(id,funnel_id,quote_number,version,series_key,created_at) VALUES (${randomUUID()},${funnelId},'different-number',1,'Q19998',now())`).rejects.toMatchObject({code:'23505'})
  })

  it("does not allocate a number for an archived or foreign-tenant funnel", async () => {
    const archived = randomUUID()
    await sql`insert into funnels(id,tenant_id,deleted_at) values (${archived},${tenantId},now())`
    const ctx = { tenantId } as Parameters<typeof nextQuoteNumber>[1]
    await expect(db.transaction(tx => nextQuoteNumber(tx as unknown as Tx, ctx, archived))).rejects.toThrow("Funnel not found")
    await expect(db.transaction(tx => nextQuoteNumber(tx as unknown as Tx, {tenantId:"other"} as typeof ctx, funnelId))).rejects.toThrow("Funnel not found")
  })

})
