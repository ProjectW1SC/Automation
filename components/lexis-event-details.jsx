'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {CheckCircle2,ClipboardList,Edit3,ExternalLink,FileText,Gavel} from 'lucide-react';
import PortfolioDialog from './portfolio-dialog';
import {PROCESS_FIELDS,mapLexisProcess,normalizedCnj,validDay} from '../lib/lexis-shared-portfolio.mjs';

const dateLabel=value=>value?String(value).slice(0,10).split('-').reverse().join('/'):'Não informada';
const string=value=>String(value??'').trim();
const safeSource=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null}catch{return null}};
const kinds={retorno:'Retorno',prazo:'Prazo',audiencia:'Audiência',tarefa:'Tarefa'};
const recordLink=(id,action)=>'/processos?processo='+encodeURIComponent(String(id))+'&acao='+encodeURIComponent(action);

export default function LexisEventDetails({event,db,profile,onClose,onSaved,onFinish,busy=false}){
 const empresaId=profile?.empresa_id;
 const [process,setProcess]=useState(null),[loading,setLoading]=useState(Boolean(event.process_id||event.process_number));
 const [notice,setNotice]=useState(''),[saving,setSaving]=useState(false),[manualEdit,setManualEdit]=useState(false);
 const [manual,setManual]=useState({
  title:event.title||'',due_on:event.due_on||'',kind:event.kind||'tarefa',
  priority:event.priority||'normal',responsible:event.responsible||'',notes:event.notes||''
 });
 useEffect(()=>{
  let active=true;
  if(!empresaId){setLoading(false);setNotice('Organização não identificada. Não foi possível consultar os dados do cliente.');return};
  if(!event.process_id&&!normalizedCnj(event.process_number)){setLoading(false);return};
  setLoading(true);setNotice('');
  const resolve=async()=>{
   try{
    const base=db.from('processos').select(PROCESS_FIELDS).eq('empresa_id',empresaId);
    let matches=[];
    if(event.process_id){
     const result=await base.eq('id',event.process_id).limit(2);
     if(result.error)throw result.error;
     matches=result.data||[];
    }else{
     // CNJ exato e único. Nunca inferir um cliente apenas por nome ou título.
     const result=await base.eq('protocolo_ref',event.process_number).limit(2);
     if(result.error)throw result.error;
     matches=result.data||[];
    }
    if(!active)return;
    if(matches.length===1)setProcess(mapLexisProcess(matches[0]));
    else if(matches.length>1)setNotice('Há mais de um processo correspondente. Abra a carteira para identificar o registro correto.');
    else setNotice('Processo não localizado nesta organização. Nenhum cliente foi associado automaticamente.');
   }catch(error){if(active)setNotice('Dados do processo indisponíveis: '+String(error?.message||error))}
   finally{if(active)setLoading(false)}
  };
  resolve();
  return()=>{active=false};
 },[db,empresaId,event.id,event.process_id,event.process_number]);
 async function saveManual(e){
  e.preventDefault();if(saving||!event.manual_id||!empresaId)return;
  if(!string(manual.title)||string(manual.title).length<3){setNotice('Informe um título com pelo menos três caracteres.');return}
  if(!validDay(manual.due_on)){setNotice('Data inválida.');return}
  setSaving(true);setNotice('');
  try{
   const values={title:string(manual.title).slice(0,250),due_on:manual.due_on,kind:manual.kind,
    priority:manual.priority,responsible:string(manual.responsible)||null,notes:string(manual.notes).slice(0,1500)||null};
   const {data,error}=await db.from('office_deadlines').update(values)
    .eq('id',event.manual_id).eq('empresa_id',empresaId).select('id').maybeSingle();
   if(error||!data?.id)throw Error(error?.message||'Banco não confirmou a alteração.');
   setNotice('Compromisso atualizado e confirmado pelo banco.');
   setManualEdit(false);
   await onSaved?.();
  }catch(error){setNotice('Edição não concluída: '+String(error?.message||error))}
  finally{setSaving(false)}
 }
 const cnj=normalizedCnj(process?.process_number);
 const source=safeSource(event.source_url);
 return <PortfolioDialog title={'Detalhes · '+(kinds[event.kind]||'Compromisso')} busy={saving} notice={notice} onClose={onClose}>
  <section aria-label="Informações do compromisso">
   <h3>{event.title}</h3>
   <div className="lx-detail-meta">
    <span>{dateLabel(event.due_on)}{event.hour?' · '+event.hour:''}</span>
    <span>Situação: {event.status_label||event.status||'Não informada'}</span>
    <span>Responsável: {event.responsible||'Não informado'}</span>
   </div>
   {event.notes&&<p>{event.notes}</p>}
   {source&&<p><a href={source} target="_blank" rel="noopener noreferrer" className="inf-btn"><ExternalLink size={14}/> Conferir fonte oficial</a></p>}
  </section>
  {loading&&<p role="status" className="inf-note">Carregando cadastro do processo e informações do cliente...</p>}
  {process&&<section aria-label="Ficha do cliente e processo" className="lx-linked-record">
   <h3>Cliente e processo vinculados</h3>
   <div className="inf-fields">
    <p><strong>Cliente</strong><span>{process.client_name||'Não informado'}</span></p>
    <p><strong>Número CNJ</strong><span>{process.process_number||'Não informado'}</span></p>
    <p><strong>Telefone</strong><span>{process.phone||'Não informado'}</span></p>
    <p><strong>E-mail</strong><span>{process.email||'Não informado'}</span></p>
    <p><strong>Documento</strong><span>{process.cpf||'Não informado'}</span></p>
    <p><strong>Tribunal</strong><span>{process.tribunal||'Não informado'}</span></p>
    <p><strong>Advogado</strong><span>{process.advogado||'Não informado'}</span></p>
    <p><strong>Situação interna</strong><span>{process.status_detail||'Não informada'}</span></p>
    <p><strong>Último atendimento</strong><span>{dateLabel(process.last_attendance)}</span></p>
    <p><strong>Próximo atendimento</strong><span>{dateLabel(process.next_attendance)}</span></p>
    <p><strong>Próximo prazo</strong><span>{dateLabel(process.next_deadline)}</span></p>
   </div>
   {process.observacoes&&<p>{process.observacoes}</p>}
   <div className="inf-row-end lx-dialog-actions" style={{justifyContent:'flex-start',flexWrap:'wrap'}}>
    <Link href={recordLink(process.id,'editar-cliente')} className="inf-btn"><Edit3 size={14}/> Editar cliente</Link>
    <Link href={recordLink(process.id,'editar-processo')} className="inf-btn"><FileText size={14}/> Editar processo</Link>
    <Link href={recordLink(process.id,'atendimento')} className="inf-btn primary"><ClipboardList size={14}/> Registrar atendimento</Link>
    {cnj&&<Link href={recordLink(process.id,'consulta')} className="inf-btn"><Gavel size={14}/> Consultar DJEN / DataJud</Link>}
   </div>
  </section>}
  {!loading&&!process&&<p className="inf-note">Registro sem vínculo processual confirmado. Edição de cliente, atendimento e consulta precisam de um processo localizado na carteira autorizada.</p>}
  {event.manual_id&&<section aria-label="Edição de compromisso manual">
   {event.status!=='encerrado'&&<button type="button" className="inf-btn" disabled={busy||saving} onClick={()=>onFinish?.(event)}><CheckCircle2 size={14}/> Concluir compromisso</button>}
   {!manualEdit?<button type="button" className="inf-btn" onClick={()=>setManualEdit(true)}><Edit3 size={14}/> Editar compromisso manual</button>:
    <form className="lx-form" onSubmit={saveManual}>
     <label>Título<input required minLength={3} maxLength={250} value={manual.title} onChange={e=>setManual({...manual,title:e.target.value})}/></label>
     <label>Data<input type="date" required value={manual.due_on} onChange={e=>setManual({...manual,due_on:e.target.value})}/></label>
     <label>Tipo<select value={manual.kind} onChange={e=>setManual({...manual,kind:e.target.value})}><option value="prazo">Prazo</option><option value="retorno">Retorno</option><option value="tarefa">Tarefa</option><option value="audiencia">Audiência manual</option></select></label>
     <label>Prioridade<select value={manual.priority} onChange={e=>setManual({...manual,priority:e.target.value})}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
     <label>Responsável<input maxLength={140} value={manual.responsible} onChange={e=>setManual({...manual,responsible:e.target.value})}/></label>
     <label>Observações<textarea maxLength={1500} value={manual.notes} onChange={e=>setManual({...manual,notes:e.target.value})}/></label>
     <div className="lx-dialog-actions"><button className="inf-btn primary" disabled={saving} type="submit">Salvar alterações</button><button className="inf-btn" type="button" disabled={saving} onClick={()=>setManualEdit(false)}>Cancelar</button></div>
    </form>}
  </section>}
  <div className="lx-dialog-actions"><button type="button" className="inf-btn" disabled={saving} onClick={onClose}>Fechar detalhes</button></div>
 </PortfolioDialog>;
}
