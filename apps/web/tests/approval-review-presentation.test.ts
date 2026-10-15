import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it} from 'vitest'
import {ApprovalReviewStatus,ApprovalReviewFrame} from '@/app/(app)/approvals/approval-review-parts'
it('uses the same waiting status and warning tone for all pending workflow names',()=>{
 const render=(status:string)=>renderToStaticMarkup(createElement(ApprovalReviewStatus,{status}))
 expect(render('pending')).toBe(render('pending_approval'))
 expect(render('pending')).toContain('Awaiting approval')
 expect(render('approved')).toContain('text-success')
 expect(render('rejected')).toContain('text-destructive')
 expect(render('draft')).toContain('Draft')
})
it('keeps record navigation and decision controls in one consistent footer outside scrollable evidence',()=>{
 const html=renderToStaticMarkup(createElement(ApprovalReviewFrame,{kind:'quotation',title:'Quote',status:'pending',recordHref:'/quotations/q',recordLabel:'View quotation',actions:createElement('button',null,'Approve quotation')},createElement('p',null,'Decision evidence')))
 expect(html).toContain('data-slot="approval-review-actions"')
 expect(html).toContain('overflow-y-auto')
 expect(html.indexOf('Decision evidence')).toBeLessThan(html.indexOf('View quotation'))
 expect(html.indexOf('View quotation')).toBeLessThan(html.indexOf('Approve quotation'))
})
