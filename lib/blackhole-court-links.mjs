// Diretório dos links oficiais de sessão/plenário já cadastrados no LexisPredict.
// Estas são páginas públicas, NÃO APIs não autenticadas de autos/peticionamento.
const keys=Object.freeze([
 'TJRO_SESSOES_URL','TJAC_SESSOES_URL','TJAL_SESSOES_URL','TJAM_PAUTAS_URL',
 'TJBA_SESSOES_URL','TJDFT_SESSOES_URL','TJGO_SESSOES_URL','TJGO_PAUTAS_URL',
 'TJMA_PLENARIO_VIRTUAL_URL','TJMG_SESSOES_URL','TJMS_SESSOES_URL',
 'TJMT_PLENARIO_VIRTUAL_URL','TJMT_PAUTAS_URL','TJPA_SESSOES_URL',
 'TJPB_SESSOES_URL','TJPE_PLENARIO_VIRTUAL_URL','TJPI_PLENARIO_VIRTUAL_URL',
 'TJPR_SESSOES_URL','TJRJ_SESSOES_URL','TJRN_PLENARIO_VIRTUAL_URL',
 'TJRR_SESSOES_URL','TJSC_SESSOES_URL','TJSE_SESSOES_URL',
 'TJSP_SESSOES_URL','TJCE_PLENARIO_VIRTUAL_URL','TJCE_PLENARIO_PAUTAS_URL',
 'CNJ_PLENARIO_VIRTUAL_URL','CNJ_PLENARIO_PAUTAS_URL'
]);
export const OFFICIAL_COURT_SOURCE_KEYS=keys;
export function validatePublicCourtURL(raw){
 if(typeof raw!=='string'||raw.length>700)return null;
 let url;try{url=new URL(raw)}catch{return null}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port||!(/(^|\.)jus\.br$|(^|\.)gov\.br$/.test(host)))
  return null;
 return url.href;
}
export function configuredCourtSources(env={}){
 return keys.map(key=>{
  const url=validatePublicCourtURL(env[key]);
  if(!url)return null;
  const [court,...parts]=key.replace(/_URL$/,'').split('_');
  const kind=parts.join('_').toLowerCase().includes('virtual')?'Plenário virtual':
   parts.includes('PAUTAS')?'Pautas públicas':'Sessões públicas';
  return {id:key,court,kind,label:court+' · '+kind,url};
 }).filter(Boolean);
}
