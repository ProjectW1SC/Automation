// Domínios oficiais conhecidos. Nunca buscar um ícone por texto livre do cadastro.
export const INSTITUTION_BRANDS=Object.freeze([
 {name:'Itaú',domain:'itau.com.br',aliases:['itau','banco itau','itau unibanco','itau unibanco sa','itau financiamentos']},
 {name:'Bradesco',domain:'bradesco.com.br',aliases:['bradesco','banco bradesco','bradesco financiamentos','bradesco sa']},
 {name:'Santander',domain:'santander.com.br',aliases:['santander','banco santander','santander financiamentos','aymore','aymore credito financiamento investimento']},
 {name:'Caixa',domain:'caixa.gov.br',aliases:['caixa','caixa economica','caixa economica federal','cef']},
 {name:'Banco do Brasil',domain:'bb.com.br',aliases:['banco do brasil','bb banco']},
 {name:'Banco PAN',domain:'bancopan.com.br',aliases:['pan','banco pan','banco panamericano','panamericano']},
 {name:'Banco BV',domain:'bancobv.com.br',aliases:['bv','banco bv','banco votorantim','votorantim']},
 {name:'Banco BMG',domain:'bancobmg.com.br',aliases:['bmg','banco bmg']},
 {name:'Banco Daycoval',domain:'bancodaycoval.com.br',aliases:['daycoval','banco daycoval']},
 {name:'C6 Bank',domain:'c6bank.com.br',aliases:['c6','c6 bank','banco c6']},
 {name:'Safra',domain:'safra.com.br',aliases:['safra','banco safra','safra financeira']},
 {name:'Banco Inter',domain:'inter.co',aliases:['inter','banco inter']},
 {name:'Nubank',domain:'nubank.com.br',aliases:['nubank','nu pagamentos','nu financeira']},
 {name:'Banco Mercantil',domain:'bancomercantil.com.br',aliases:['mercantil','banco mercantil','mercantil do brasil']},
 // Official company websites verified; never assign unrelated logos to generic names.
 {name:'Creditas',domain:'creditas.com',aliases:['creditas','creditas financeira','creditas solucoes financeiras']},
 {name:'Banco Digi+',domain:'bancodigimais.com.br',aliases:['digi','digi mais','digi+','banco digi+','banco digimais','banco digi mais']},
 {name:'JA Assessoria',domain:'jaassessoria.com.br',aliases:['assessoria j.a','assessoria ja','assessoria j a','ja assessoria','j a assessoria']},
 {name:'Bruno Vanderlei Advogados',domain:'brunovanderlei.adv.br',aliases:['bruno vanderlei','bruno vanderlei advogados','bruno vanderlei advogados associados']},
 {name:'Cardoso & Corrêa',domain:'cardosoecorrea.com.br',aliases:['cardoso correa','cardoso e correa','cardoso & correa','cardoso correa advogados']},
 {name:'Alfa Assessoria',domain:'alfaassessoria.com',aliases:['alfa','alfa assessoria','alfa assessoria ltda']},
 {name:'Bulgarelli',domain:'bulgarelli.adv.br',aliases:['bulgarelli','bulgarelli assessoria','bulgarelli advogados','bugarelli']}
]);
export function normalizeInstitutionName(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9 ]/g,' ').replace(/\bs\s+a\b/g,'sa').replace(/\s+/g,' ').trim();
}
export function getInstitutionBrand(value){
 const normalized=normalizeInstitutionName(value);
 if(!normalized)return null;
 // "Assessoria X", "Escritório X" e entradas desconhecidas nunca recebem marca bancária.
 const exact=INSTITUTION_BRANDS.find(b=>b.aliases.includes(normalized));
 if(exact)return {name:exact.name,domain:exact.domain};
 const withoutCompany=normalized.replace(/\b(s a|sa|s a s|ltda|eireli|instituicao financeira)\b/g,'').replace(/\s+/g,' ').trim();
 const match=INSTITUTION_BRANDS.find(b=>b.aliases.includes(withoutCompany));
 return match?{name:match.name,domain:match.domain}:null;
}
