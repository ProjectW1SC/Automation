import {resolveCourtAlias} from './processos-oficiais.mjs';
const normalize=s=>String(s||'').replace(/\D/g,'');
const clock=s=>Date.parse(String(s||''))||0;
const expectedCourt=number=>{try{return resolveCourtAlias(number).toUpperCase()}catch{return null}};
function legitimateSnapshot(row,snapshot){
 if(!snapshot||String(snapshot.actor_id||'')!==String(row.actor_id||'')
  ||normalize(snapshot.process_number)!==normalize(row.process_number)
  ||clock(snapshot.checked_at)<=clock(row.checked_at))return false;
 const source=String(snapshot.source||'').toLowerCase();
 if(source==='datajud'){
  // A previous release queried STJ process numbers against the TST index.
  // Only accept DataJud snapshots when their verified backend court matches CNJ.
  const advertised=String(snapshot.payload?.court||snapshot.payload?.meta?.court||'').toUpperCase();
  return !!advertised&&advertised===expectedCourt(row.process_number);
 }
 return source==='djen'&&snapshot.payload?.source==='DJEN';
}
export function reconcileHermesScan(row,snapshots=[]){
 const later=(Array.isArray(snapshots)?snapshots:[]).filter(x=>legitimateSnapshot(row,x));
 const overlay={};
 for(const source of ['djen','datajud']){
  const matches=later.filter(x=>String(x.source||'').toLowerCase()===source)
   .sort((a,b)=>clock(b.checked_at)-clock(a.checked_at));
  const found=matches.filter(x=>x.found===true);
  overlay[source]=matches.length
   ?{state:'verified_after_scan',checkedAt:matches[0].checked_at,checkedWindows:matches.length,
     publicationWindows:found.length}
   :{state:'historical_failure',checkedAt:row.checked_at,checkedWindows:0,publicationWindows:0};
 }
 return {...row,overlay,
  hasNewerPublicationEvidence:overlay.djen.publicationWindows>0||overlay.datajud.publicationWindows>0,
  allSourcesRecentlyChecked:overlay.djen.state==='verified_after_scan'&&overlay.datajud.state==='verified_after_scan'};
}
