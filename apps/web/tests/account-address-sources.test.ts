import {it,expect} from 'vitest'
import {recoverAccountAddressSources} from '@/db/import/account-address-history'
const c=(id:string,account:string,address:string)=>({Id:id,AccountId:account,Bill_To__c:address,IsDeleted:'false'})
it('recovers an exact account-linked contract address and keeps provenance',()=>{
 expect(recoverAccountAddressSources([],[c('c1','a','12 Jalan Utama\n43000 Kajang'),c('c2','a','12 Jalan Utama 43000 Kajang')]).ready).toEqual([{sourceAccountId:'a',address:{line1:'12 Jalan Utama\n43000 Kajang'},historyIds:[],contractIds:['c1','c2']}])
})
it('quarantines conflicting contract addresses, incomplete addresses and deleted records',()=>{
 const r=recoverAccountAddressSources([],[c('c1','a','12 Jalan A'),c('c2','a','22 Jalan B'),c('c3','b','81310 Johor Bahru, Malaysia'),{...c('c4','d','12 Jalan A'),IsDeleted:'true'}])
 expect(r.ready).toEqual([]);expect(r.review.map(r=>r.sourceAccountId).sort()).toEqual(['a','b'])
})
it('does not replace cleared or conflicting history with a contract fallback',()=>{
 const h=(id:string,value:string)=>({Id:id,AccountId:'a',Field:'BillingStreet',NewValue:value,CreatedDate:'2026-01-01T00:00:00Z'})
 expect(recoverAccountAddressSources([h('h1','')],[c('c','a','12 Jalan A')]).ready).toEqual([])
 expect(recoverAccountAddressSources([h('h1','12 Jalan A'),h('h2','22 Jalan B')],[c('c','a','12 Jalan A')]).ready).toEqual([])
})
