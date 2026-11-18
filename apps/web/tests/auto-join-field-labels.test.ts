import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it,vi} from 'vitest'
vi.mock('@/app/(app)/settings/actions',()=>({updateAutoJoin:vi.fn()}))
import {AutoJoinCard} from '@/app/(app)/settings/security/auto-join-card'
it('connects security role and domain labels to their actual controls',()=>{
 const html=renderToStaticMarkup(createElement(AutoJoinCard,{domains:[],role:'Rep'}))
 for(const name of ['Default role','Allowed email domains']){
  const id=html.match(new RegExp('<label[^>]*for="([^"]+)"[^>]*>\\s*'+name))?.[1]
  expect(id).toBeTruthy()
  expect(html).toContain(`id="${id}"`)
 }
})
