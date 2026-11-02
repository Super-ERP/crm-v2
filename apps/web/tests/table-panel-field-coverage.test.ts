import { describe,it,expect } from 'vitest'
import ts from 'typescript'
import {TABLE_CATALOG,getTableFields,getAvailableTableFields} from '@/lib/table-controls/registry'
describe('concrete table panel columns',()=>{
 it('recognises every statically declared column in each panel, including union-catalogue panels',()=>{
  const missing:string[]=[]
  for(const entry of TABLE_CATALOG){
   const file=entry.file.replace('apps/web/','')
   const program=ts.createProgram([file],{noResolve:true,jsx:ts.JsxEmit.Preserve,noLib:true})
   const source=program.getSourceFile(file)!,checker=program.getTypeChecker()
   function visit(node:ts.Node){
    if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(source)==='DataTable'){
     const attrs=node.attributes.properties.filter(ts.isJsxAttribute)
     const key=attrs.find(a=>a.name.getText(source)==='tableId')?.initializer
     const expr=attrs.find(a=>a.name.getText(source)==='columns')?.initializer
     if(key&&ts.isStringLiteral(key)&&expr&&ts.isJsxExpression(expr)&&expr.expression){
      const declaration=checker.getSymbolAtLocation(expr.expression)?.valueDeclaration
      const init=declaration&&ts.isVariableDeclaration(declaration)?declaration.initializer:expr.expression
      const ids:string[]=[]
      function columns(n:ts.Node){
       if(ts.isObjectLiteralExpression(n)&&n.properties.some(p=>p.name?.getText(source)==='header')){
        const prop=n.properties.find(p=>['id','accessorKey'].includes(p.name?.getText(source)??''))
        if(prop&&ts.isPropertyAssignment(prop)&&ts.isStringLiteral(prop.initializer)){
         ids.push(prop.initializer.text)
         try{getTableFields(key!.getText(source).slice(1,-1),[prop.initializer.text])}catch{missing.push(`${key!.getText(source)}.${prop.initializer.text} (${file})`)}
        }
       }
       ts.forEachChild(n,columns)
      }
      if(init)columns(init)
      if(ids.length)for(const field of getAvailableTableFields(key.text,ids))if(!ids.includes(field.id))expect(field.defaultVisible,`${key.text}.${field.id}`).toBe(false)
     }
    }
    ts.forEachChild(node,visit)
   }
   visit(source)
  }
  expect(missing).toEqual([])
 })
})
