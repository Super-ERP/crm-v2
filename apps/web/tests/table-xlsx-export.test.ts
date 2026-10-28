import {describe,it,expect} from 'vitest'
import ExcelJS from 'exceljs'
import {tableXlsx} from '@/lib/table-controls/export'
import {getTableFields} from '@/lib/table-controls/registry'

describe('Excel current-view export',()=>{
 it('can write a blank workbook when no data columns are requested',async()=>{
  await expect(tableXlsx([],[],'UTC')).resolves.toBeDefined()
 })
 it('round trips visible column order, numeric money, currency and literal text safely',async()=>{
  const fields=getTableFields('payment-milestones',['title','amount','status'])
  const rows=[{title:'=HYPERLINK("bad")',amount:'-120.50',status:'invoiced'}]
  const bytes=await tableXlsx(rows,fields.map(field=>({field,value:(row:typeof rows[number])=>row[field.id as keyof typeof row],currency:()=> 'MYR'})),'UTC')
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes)
  const sheet=workbook.worksheets[0]
  expect(sheet.getRow(1).values).toEqual([undefined,'Title','Amount','Amount currency','Status'])
  expect(sheet.getRow(2).values).toEqual([undefined,'=HYPERLINK("bad")',-120.5,'MYR','Invoiced'])
  expect(sheet.getCell('A2').type).toBe(ExcelJS.ValueType.String)
  expect(sheet.views[0]).toMatchObject({state:'frozen',ySplit:1})
  expect(sheet.autoFilter).toBe('A1:D2')
 })
 it('exports headers with no matching rows and preserves long numeric precision as text',async()=>{
  const field=getTableFields('payment-milestones',['amount'])[0]
  for(const rows of [[],[{amount:'123456789012345678.90'}]]){
   const workbook=new ExcelJS.Workbook()
   await workbook.xlsx.load(await tableXlsx(rows,[{field,value:(row:{amount:string})=>row.amount,currency:()=> 'MYR'}],'UTC'))
   expect(workbook.worksheets[0].getCell('A1').value).toBe('Amount')
   if(rows.length)expect(workbook.worksheets[0].getCell('A2').value).toBe(rows[0].amount)
  }
 })
})
