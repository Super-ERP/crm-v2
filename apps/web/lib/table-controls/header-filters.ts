import type {FilterGroup,FilterNode,TableFieldDefinition} from './types'
export function prepareColumnFilter(tree:FilterGroup,field:TableFieldDefinition,id:string):FilterGroup {
 const has=(node:FilterNode):boolean=>node.kind==='condition'?node.fieldId===field.id:node.children.some(has)
 if(has(tree))return tree
 return {...tree,children:[...tree.children,{kind:'condition',id,fieldId:field.id,operator:field.operators[0],value:field.type==='boolean'?true:''}]}
}
export function removeFilterNode(tree:FilterGroup,id:string):FilterGroup {
 return {...tree,children:tree.children.filter(node=>node.id!==id).map(node=>node.kind==='group'?removeFilterNode(node,id):node).filter(node=>node.kind!=='group'||node.children.length>0)}
}
export function describeFilter(node:FilterNode,fields:readonly TableFieldDefinition[]):string {
 if(node.kind==='group')return '('+node.children.map(child=>describeFilter(child,fields)).join(node.logic==='and'?' AND ':' OR ')+')'
 const field=fields.find(field=>field.id===node.fieldId)
 const label=(v:unknown):string=>field?.options?.find(option=>option.value===String(v))?.label??String(v??'')
 const value=Array.isArray(node.value)?node.value.map(label).join(', '):node.value&&typeof node.value==='object'?Object.values(node.value).join(' '):label(node.value)
 return `${field?.label??node.fieldId} ${node.operator.replaceAll('-',' ')}${value?' '+value:''}`
}
export function filterHasField(node:FilterNode,fieldId:string):boolean{return node.kind==='condition'?node.fieldId===fieldId:node.children.some(child=>filterHasField(child,fieldId))}
