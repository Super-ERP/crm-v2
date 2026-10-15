import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {createElement} from 'react'
import {StageBadge} from '@/app/(app)/funnel/stage-badge'
it('keeps only one compact code visible and the full stage available accessibly',()=>{
 const html=renderToStaticMarkup(createElement(StageBadge,{name:'0e — Identified',code:'0e',kind:'OPEN',probability:'0'}))
 expect(html).toContain('title="0e — Identified')
 expect(html).toMatch(/>0e<\/span>/)
 expect(html).not.toMatch(/<span[^>]*>0e — Identified/)
})
it('keeps terminal stages readable',()=>{
 expect(renderToStaticMarkup(createElement(StageBadge,{name:'Closed Won',code:'won',kind:'WON'}))).toMatch(/>Won<\/span>/)
})
