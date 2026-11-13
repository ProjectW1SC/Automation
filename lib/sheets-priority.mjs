// Adapted from W2CAPITAL/SheetsPredict lib/task-priority.js.
// Scoring is an operational sort order only; it does not set or certify court deadlines.
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dayString=x=>{
 if(!x)return null;
 const s=String(x).trim();const br=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(s);
 if(br)return [br[3],br[2].padStart(2,'0'),br[1].padStart(2,'0')].join('-');
 const iso=/^\d{4}-\d{2}-\d{2}/.exec(s);return iso?iso[0]:null;
};
const boolish=x=>/^(sim|true|1|yes|x)$/i.test(String(x??'').trim());
const alias=x=>norm(x).replace(/[^a-z0-9]/g,'');
function pick(row,...keys){
 for(const key of keys)if(row?.[key]!=null&&String(row[key]).trim())return row[key];
 const names=new Map(Object.keys(row||{}).map(key=>[alias(key),key]));
 for(const key of keys){const found=names.get(alias(key));if(found&&row?.[found]!=null&&String(row[found]).trim())return row[found]}
 return '';
}
const daysDiff=(a,b)=>{const x=dayString(a),y=dayString(b);
 if(!x||!y)return null;
 const d=Date.parse(x+'T12:00:00Z')-Date.parse(y+'T12:00:00Z');
 return Number.isFinite(d)?Math.round(d/86400000):null
};
const move=row=>String(pick(row,'Diagnóstico Processual','DataJud • Último Movimento','Último Andamento','Andamento','ultimo_movimento','lastMovement','latestMovement')||'');
const ended=row=>/^(finalizado|concluido|encerrado|arquivado)$/i.test(String(pick(row,'workflow_status','status','Status','Situação')||''))||
 /\bencerrad|arquivad|baixa definitiva|cancelamento da distribuicao/.test(norm(pick(row,'Status','Situação','Diagnóstico Processual')));
const courtEnded=row=>boolish(pick(row,'Encerrado no Tribunal','DatajudEncerrado','datajud_encerrado_tribunal','isBaixaTribunal'))||
 /baixa definitiva|transito em julgado/.test(norm(move(row)));
export function scoreSheetsCase(row,today=''){
 if(!row)return{score:0,band:'normal',label:'—'};
 const now=dayString(today)||new Date().toISOString().slice(0,10);
 const latest=norm(move(row)),event=norm(pick(row,'Tipo de Evento','Evento_Tipo','evento_tipo'));
 const closed=ended(row),courtClosed=courtEnded(row);
 if(closed&&!courtClosed)return{score:0,band:'encerrado',label:'Encerrado'};
 if(/busca e apreensao/.test(latest)||event==='ba')return{score:1000,band:'ba',label:'B.A. (revisar)'};
 if(courtClosed&&!closed)return{score:920,band:'baixa',label:'Baixa no tribunal'};
 if(/sentenca|procedente|improcedente|merito/.test(event+' '+latest))return{score:880,band:'merito',label:'Possível mérito'};
 if(boolish(pick(row,'Nova Atualização','Novo Andamento','Novo_Andamento','tem_novo_andamento','tem_atualizacao_pos_retorno','djen_nova_comunicacao')))return{score:820,band:'novidade',label:'Novidade'};
 if(boolish(pick(row,'Cumprimento','em_cumprimento_sentenca'))||/cumprimento|execucao/.test(event+' '+latest))return{score:760,band:'cumprimento',label:'Cumprimento'};
 if(/audienc/.test(event+' '+latest))return{score:740,band:'audiencia',label:'Audiência'};
 const due=daysDiff(pick(row,'Próximo Retorno','ProximoRetorno','proximo_retorno','next_return','next_review'),now);
 const rawStatus=norm(pick(row,'Situação do Retorno','StatusRetorno','returnStatus'));
 if(rawStatus.includes('venc')||(due!==null&&due<0))return{score:700+Math.min(99,Math.abs(due||0)),band:'vencido',label:'Vencido'};
 if(rawStatus.includes('hoje')||due===0)return{score:650,band:'hoje',label:'É hoje'};
 if(rawStatus.includes('aten')||(due!==null&&due>0&&due<=3))return{score:600-(due||0),band:'atencao',label:'Atenção'};
 const last=pick(row,'Último Retorno','UltimoRetorno','ultimo_retorno','last_return');
 if(!last)return{score:420,band:'sem_retorno',label:'Sem retorno registrado'};
 const elapsed=daysDiff(now,last);
 let score=200+Math.min(120,Math.floor(Math.max(0,elapsed||0)/2));
 if(norm(pick(row,'Qualidade')).includes('ruim'))score+=25;
 return{score,band:'normal',label:'Rotina'};
}
export function rankSheetsCases(rows=[],today=''){
 return (Array.isArray(rows)?rows:[]).map(row=>({...row,...scoreSheetsCase(row,today)}))
  .sort((a,b)=>b.score-a.score||
   String(a.name||a.Cliente||a.title||'').localeCompare(String(b.name||b.Cliente||b.title||''),'pt-BR'));
}
