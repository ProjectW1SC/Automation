'use client';
// Área de documentos desacoplada da navegação geral do escritório.
// Estado e ações permanecem no controlador até a migração para hook de domínio.
import {Download,FileText} from 'lucide-react';
import LegalStationery from './legal-stationery';
import {OFFICE_DOC_TYPES} from '../lib/office-core.mjs';
import {APPEAL_TYPES} from '../lib/legal-draft-engine.mjs';
const dateLabel=d=>{if(!d)return'—';const s=String(d).slice(0,10).split('-');return s.length===3?s.reverse().join('/'):String(d)};
function Source({children}){return <p className="inf-note">{children}</p>}
export default function OfficeDocumentWorkspace({cases,selectedCase,setSelectedCase,docKind,setDocKind,docAppealType,setDocAppealType,docSourceDocument,setDocSourceDocument,sourceInfo,docInstructions,setDocInstructions,useAi,setUseAi,busy,generateDocument,docResult,setDocResult,saveEditedDocument,exportWord,showPreview,setShowPreview,exportPdf,qwenPetitionConsent,setQwenPetitionConsent,askQwenPetition,webGpuAvailable,qwenPetitionStatus,qwenPetitionResult,documents}){
 return (<><div className="office-panel-grid"><section className="inf-panel"><h2>Gerar peça ou petição</h2>
   <form className="office-form-col" onSubmit={generateDocument}>
    <label>Processo cadastrado (opcional)<select value={selectedCase} onChange={e=>setSelectedCase(e.target.value)}><option value="">Peça avulsa — identificar CNJ no documento</option>{cases.map(c=><option key={c.id} value={c.id}>{c.process_number||'Sem CNJ'} · {c.title}</option>)}</select></label>
    <label>Tipo de peça<select value={docKind} onChange={e=>setDocKind(e.target.value)}>{OFFICE_DOC_TYPES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
    {docKind==='recurso'&&<label>Modalidade do recurso (conferir cabimento)<select aria-label="Modalidade recursal" value={docAppealType} onChange={e=>setDocAppealType(e.target.value)}>{APPEAL_TYPES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>}
    <label>Documento judicial de referência (opcional)<textarea aria-label="Documento judicial de referência" value={docSourceDocument} onChange={e=>setDocSourceDocument(e.target.value)} maxLength={40000} rows={7} placeholder="Cole aqui a sentença, decisão ou acórdão. O texto ficará separado da redação da peça."/><small className="office-hint">{docSourceDocument.length.toLocaleString('pt-BR')}/40.000 caracteres · Texto fornecido pelo operador; não confirmado no tribunal.</small></label>
    {sourceInfo&&<div className="office-document-source-check" role="status"><strong>Dados identificados</strong><span>{sourceInfo.cnj||'CNJ não identificado'} · {sourceInfo.docType} · {sourceInfo.claimant||'Partes a conferir'}</span>{sourceInfo.warnings.length>0&&<small>{sourceInfo.warnings.join(' ')}</small>}</div>}
    <label>Objetivo e instruções do advogado<textarea aria-label="Objetivo e instruções do advogado" value={docInstructions} onChange={e=>setDocInstructions(e.target.value)} maxLength={6000} rows={5} placeholder="Informe objetivo, argumentos, capítulos a impugnar e pedidos. Não cole a sentença inteira aqui."/><small className="office-hint">Orientações não serão presumidas como provas; o sistema tenta reconhecer uma sentença colada neste campo.</small></label>
    <label className="office-hint" style={{display:'flex',alignItems:'flex-start',gap:7}}><input style={{width:'auto'}} type="checkbox" checked={useAi} onChange={e=>setUseAi(e.target.checked)}/> Autorizo enviar documento, instruções e dados do processo selecionado ao provedor externo de IA configurado. Sem consentimento, a geração é local.</label>
    <button className="inf-btn primary" disabled={busy}><FileText size={14}/> {busy?'Preparando...':'Gerar e salvar minuta'}</button>
    <Source>A minuta local separa os dados apresentados das lacunas a conferir. Não presume cabimento, prazo, dispositivo nem fundamentação inexistente. Word/PDF não dependem do Qwen.</Source>
   </form></section>
   <section className="inf-panel"><h2>Minuta gerada</h2>{docResult?<><div className="inf-toolbar office-document-controls"><span className="inf-badge">Rascunho · revisão obrigatória</span><button type="button" className="inf-btn" onClick={saveEditedDocument} disabled={busy}>Salvar revisão</button><button type="button" className="inf-btn" onClick={()=>exportWord(docResult.body,docResult.id,docResult.title)}><Download size={14}/> Baixar Word (.docx)</button>
      <button type="button" className="inf-btn" onClick={()=>setShowPreview(x=>!x)}>{showPreview?'Ocultar folha A4':'Visualizar folha A4'}</button>
      <button type="button" className="inf-btn primary" onClick={()=>exportPdf(docResult.body)}>Imprimir / Salvar PDF A4</button></div>
    <textarea className="office-document" aria-label="Texto da minuta" value={docResult.body} onChange={e=>setDocResult({...docResult,body:e.target.value})}/>
     {docResult.evidence?.importedDocument&&<details className="office-original-document"><summary>Ver documento original preservado (não verificado)</summary><pre>{docResult.evidence.sourceDocument}</pre></details>}
     <section className="legal-qwen-panel"><label><input type="checkbox" checked={qwenPetitionConsent} onChange={e=>setQwenPetitionConsent(e.target.checked)}/> Autorizo baixar e executar o Qwen 0.5B local para sugerir ajustes de redação.</label>
      <button type="button" className="inf-btn" disabled={busy||!qwenPetitionConsent||webGpuAvailable===false} onClick={askQwenPetition}>Revisar trecho com Qwen 0.5B</button>
      {webGpuAvailable===false&&<p role="status" className="office-hint">Qwen 0.5B exige WebGPU. Este navegador não o suporta. O editor, Word e PDF permanecem disponíveis.</p>}
       {qwenPetitionStatus&&<p role="status">{qwenPetitionStatus}</p>}
      {qwenPetitionResult&&<div className="legal-qwen-answer"><strong>Sugestão — não aplicada à minuta</strong><p>{qwenPetitionResult}</p><button type="button" onClick={()=>setDocResult(old=>({...old,body:old.body+'\n\n[SUGESTÃO QWEN — REVISAR ANTES DE USAR]\n'+qwenPetitionResult}))}>Inserir sugestão no editor</button></div>}
     </section>
    {showPreview&&<LegalStationery body={docResult.body} title={docResult.title}/>}
    <Source>Edite o texto e clique em Salvar revisão. Advogado responsável deve conferir antes de aprovar ou protocolar.</Source></>:<div className="office-list-empty">Selecione um processo e gere uma minuta para revisão.</div>}</section></div>
   <section className="inf-panel"><h2>Peças registradas</h2><div className="office-records">{documents.map(x=><article className="office-record" key={x.id}><strong>{x.title}</strong><p>{x.kind} · {x.status} · {dateLabel(x.created_at)}</p><div className="office-action-row">
     <button className="inf-btn" onClick={()=>setDocResult({id:x.id,body:x.body,title:x.title,evidence:x.evidence||null,kind:x.kind})}>Abrir minuta</button>
     <button className="inf-btn" onClick={()=>exportWord(x.body,x.id,x.title)}><Download size={13}/> Word (.docx)</button></div></article>)}
    {!documents.length&&<div className="office-list-empty">Nenhuma peça cadastrada.</div>}</div></section>
  </>);
}
