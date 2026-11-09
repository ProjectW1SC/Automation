// Mapeamento auditável dos formatos reais das abas da planilha GET. Nenhum dado pessoal fica no repositório.
const tabs = new Set(['ANDAMENTO','VENCIDOS','QUITADOS','FINALIZADOS']);
export const normalizedDoc = value => String(value ?? '').replace(/\D/g,'');
export const hasDocument = value => [11,14].includes(normalizedDoc(value).length);
export function moneyBR(value) {
 if (value === null || value === undefined || String(value).trim()==='') return null;
 if (typeof value === 'number') return Number.isFinite(value)?value:null;
 let s=String(value).replace(/[^0-9,.\-]/g,'').trim(); if(!s)return null;
 if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
 const n=Number(s);return Number.isFinite(n)?n:null;
}
export function dateBR(value) {
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const s=String(value).trim(); const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(!m)return /^20\d\d-\d\d-\d\d$/.test(s)?s:null;
 let a=Number(m[1]),b=Number(m[2]),year=Number(m[3]);
 if(year<2000||year>2100)return null;
 // A planilha mistura DD/MM/AAAA com datas importadas em MM/DD/AAAA.
 let day=a,month=b;if(b>12&&a<=12){day=b;month=a;}
 if(month<1||month>12||day<1||day>31)return null;
 const d=new Date(Date.UTC(year,month-1,day));
 if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day)return null;
 return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
const text = x => String(x??'').trim();
const mapStatus={ANDAMENTO:'em_andamento',VENCIDOS:'vencido',QUITADOS:'quitado_na_planilha',FINALIZADOS:'finalizado_na_planilha'};
function isTitle(r){const second=text(r[1]).toUpperCase();return !second||second==='NOME'||/^(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)[\/ ]/i.test(second);}
export function parseTab(tab, rows, spreadsheetId) {
 if(!tabs.has(tab))return [];
 const result=[];
 for(let i=1;i<rows.length;i++){
  const r=rows[i]||[];if(isTitle(r))continue;
  // QUITADOS contém cabeçalhos repetidos entre grupos e não segue as outras abas.
  const q=tab==='QUITADOS';
  const doc=normalizedDoc(r[2]); if(!hasDocument(doc))continue;
  const name=text(r[1]);if(name.length<3)continue;
  const institution=text(r[q?3:13]);
  const row={source_ref:`${spreadsheetId}:${tab}:${i+1}`,source_spreadsheet:spreadsheetId,source_tab:tab,source_row:i+1,
    source_status:mapStatus[tab],name,doc_digits:doc,
    phone:q?'':text(r[3]),consultant:q?text(r[0]):text(r[4]),
    institution,contacted_party:q?'':text(r[19]),
    sale_amount:q?moneyBR(r[7]):moneyBR(r[5]),sale_date:q?dateBR(r[4]):dateBR(r[6]),
    last_contact:q?null:dateBR(r[10]),next_return:q?null:dateBR(r[12]),
    debtor_balance:q?moneyBR(r[8]):moneyBR(r[tab==='FINALIZADOS'?15:14]),
    estimated_amount:q?moneyBR(r[9]):moneyBR(r[tab==='FINALIZADOS'?16:15]),
    current_amount:q?moneyBR(r[10]):moneyBR(r[tab==='FINALIZADOS'?17:16]),
    notes:q?'':text(r[tab==='FINALIZADOS'?26:18]),
    last_negotiation:q?dateBR(r[5]):dateBR(r[tab==='FINALIZADOS'?21:20]),
    raw:r};
  // A aba QUITADOS indica um rótulo da origem, NÃO comprova a quitação.
  result.push(row);
 }
 return result;
}
export function parseParties(rows){const out=[];for(let i=1;i<rows.length;i++){let r=rows[i]||[];for(let [ix,phoneIx,kind] of [[0,1,'financeira'],[3,4,'assessoria']]){let name=text(r[ix]);if(name&&name.length>2&&!/^(bancos|assessorias)$/i.test(name))out.push({name,contact:text(r[phoneIx]),kind});}}return out;}
export function mergeClients(entries){
 const groups=new Map();for(const row of entries){const key=`doc:${row.doc_digits}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const order={QUITADOS:4,FINALIZADOS:3,VENCIDOS:2,ANDAMENTO:1};
 return [...groups].map(([source_key,rs])=>{
   const sorted=[...rs].sort((a,b)=>order[b.source_tab]-order[a.source_tab]);
   const primary=sorted[0];const tabs=[...new Set(sorted.map(r=>r.source_tab))];
   const pick=k=>sorted.map(r=>r[k]).find(v=>v!==null&&v!==undefined&&v!=='' )??null;
   return {source_key,name:pick('name'),doc_digits:primary.doc_digits,phone:pick('phone'),consultant:pick('consultant'),institution:pick('institution'),contacted_party:pick('contacted_party'),sale_amount:pick('sale_amount'),sale_date:pick('sale_date'),last_contact:pick('last_contact'),next_return:pick('next_return'),debtor_balance:pick('debtor_balance'),estimated_amount:pick('estimated_amount'),current_amount:pick('current_amount'),notes:pick('notes'),last_negotiation:pick('last_negotiation'),source_status:primary.source_status,source_tab:primary.source_tab,source_spreadsheet:primary.source_spreadsheet,source_conflict:tabs.length>1,source_tabs:tabs,source_row_count:rs.length};
 });
}
