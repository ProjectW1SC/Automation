'use client';
import {useEffect,useState} from 'react';
import {Image as ImageIcon,Printer,Scale,Settings2,X} from 'lucide-react';
const storageKey='projectw1sc.legal-stationery-v1';
const basic=Object.freeze({firm:'',lawyer:'',oab:'',state:'',font:'Georgia',size:12,accent:'#5b2639',address:'',logoVisible:true});
const fonts=['Georgia','Times New Roman','Arial','Garamond','Cambria'];
const colour=x=>/^#[0-9a-fA-F]{6}$/.test(x||'')?x:'#5b2639';
const clean=x=>String(x||'').trim().slice(0,180);
export default function LegalStationery({body='',title='' }){
 const [prefs,setPrefs]=useState(basic),[logo,setLogo]=useState(''),[logoName,setLogoName]=useState(''),[problem,setProblem]=useState('');
 useEffect(()=>{try{const p=JSON.parse(localStorage.getItem(storageKey)||'{}');setPrefs({...basic,...Object.fromEntries(Object.entries(p).filter(([k,v])=>Object.hasOwn(basic,k)&&typeof v!=='object'))})}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(prefs))}catch{}},[prefs]);
 useEffect(()=>{try{const saved=localStorage.getItem(storageKey+'.logo');if(saved){setLogo(saved);setLogoName('Logotipo salvo neste aparelho')}}catch{}},[]);
 const update=(key,value)=>setPrefs(old=>({...old,[key]:value}));
 function upload(e){const file=e.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1024*1024){setProblem('Logo deve ser PNG, JPG ou WebP e ter no máximo 1 MB.');return}
  setProblem('');const reader=new FileReader();reader.onload=()=>{const data=String(reader.result||'');setLogo(data);setLogoName(file.name);try{localStorage.setItem(storageKey+'.logo',data)}catch{setProblem('Logotipo exibido, mas o navegador não permitiu salvá-lo neste aparelho.')}};reader.onerror=()=>setProblem('Não foi possível carregar o logotipo.');reader.readAsDataURL(file);
 }
 const font=fonts.includes(prefs.font)?prefs.font:basic.font;
 return <section className="legal-stationery-workspace">
  <div className="legal-design-controls" aria-label="Papel timbrado jurídico">
   <header><Settings2 size={17}/><div><h3>Papel timbrado e assinatura</h3><p>Personalização aplicada à prévia e ao PDF impresso.</p></div></header>
   <div className="legal-design-grid">
    <label>Nome do escritório<input aria-label="Nome do escritório" maxLength={100} value={prefs.firm} onChange={e=>update('firm',e.target.value)}/></label>
    <label>Advogado responsável<input aria-label="Advogado responsável" maxLength={100} value={prefs.lawyer} onChange={e=>update('lawyer',e.target.value)}/></label>
    <label>Número OAB<input aria-label="Número da OAB" maxLength={20} value={prefs.oab} onChange={e=>update('oab',e.target.value.replace(/[^a-z0-9/.-]/gi,''))}/></label>
    <label>UF da OAB<select aria-label="Estado da OAB" value={prefs.state} onChange={e=>update('state',e.target.value)}><option value="">Não informado</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Fonte<select aria-label="Fonte da petição" value={font} onChange={e=>update('font',e.target.value)}>{fonts.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Tamanho da fonte<input aria-label="Tamanho da fonte" type="number" min={10} max={16} value={prefs.size} onChange={e=>update('size',Math.max(10,Math.min(16,Number(e.target.value)||12)))}/></label>
    <label>Cor do timbre<input aria-label="Cor do timbre" type="color" value={colour(prefs.accent)} onChange={e=>update('accent',e.target.value)}/></label>
    <label>Endereço / rodapé<input aria-label="Rodapé do escritório" maxLength={170} value={prefs.address} onChange={e=>update('address',e.target.value)}/></label>
   </div>
   <div className="legal-upload-row"><label className="legal-upload-btn"><ImageIcon size={16}/> Inserir logotipo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/></label>{logo&&<><span>{logoName}</span><button type="button" onClick={()=>{setLogo('');setLogoName('');try{localStorage.removeItem(storageKey+'.logo')}catch{}}} aria-label="Remover logotipo"><X size={16}/></button></>}<span>O logotipo fica neste navegador, sem upload para a nuvem. Para Word, prefira PNG ou JPG.</span></div>
   {problem&&<p role="alert" className="legal-upload-error">{problem}</p>}
  </div>
  <div className="office-document-preview legal-paper" style={{'--legal-ink':colour(prefs.accent),'--legal-font':font,'--legal-size':Number(prefs.size||12)+'pt'}} role="document" aria-label="Prévia A4 da petição em papel timbrado">
   <div className="legal-letterhead">
    {logo&&prefs.logoVisible&&<img src={logo} alt="Logotipo do escritório" className="legal-logo"/>}
    <div className="legal-letterhead-copy"><strong>{clean(prefs.firm)||'ESCRITÓRIO DE ADVOCACIA'}</strong><small>{prefs.address?clean(prefs.address):'PETIÇÃO JURÍDICA · MINUTA PARA REVISÃO'}</small></div>
    <Scale size={28} className="legal-scales"/>
   </div>
   <div className="legal-letter-rule"/>
   <div className="legal-paper-body">{String(body||'')}</div>
   <div className="legal-signature"><div className="legal-signature-line"/><strong>{clean(prefs.lawyer)||'[NOME DO ADVOGADO RESPONSÁVEL]'}</strong><span>{prefs.state&&prefs.oab?'OAB/'+prefs.state+' nº '+prefs.oab:'[INSCRIÇÃO OAB A CONFERIR]'}</span><small>Assinatura tipográfica, sem certificação digital. Revisar antes do protocolo.</small></div>
   <div className="legal-paper-footer">{clean(prefs.firm)||'Escritório de advocacia'}{prefs.address?' · '+clean(prefs.address):''} · Minuta não protocolada</div>
  </div>
 </section>;
}