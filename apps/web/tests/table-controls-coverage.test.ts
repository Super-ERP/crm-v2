import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { TABLE_CATALOG, getTableFields } from "@/lib/table-controls/registry"
function files(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(resolve(dir, e.name)) : e.name.endsWith('.tsx') ? [resolve(dir, e.name)] : []) }
describe("registered CRM table coverage", () => {
  it("covers every actual shared table source with explicit field metadata", () => {
    const actual = files(resolve('app')).filter(p => readFileSync(p, 'utf8').includes('<DataTable')).map(p => 'apps/web/' + p.slice(resolve('.').length + 1))
    expect(actual.filter(file => !TABLE_CATALOG.some(entry => entry.file === file))).toEqual([])
    for(const file of actual) {
      const source=readFileSync(resolve(file.replace(/^apps\/web\//,'')),'utf8')
      for(const match of source.matchAll(/\btableId="([^"]+)"/g)) expect(()=>getTableFields(match[1])).not.toThrow()
    }
    for (const entry of TABLE_CATALOG) for (const key of entry.keys) {
      expect(entry.adapters[key as keyof typeof entry.adapters]).toBeTruthy()
      const fields = getTableFields(key, entry.fields)
      expect(fields.map(f => f.id)).toEqual(entry.fields)
      expect(fields.every(f => f.label && f.type)).toBe(true)
    }
  })
  it("rejects arbitrary list keys and fields instead of exposing database names", () => {
    expect(() => getTableFields('private_users', ['password'])).toThrow()
    expect(() => getTableFields('accounts', ['password'])).toThrow()
  })
})
