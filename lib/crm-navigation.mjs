// A navegação do CRM é única. As filas são filtros internos da aba Tarefas.
export const CRM_AREAS=Object.freeze([
 {label:'Visão geral',key:'visao',path:'/'},
 {label:'Tarefas',key:'tarefas',path:'/tarefas'},
 {label:'Clientes',key:'clientes',path:'/?aba=clientes'},
 {label:'Finalizados',key:'finalizados',path:'/?aba=finalizados'},
 {label:'Instituições',key:'instituicoes',path:'/?aba=instituicoes'},
 {label:'Minhas atividades',key:'minhas-atividades',path:'/minhas-atividades'}
]);
export function crmAreaHref(label){
 return CRM_AREAS.find(x=>x.label===label)?.path||'/';
}
export function areaFromQuery(query=''){
 const p=new URLSearchParams(String(query).replace(/^\?/,''));
 const key=p.get('aba')==='revisar'?'finalizados':p.get('aba');
 return CRM_AREAS.find(x=>x.key===key && x.key!=='tarefas')?.label||'Visão geral';
}
