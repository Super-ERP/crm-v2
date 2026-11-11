import { PageBody,PageHeader } from '@/components/page-header'
import { requireContext } from '@/lib/server-context'
import { getEntitledModuleMap } from '@/lib/modules.server'
import { VOID_ENTITY_TYPES } from '@/lib/record-void'
import { voidEntityCatalog,canRequestRecordVoid } from '@/server/services/record-void-registry'
import { VoidRecordFinder } from './void-record-finder'
export default async function VoidsPage() {
 const ctx=await requireContext(),modules=await getEntitledModuleMap()
 const types=VOID_ENTITY_TYPES.filter(type=>{const d=voidEntityCatalog[type];return ctx.can(d.view)&&canRequestRecordVoid(ctx,type)&&(!d.module||modules[d.module])})
 return <PageBody><PageHeader title="Void a record" description="Review linked records and request a correction. Nothing is changed until approval."/><VoidRecordFinder types={types}/></PageBody>
}
