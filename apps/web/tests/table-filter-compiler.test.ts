import { expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { compileFilterTree } from '@/server/services/table-controls/compile'
import { getTableFields } from '@/lib/table-controls/registry'
const fields=getTableFields('accounts',['name'])
it('parameterizes literal patterns and never accepts a client field as an SQL name',()=>{
 const tree={kind:'group',id:'r',logic:'or',children:[{kind:'condition',id:'c',fieldId:'name',operator:'contains',value:"%_\\'"}]}
 const result=new PgDialect().sqlToQuery(compileFilterTree(tree,{name:{field:fields[0],expression:sql`a.name`}},{now:new Date(),timezone:'UTC'}))
 expect(result.params).toContain("%\\%\\_\\\\'%")
 expect(result.sql).not.toContain("%_\\'")
 expect(()=>compileFilterTree({...tree,children:[{...tree.children[0],fieldId:'tenant_id'}]},{name:{field:fields[0],expression:sql`a.name`}},{now:new Date(),timezone:'UTC'})).toThrow()
})
