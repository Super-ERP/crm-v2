import {it,expect,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {createElement} from 'react'
vi.mock('next/navigation',()=>({usePathname:()=>'/accounts',useSearchParams:()=>new URLSearchParams('account-pipelines_filter_v2=broken')}))
vi.mock('@/app/(app)/_shared/table-preference-actions',()=>({readTablePreferences:async()=>null,saveTablePreferences:async()=>({ok:true})}))
vi.mock('@/components/saved-view-menu',()=>({SavedViewMenu:()=>null}))
import {DataTable} from '@/components/data-table'
it('offers Reset when an invalid URL hides column-header filter controls',()=>{
 const html=renderToStaticMarkup(createElement(DataTable,{columns:[{accessorKey:'name',header:'Name'}],data:[],tableId:'account-pipelines',savedViews:false}))
 expect(html).toContain('Edit or clear the filters')
 expect(html).toMatch(/<button[^>]*>[\s\S]*?Reset<\/button>/)
})
