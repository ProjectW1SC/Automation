export function dedupeCandidateUpserts(rows=[]){
 const byKey=new Map();
 for(const row of rows||[]){
  if(!row||!String(row.process_number||'').trim()||!String(row.query_term||'').trim())continue;
  const key=String(row.owner_id||'')+'|'+String(row.process_number).replace(/\D/g,'')+'|'+String(row.query_term).trim().toLocaleLowerCase('pt-BR');
  const previous=byKey.get(key);
  const currentDate=String(row.official_date||'');
  const previousDate=String(previous?.official_date||'');
  if(!previous||currentDate>=previousDate)byKey.set(key,row);
 }
 return [...byKey.values()];
}
