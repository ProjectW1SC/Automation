export function officialDateIso(raw){
 if(raw===null||raw===undefined||raw==='')return null;
 const s=String(raw).trim();
 /** @type {string|number} */
 let value=s;
 if(/^\d{14}$/.test(s))value=s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T'+s.slice(8,10)+':'+s.slice(10,12)+':'+s.slice(12,14)+'-03:00';
 if(/^\d{13}$/.test(s))value=Number(s);
 const ms=typeof value==='number'?value:Date.parse(value);
 return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
export function officialProcessDigits(row){
 return String(row?.numeroProcesso||row?.numero_processo||row?.numeroProcessoFormatado||row?.numeroprocessocommascara||'').replace(/\D/g,'');
}
