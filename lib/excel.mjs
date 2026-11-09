// Leitura conservadora do Excel de quitações: fontes complementam o mesmo cliente pelo CPF/CNPJ.
// Um rótulo de planilha NÃO é comprovante. Ausência de documento vai para revisão.
const str = v => v == null ? '' : String(v).trim();
export const onlyDigits = v => str(v).replace(/\D/g, '');
export function dateValue(v) {
  if (!v && v !== 0) return null;
  let d = null;
  if (v instanceof Date) d = v;
  else if (typeof v === 'number' && v > 36525 && v < 73050) d = new Date(Math.round((v - 25569) * 86400000));
  else if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      let a=+m[1], b=+m[2], year=+m[3], day=a, month=b;
      if (a <= 12 && b > 12) { day=b; month=a; }
      d = new Date(Date.UTC(year,month-1,day));
      if (d.getUTCDate() !== day || d.getUTCMonth()+1 !== month) return null;
    } else if (/^20\d\d-\d\d-\d\d$/.test(v)) d=new Date(v+'T00:00:00Z');
  }
  if (!d || Number.isNaN(d.getTime()) || d.getUTCFullYear()<2000 || d.getUTCFullYear()>2100) return null;
  return d.toISOString().slice(0,10);
}
export function moneyValue(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v*100)/100 : null;
  let s=str(v).replace(/[^0-9,.\-]/g,'');
  if (!s) return null;
  if (s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  const n=Number(s);
  return Number.isFinite(n)?Math.round(n*100)/100:null;
}
const named = value => {
  const n=str(value);
  return n.length>3 && !/^(NOME|CLIENTE|CLIENTES|DATA|TOTAL|QUITADO|QUITADOS|EM ANDAMENTO|JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)$/i.test(n) && !/^\d{1,2}\/\d{4}$/.test(n) && !/^\d+$/.test(n);
};
export function parseExcelSheets(sheets, filename='Arquivo.xlsx') {
  const rows=[], parties=[], ignored=[];
  const fileKey=filename.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
  const sourceSpecs={
    'KAWAN':{start:1,name:1,doc:2,phone:3,consultant:4,institution:13,party:19,amount:5,saleDate:6,lastContact:10,nextReturn:12,debt:14,estimate:15,current:16,notes:18,status:r=>/quitad/i.test(str(r[0]))?'quitado_na_planilha':/vencid/i.test(str(r[0]))?'vencido':'em_andamento'},
    'planilha quitação antiga 2024':{start:3,name:3,doc:5,phone:4,consultant:6,institution:18,party:24,amount:7,saleDate:8,lastContact:14,nextReturn:16,debt:21,estimate:22,current:23,notes:31,status:r=>/quitad/i.test(str(r[1]))?'quitado_na_planilha':'historico'},
    'Quitados':{start:2,name:4,doc:6,phone:5,consultant:12,institution:7,party:13,amount:8,saleDate:3,debt:9,estimate:10,current:11,notes:14,status:r=>/^quitado$/i.test(str(r[2]))?'quitado_na_planilha':'revisar'},
    'QUITAÇÃO IRREVERSIVEL':{start:2,name:5,doc:7,phone:6,consultant:14,institution:8,party:16,amount:10,saleDate:3,lastContact:4,debt:11,estimate:12,current:13,notes:17,status:()=> 'revisar'},
    'Inconsistência':{start:2,name:3,doc:5,phone:4,consultant:11,institution:9,amount:10,saleDate:2,estimate:8,current:6,notes:15,status:()=> 'revisar'},
    'CÓPIA VENDAS QUIT':{start:4,name:3,phone:null,consultant:7,amount:6,saleDate:1,lastContact:2,current:12,notes:9,status:()=> 'revisar'}
  };
  for (const item of sheets||[]) {
    const tab=item.sheet, data=item.data||[];
    if(tab==='Lista bancos') {
      for(const [index,r] of data.entries()) {
        if(index<2)continue;
        for(const [nameCol,contactCol,kind] of [[0,1,'financeira'],[10,11,'assessoria']]) {
          const name=str(r[nameCol]);
          if(named(name))parties.push({name,contact:str(r[contactCol]),kind});
        }
      }
      continue;
    }
    const s=sourceSpecs[tab];
    if(!s) { ignored.push(tab); continue; }
    for(let i=s.start;i<data.length;i++) {
      const r=data[i]||[],name=str(r[s.name]);
      if(!named(name))continue;
      const doc=onlyDigits(s.doc===undefined?null:r[s.doc]);
      const status=s.status(r);
      const source_ref='excel:'+fileKey+':'+tab+':'+(i+1)+':'+(doc||name.normalize('NFKD').replace(/[^a-zA-Z0-9]/g,'').slice(0,35));
      rows.push({
        source_ref,source_tab:tab,source_row:i+1,source_status:status,name,
        doc_digits:doc,phone:s.phone===null?'':str(r[s.phone]),
        consultant:str(r[s.consultant]),institution:str(r[s.institution]),contacted_party:str(r[s.party]),
        sale_amount:moneyValue(r[s.amount]),sale_date:dateValue(r[s.saleDate]),
        last_contact:dateValue(r[s.lastContact]),next_return:dateValue(r[s.nextReturn]),
        debtor_balance:moneyValue(r[s.debt]),estimated_amount:moneyValue(r[s.estimate]),
        current_amount:moneyValue(r[s.current]),notes:str(r[s.notes]).slice(0,5000)
      });
    }
  }
  return {rows,parties:[...new Map(parties.map(p=>[(p.kind+':'+p.name.toLowerCase()),p])).values()],ignored};
}
