// A navegação do CRM é única. As filas são filtros internos da aba Tarefas.
export const CRM_AREAS=Object.freeze([
 {label:'Visão geral',key:'visao',path:'/'},
 {label:'Tarefas',key:'tarefas',path:'/tarefas'},
 {label:'Clientes',key:'clientes',path:'/?aba=clientes'},
 {label:'Revisar',key:'revisar',path:'/?aba=revisar'},
 {label:'Instituições',key:'instituicoes',path:'/?aba=instituicoes'}
]);
export function crmAreaHref(label){
 return CRM_AREAS.find(x=>x.label===label)?.path||'/';
}
export function areaFromQuery(query=''){
 const p=new URLSearchParams(String(query).replace(/^\?/,''));
 return CRM_AREAS.find(x=>x.key===p.get('aba') && x.key!=='tarefas')?.label||'Visão geral';
}
