import { describe, expect, it } from "vitest"
import { activeRecordOwnerIds } from "@/db/import/active-record-owners"

describe("active import owners", () => {
  it("selects owners of retained business records only", () => {
    const owners = activeRecordOwnerIds({
      Account: { headers: [], rows: [{ Id: "a", OwnerId: "rep" }, { Id: "b", OwnerId: "deleted", IsDeleted: "true" }] },
      Quote: { headers: [], rows: [{ Id: "q", OwnerId: "quote-rep", IsDeleted: "false" }] },
      Product2: { headers: [], rows: [{ Id: "p", OwnerId: "catalog-admin" }] },
    })
    expect([...owners].sort()).toEqual(["quote-rep", "rep"])
  })
})
