// Interpreta registros oficiais previamente consultados. Não substitui leitura de decisões.
const txt=x=>String(x||'').replace(/\s+/g,' ').trim();
export function snapshotQueryKey(source,params){
 if(source==='datajud')return 'latest';
 const s=params?.get?.('inicio')||'default',e=params?.get?.('fim')||'default';
 if(!/^(default|\d{4}-\d{2}-\d{2})$/.test(s)||!/^(default|\d{4}-\d{2}-\d{2})$/.test(e))throw new Error('Datas inválidas.');
 return s+':'+e;
}
export function snapshotIsFresh(value,source,now=Date.now()){
 const time=Date.parse(value?.checked_at||'');
 const age=now-time;
 return Number.isFinite(time)&&age>=0&&age<(source==='datajud'?30:15)*60*1000;
}
export function shrinkOfficialResult(result){
 return {...result,items:(Array.isArray(result?.items)?result.items:[]).slice(0,120).map(x=>({
  ...x,title:txt(x?.title).slice(0,250),description:txt(x?.description).slice(0,1800),
  link:typeof x?.link==='string'&&x.link.startsWith('https://')?x.link:null
 }))};
}
function explicitHearingDate(text){
 const match=/audi[êe]ncia.{0,180}?\b([0-3]?\d)\/([01]?\d)\/(20\d\d)\b(?:.{0,40}?(?:[àa]s?|hor[aá]rio)\s+([0-2]?\d)(?:[:h](\d\d))?)?/i.exec(text)||
 /audi[êe]ncia.{0,180}?\b(20\d\d)-([01]\d)-([0-3]\d)\b(?:.{0,40}?(?:[àa]s?|hor[aá]rio)\s+([0-2]?\d)(?:[:h](\d\d))?)?/i.exec(text);
 if(!match)return null;
 const iso=match[1].length===4 ? match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0'):match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0');
 const [y,m,d]=iso.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
 const hour=match[4]===undefined?null:Number(match[4]);
 const minute=match[5]===undefined?0:Number(match[5]);
 return {date:iso,time:hour===null||hour>23||minute>59?null:String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')};
}
export function hearingCandidates(snapshots,today){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today||''))throw new Error('Data de referência inválida.');
 const out=[],seen=new Set();
 for(const snap of [...(snapshots||[])].sort((a,b)=>String(b.checked_at||'').localeCompare(String(a.checked_at||'')))){
  const number=snap.process_number;
  if(!number)continue;
  for(const ev of snap.payload?.items||[]){
   const content=txt(ev.title)+' '+txt(ev.description);
   if(!/audi[êe]ncia/i.test(content))continue;
   const when=explicitHearingDate(content);
   // A data da publicação NÃO é a data da audiência. Sem data expressa, não cria agenda.
   if(!when||when.date<today)continue;
   const key=number+'|'+when.date+'|'+(when.time||'?');
   if(seen.has(key))continue;seen.add(key);
   out.push({process_number:number,date:when.date,time:when.time,source:ev.source||snap.source,
    type:/instru[çc][ãa]o/i.test(content)?'Instrução':/concilia[çc][ãa]o/i.test(content)?'Conciliação':/julgamento/i.test(content)?'Julgamento':'Audiência',
    title:txt(ev.title).slice(0,180),evidence:txt(ev.description).slice(0,360),
    link:ev.link||null,checked_at:snap.checked_at||null,
    status:'Possível agendamento — conferir no tribunal'});
  }
 }
 return out.sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
}
export function verdictCandidates(snapshots){
 const out=[],seen=new Set();
 for(const snap of [...(snapshots||[])].sort((a,b)=>String(b.checked_at||'').localeCompare(String(a.checked_at||'')))){
  const number=snap.process_number;if(!number)continue;
  for(const ev of snap.payload?.items||[]){
   const content=txt(ev.title)+' '+txt(ev.description);
   if(!/\b(senten[çc]a|julgo|julgad[oa]s?|proced[eê]n|improced[eê]n)\b/i.test(content))continue;
   const key=number+'|'+txt(ev.id||ev.title)+'|'+String(ev.date||'');
   if(seen.has(key))continue;seen.add(key);
   let label='Decisão a conferir';
   if(/\b(?:julgo|julgad[oa]s?)\b.{0,110}\b(?:parcialmente procedentes?|procedentes? em parte)\b/i.test(content))label='Possível procedência parcial';
   else if(/\b(?:julgo|julgad[oa]s?)\b.{0,110}\bimprocedentes?\b/i.test(content))label='Possível improcedência';
   else if(/\b(?:julgo|julgad[oa]s?)\b.{0,110}\bprocedentes?\b/i.test(content))label='Possível procedência';
   out.push({process_number:number,label,date:ev.date||null,source:ev.source||snap.source,
    evidence:content.slice(0,360),link:ev.link||null,checked_at:snap.checked_at||null});
  }
 }
 return out.sort((a,b)=>String(b.date||b.checked_at||'').localeCompare(String(a.date||a.checked_at||'')));
}
