/**
 * A resposta 403/429 de fonte judicial não equivale a publicação.
 * Portais oficiais podem exigir CAPTCHA humano. Nunca resolver nem
 * declarar automaticamente que uma proteção foi ultrapassada.
 */
export function classifyOfficialAccess(error){
 const rawStatus=Number(error?.status||error?.statusCode||0);
 const msg=String(error?.message||error?.error||error||'');
 const status=rawStatus||Number(/(?:HTTP\s*|status\s*)?(403|429|503)\b/i.exec(msg)?.[1]||0);
 if(status===403)return 'blocked';
 if(status===429)return 'rate_limited';
 if(/captcha|recaptcha|hcaptcha|verifica[çc][aã]o humana|desafio de seguran[çc]a/i.test(msg))return 'human_verification';
 return 'unavailable';
}

const portals={
 djen:'https://comunica.pje.jus.br/',
 datajud:'https://www.cnj.jus.br/sistemas/datajud/',
 tribunal:'https://www.jus.br/'
};
export function officialAccessHelp(error,source='tribunal'){
 const kind=classifyOfficialAccess(error);
 const manual=['blocked','human_verification'].includes(kind);
 const url=portals[source]||portals.tribunal;
 const messages={
  blocked:'A fonte oficial recusou o acesso (403). O portal poderá exigir uma validação humana. Abra o site oficial, confira as informações e tente novamente depois. Nenhum resultado foi confirmado.',
  human_verification:'O portal oficial solicitou verificação humana (CAPTCHA). Resolva diretamente no próprio site do tribunal, confira o processo e depois tente a consulta novamente. Nenhum resultado foi confirmado.',
  rate_limited:'A fonte oficial limitou as consultas (429). Respeite a pausa antes de tentar novamente; não é necessário resolver CAPTCHA. Nenhum resultado foi confirmado.',
  unavailable:'A fonte oficial está temporariamente indisponível. Tente mais tarde ou faça uma conferência manual no portal. Nenhum resultado foi confirmado.'
 };
 return {kind,confirmed:false,action:manual?'manual_check':'retry_later',url,message:messages[kind]};
}
