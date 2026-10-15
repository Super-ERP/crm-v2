import { expect,it,vi } from 'vitest'
import { TABLE_CATALOG } from '@/lib/table-controls/registry'
import type { ServerContext } from '@/lib/server-context'
const checkModule=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/modules.server',()=>({requireEntitledModule:checkModule}))
import { requireTableAccess,tableAccessRule } from '@/server/services/table-controls/access'
it('defines access for every registered list and rejects fabricated lists',()=>{
 for(const entry of TABLE_CATALOG)for(const key of entry.keys)expect(tableAccessRule(key).permission).toBeTruthy()
 expect(()=>tableAccessRule('private-users')).toThrow('Unknown table')
})
it('requires record permission and optional module entitlement',async()=>{
 await expect(requireTableAccess({can:()=>false} as unknown as ServerContext,'accounts')).rejects.toThrow('FORBIDDEN')
 checkModule.mockRejectedValueOnce(new Error('Module disabled'))
 await expect(requireTableAccess({can:()=>true} as unknown as ServerContext,'projects')).rejects.toThrow('Module disabled')
 expect(checkModule).toHaveBeenCalledWith('projects')
})
