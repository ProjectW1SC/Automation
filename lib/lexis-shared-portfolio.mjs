// Adaptador isolado do INFINITUM para o Supabase principal do LexisPredict.
// Preserva as colunas judiciais e NÃO transforma uma exclusão de interface em DELETE físico.
const STATUS=new Set(['ativo','em_andamento','suspenso','encerrado','excluido']);
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const CNJ=/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
const clean=x=>String(x??'').trim();
export function validDay(value){
 if(!DATE.test(clean(value)))return false;
 const d=new Date(value+'T12:00:00.000Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function normalizedCnj(value){
 const v=clean(value);
 if(CNJ.test(v))return v;
 const d=v.replace(/\D/g,'');
 if(!/^\d{20}$/.test(d))return null;
 return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16)}`;
}
export function mapLexisProcess(row={}){
 const d=row.dados&&typeof row.dados==='object'&&!Array.isArray(row.dados)?row.dados:{};
 const raw=clean(row.protocolo_ref||d.protocolo||d.numero_processo);
 const status=clean(row.status_interno).toLowerCase();
 return {
  id:row.id??null, empresa_id:row.empresa_id??null,
  process_number:normalizedCnj(raw)||raw||null,
  client_name:clean(row.cliente||d.cliente)||null,
  phone:row.telefone??d.telefone??null, email:row.email??null,
  cpf:row.cpf??null, tribunal:row.tribunal??d.tribunal??null,
  advogado:row.advogado??d.advogado??null, status:STATUS.has(status)?status:'ativo',
  court_status:row.status??d.status??null, observacoes:row.observacoes??null,
  last_attendance:row.ultimo_retorno??d.ultimoRetorno??null,
  next_attendance:row.proximo_retorno??null,
  last_responsible:row.atendido_por??d.atendido_por??null,
  updated_at:row.updated_at??null
 };
}
export function resolveCompanyAccess(profiles,authUserId){
 const matches=(profiles||[]).filter(x=>x.auth_user_id===authUserId&&x.empresa_id&&x.nome);
 return matches.length===1?matches[0]:null;
}
export function belongsToCompany(profile,row){
 return !!profile?.empresa_id&&!!row?.empresa_id&&profile.empresa_id===row.empresa_id;
}
export function portfolioUpdate(values={}){
 const allowed=['cliente','telefone','email','cpf','tribunal','advogado','observacoes','proximo_retorno','status_interno'];
 const out={};
 for(const field of allowed){
  if(!Object.prototype.hasOwnProperty.call(values,field))continue;
  const raw=values[field];
  if(field==='status_interno'){
   const value=clean(raw);
   if(!STATUS.has(value))throw new Error('Situação inválida: não altera o andamento judicial oficial.');
   out[field]=value;continue;
  }
  if(field==='proximo_retorno'){
   if(raw&& !validDay(raw))throw new Error('Data do próximo atendimento inválida.');
   out[field]=raw||null;continue;
  }
  const v=clean(raw);
  const limit=field==='observacoes'?4000:field==='cliente'?180:field==='email'?160:140;
  if(v.length>limit)throw new Error('Campo '+field+' excede o limite.');
  out[field]=v||null;
 }
 if(Object.prototype.hasOwnProperty.call(out,'cliente')&&!out.cliente)throw new Error('O nome do cliente não pode ficar vazio.');
 return out;
}
export function dailyAttendanceSummary(rows=[],profiles=[]){
 const people=new Map((profiles||[]).map(p=>[p.auth_user_id,p.nome||'Responsável não informado']));
 const valid=(rows||[]).filter(r=>r?.categoria==='atendimento'&&validDay(String(r.data_realizacao||'').slice(0,10))&&r.responsavel_auth_user_id);
 const counts=new Map(),days=new Map();
 for(const r of valid){
  const k=r.responsavel_auth_user_id;
  counts.set(k,(counts.get(k)||0)+1);
  const d=String(r.data_realizacao).slice(0,10);days.set(d,(days.get(d)||0)+1);
 }
 return {total:valid.length,uniqueProcesses:new Set(valid.map(r=>r.processo_id).filter(x=>x!=null)).size,
  byUser:[...counts].map(([id,count])=>({id,name:people.get(id)||'Responsável não identificado',count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')),
  byDay:[...days].map(([day,count])=>({day,count})).sort((a,b)=>a.day.localeCompare(b.day))};
}
export const PROCESS_FIELDS='id,empresa_id,cliente,telefone,email,cpf,protocolo_ref,tribunal,advogado,status,status_interno,ultimo_retorno,proximo_retorno,atendido_por,observacoes,updated_at';
export function processSearchField(type){return type==='numero'?'protocolo_ref':type==='tribunal'?'tribunal':'cliente';}
export function likeTerm(value){
 // Usado em PostgREST ilike(coluna, valor). Não construir filtros `.or()` a partir de texto livre.
 return '%'+clean(value).replace(/[\\%_]/g,m=>'\\'+m).slice(0,100)+'%';
}
