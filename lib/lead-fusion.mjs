// Adaptadores de importação para exportações próprias W1 Leadcheck, W2 LEADCHECKIN e W3 God-Eye.
// W3 fornece pesquisa geográfica, não uma API de leads. Nunca inventa dados pessoais.
export const LEAD_SOURCES=Object.freeze([
 {id:'w1',label:'W1 Capital · Leadcheck',href:'https://github.com/W1CAPITAL/Leadcheck',mode:'csv'},
 {id:'w2',label:'W2 Capital · LEADCHECKIN',href:'https://github.com/W2CAPITAL/LEADCHECKIN',mode:'csv/json'},
 {id:'w3',label:'W3 Capital · pesquisa pública',href:'https://github.com/W3CAPITAL/W3CAPITAL',mode:'manual'},
 {id:'manual',label:'Cadastro autorizado',href:null,mode:'manual'}
]);
export const LEAD_STAGES=Object.freeze(['novo','qualificado','contatado','proposta','convertido','perdido']);
const clean=(v,n=250)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function parseCSV(text){
 const input=String(text||'').replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<input.length;i++){const ch=input[i];
  if(ch==='"'&&quoted&&input[i+1]==='"'){field+='"';i++;continue}
  if(ch==='"'){quoted=!quoted;continue}
  if(ch===','&&!quoted){row.push(field);field='';continue}
  if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(c=>c.trim()))rows.push(row);row=[];field='';continue}
  field+=ch;
 }if(quoted)throw new Error('CSV com aspas não fechadas.');
 row.push(field);if(row.some(c=>c.trim()))rows.push(row);
 if(rows.length<2)return [];
 const headers=rows.shift().map(k=>clean(k,100).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s-]+/g,'_'));
 return rows.slice(0,500).map(cols=>Object.fromEntries(headers.map((h,i)=>[h,cols[i]||''])));
}
function cleanUrl(raw){try{if(!raw)return null;const u=new URL(clean(raw,1500));return u.protocol==='https:'||u.protocol==='http:'?u.href:null}catch{return null}}
export function normalizeLead(input,source='manual'){
 const o=input||{};if(!LEAD_SOURCES.some(s=>s.id===source))throw new Error('Fonte desconhecida.');
 const name=clean(o.name||o.nome||o.personName||o.title||o.titulo,180);
 const company=clean(o.company||o.empresa||o.organization||o.organizacao,180);
 const phone=clean(o.phone||o.telefone||o.whatsapp,40)||null;
 const email=clean(o.email||o.e_mail,160).toLowerCase()||null;
 const source_url=cleanUrl(o.source_url||o.sourceUrl||o.url||o.link||o.profileUrl);
 if(!name||name.length<2)throw new Error('Informe o nome ou título verificado do lead.');
 const rawStage=clean(o.stage||o.status,'novo');const stage=LEAD_STAGES.includes(rawStage)?rawStage:'novo';
 const score=Math.min(100,Math.max(0,Number.isFinite(Number(o.score))?Number(o.score):0));
 const identity=source_url||email||phone||(company&&name?company.toLowerCase()+'|'+name.toLowerCase():null);
 if(!identity)throw new Error('Informe uma URL, contato ou organização para identificar o registro com segurança.');
 const source_key=(source+'|'+identity).toLowerCase().slice(0,900);
 return {source_key,source,name,company:company||null,phone,email,source_url,
  source_detail:clean(o.source_detail||o.sourceDetail||o.snippet||o.detalhes||o.observacoes,1800)||null,
  stage,score:Math.round(score),interest:clean(o.interest||o.interesse||o.product,180)||null,
  consent_at:/^\d{4}-\d\d-\d\d/.test(String(o.consent_at||''))?String(o.consent_at).slice(0,10):null,
  consent_source:clean(o.consent_source||'',160)||null};
}
export function parseLeadImport(text,fileName,source){
 let rows;
 if(/\.json$/i.test(fileName)){const raw=JSON.parse(text);rows=Array.isArray(raw)?raw:Array.isArray(raw.leads)?raw.leads:Array.isArray(raw.data)?raw.data:[];}
 else if(/\.csv$/i.test(fileName))rows=parseCSV(text);
 else throw new Error('Use CSV ou JSON exportado da fonte.');
 if(!Array.isArray(rows)||!rows.length)throw new Error('Arquivo sem leads reconhecíveis.');
 const valid=[],errors=[],seen=new Set();
 for(const [i,row] of rows.slice(0,500).entries()){
  try{const record=normalizeLead(row,source);if(!seen.has(record.source_key)){valid.push(record);seen.add(record.source_key)}}catch(e){errors.push('Linha '+(i+2)+': '+e.message)}
 }return {valid,errors,received:rows.length};
}
