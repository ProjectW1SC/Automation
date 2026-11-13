// Adapter de dados verificáveis para o componente TeamReport original do LexisPredict.
// Campos sem fonte nos dados atuais são null (não viram contagem zero fabricada).
const category=x=>String(x?.categoria||'outro');
const distinct=rows=>new Set(rows.map(x=>x?.processo_id).filter(x=>x!=null)).size;
const d=x=>String(x?.data_realizacao||'').slice(0,10);
export function adaptLexisTeamReport({teamStats=[],activities=[],period='mes',bounds={start:'',endExclusive:''}}={}){
 const people=teamStats.map(u=>{
  const items=activities.filter(x=>x.responsavel_auth_user_id===u.auth_user_id);
  const contacts=items.filter(x=>category(x)==='atendimento');
  const internal=items.filter(x=>category(x)!=='atendimento');
  const categories=[...new Set(items.map(category))].map(categoria=>({categoria,registros:items.filter(x=>category(x)===categoria).length})).sort((a,b)=>b.registros-a.registros);
  return {
   userId:u.auth_user_id,nome:u.nome||'Responsável registrado',cargo:u.cargo||null,
   carteira:{total:Number(u.carteira_total||0),ativos:Number(u.carteira_ativos||0),encerrados:Number(u.carteira_encerrados||0)},
   atendimentos:{processos:distinct(contacts),eventos:contacts.length},
   // Sem evidência de edição/encerramento individual neste adaptador. Mostrar "—".
   edicoes:{processos:null,eventos:null},
   encerramentos:{processos:null,eventos:null},
   atividades:{registros:items.length,contato:contacts.length,
    contatosDeclarados:contacts.filter(x=>x.contato_cliente_confirmado===true).length,
    internas:internal.length,processos:distinct(items),categorias:categories,
    recentes:items.slice(0,18).map(x=>({categoria:category(x),titulo:x.titulo||'Atividade registrada',data:d(x),detalhe:x.descricao||'',protocolo:x.protocolo_ref||null,contatoConfirmado:x.contato_cliente_confirmado===true})),
    registrosTotal:u.historico_atividades==null?null:Number(u.historico_atividades),
    processosTotal:null,contatosMarcadosTotal:null,semReferenciaTotal:null},
   trabalho:{registros:internal.length,processos:distinct(internal),entregas:internal.filter(x=>category(x)==='dossie').length,
    verificacoesLote:0,categorias:categories.filter(x=>x.categoria!=='atendimento'),entregasRecentes:[]}
  };
 });
 const end=bounds.endExclusive?new Date(Date.parse(bounds.endExclusive+'T12:00:00Z')-86400000).toISOString().slice(0,10):'';
 return {periodo:period,inicio:bounds.start||'',fim:end,pessoas:people,
  nota:'Dados da organização autenticada no LexisPredict. Atendimentos e atividades: registros oficiais; edições e encerramentos individuais sem informação verificável nesta integração.'};
}
