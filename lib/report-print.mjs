export const REPORT_PRINT_SECTIONS=Object.freeze([
 {id:'capa',label:'Capa executiva'},
 {id:'resumo',label:'Resumo da carteira'},
 {id:'operacao',label:'Atividades e produtividade'},
 {id:'metodologia',label:'Evolução diária e metodologia'},
 {id:'prioridades',label:'10 prioridades operacionais'},
 {id:'registros',label:'Anotações e atividades'}
]);
export function reportPrintSections(ids=REPORT_PRINT_SECTIONS.map(x=>x.id)){
 return ids.map(id=>REPORT_PRINT_SECTIONS.find(s=>s.id===id)).filter(Boolean);
}
export function reportHealthNotes({incomplete=false,unverified=0,conflicts=0}={}){
 const notes=[];
 if(incomplete)notes.push('Relatório parcial: uma ou mais fontes podem estar indisponíveis ou limitadas pela consulta.');
 notes.push('Quitações apontadas na planilha não são comprovantes de pagamento. Apenas quitações documentalmente verificadas são contabilizadas como confirmadas.');
 if(unverified>0)notes.push(unverified+' registros de quitação na planilha sem equivalência automática com pagamento verificado.');
 if(conflicts>0)notes.push(conflicts+' registros possuem divergências de origem que exigem revisão.');
 notes.push('Atendimentos e atividades representam registros realizados; não foram inferidos contatos nem valores financeiros.');
 return notes;
}
export function percent(part,total){
 const n=Number(total||0);
 if(n<=0)return 0;
 return Math.round(Math.max(0,Number(part||0))*100/n*10)/10;
}
