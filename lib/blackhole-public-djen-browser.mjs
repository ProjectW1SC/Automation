import {requestOfficialJson,djenPageInfo} from '../supabase/functions/_shared/official-http.mjs';
import {buildDjenUrl,normalizeDjen} from './processos-oficiais.mjs';
import {buildDjenSearchURL,parseDjenCandidates} from './djen-generator.mjs';
// Apenas GET público publicado pelo CNJ. Opera no navegador *sob clique explícito*
// quando o IP do servidor não é autorizado. Não usa proxy, captcha ou credenciais privadas.
export async function fetchPublicDjenBrowser(url,fetchImpl=fetch,signal){
 const u=new URL(url);
 if(u.protocol!=='https:'||u.hostname!=='comunicaapi.pje.jus.br'||u.pathname!=='/api/v1/comunicacao')
  throw new Error('Endpoint não pertence à API pública oficial do DJEN.');
 return requestOfficialJson(u.toString(),{method:'GET',mode:'cors',credentials:'omit',headers:{Accept:'application/json'}},
  {source:'djen',page:Number(u.searchParams.get('pagina')||1),fetchImpl,signal});
}

export async function browseOfficialDjenNumber({number,start,end,page=1,fetchImpl=fetch,signal}){
 const url=buildDjenUrl(number,{start,end,page});
 const payload=await fetchPublicDjenBrowser(url,fetchImpl,signal);
 const items=normalizeDjen(payload,number),checkedAt=new Date().toISOString();
 return {ok:true,source:'DJEN',found:items.length>0,items,checkedAt,via:'navegador',hasMore:djenPageInfo(payload,page).hasMore,total:djenPageInfo(payload,page).total,
  notice:items.length?'Publicações retornadas pela API pública no navegador, sujeitas a confirmação no portal.':
  'A consulta do DJEN foi concluída sem publicações nesta janela; outras datas e fontes podem conter registros.'};
}
export async function browseOfficialDjenSearch(input,fetchImpl=fetch){
 const url=buildDjenSearchURL(input);
 const payload=await fetchPublicDjenBrowser(url,fetchImpl);
 const items=parseDjenCandidates(payload,String(input.term));
 return {ok:true,source:'DJEN',items,checkedAt:new Date().toISOString(),via:'navegador',
  notice:items.length?'Publicações encontradas pela API pública DJEN via navegador.':'Sem publicações nesta janela; a ausência não comprova inexistência de processos.'};
}
