import {buildDjenUrl,normalizeDjen} from './processos-oficiais.mjs';
import {buildDjenSearchURL,parseDjenCandidates} from './djen-generator.mjs';
// Apenas GET público publicado pelo CNJ. Opera no navegador *sob clique explícito*
// quando o IP do servidor não é autorizado. Não usa proxy, captcha ou credenciais privadas.
export async function fetchPublicDjenBrowser(url,fetchImpl=fetch){
 const u=new URL(url);
 if(u.protocol!=='https:'||u.hostname!=='comunicaapi.pje.jus.br'||u.pathname!=='/api/v1/comunicacao')
  throw new Error('Endpoint não pertence à API pública oficial do DJEN.');
 let response;
 try{response=await fetchImpl(u.toString(),{method:'GET',mode:'cors',credentials:'omit',
  headers:{Accept:'application/json'},signal:AbortSignal.timeout(14000),cache:'no-store'})}
 catch(e){throw new Error('O navegador não conseguiu acessar o DJEN (rede ou CORS). Abra o portal oficial e consulte manualmente: '+String(e?.message||'bloqueio'))}
 if(response.status===403)throw new Error('DJEN respondeu 403 ao seu navegador; respeite o bloqueio e utilize o portal oficial.');
 if(response.status===429)throw new Error('DJEN respondeu 429; aguarde o intervalo indicado pelo serviço.');
 if(!response.ok)throw new Error('DJEN respondeu HTTP '+response.status+'; nada foi confirmado.');
 const raw=await response.text();
 if(!raw.trim()||raw.length>2000000||raw.trimStart().startsWith('<'))
  throw new Error('DJEN retornou HTML/resultado não verificável; não foram gerados dados.');
 let payload;try{payload=JSON.parse(raw)}catch{throw new Error('DJEN retornou JSON inválido.')}
 if(!Array.isArray(payload)&&!Array.isArray(payload?.items)&&!Array.isArray(payload?.content))
  throw new Error('Formato da lista do DJEN não foi reconhecido.');
 return payload;
}
export async function browseOfficialDjenNumber({number,start,end,page=1,fetchImpl=fetch}){
 const url=buildDjenUrl(number,{start,end,page});
 const payload=await fetchPublicDjenBrowser(url,fetchImpl);
 const items=normalizeDjen(payload,number),checkedAt=new Date().toISOString();
 return {ok:true,source:'DJEN',found:items.length>0,items,checkedAt,via:'navegador',
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
