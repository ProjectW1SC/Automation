// Dependency-free, editable Word DOCX and isolated A4 PDF-print layout.
// User content is treated as plain text; no HTML from court documents is executed.
const xml=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const html=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const clean=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,200000);
const color=s=>/^#[0-9a-f]{6}$/i.test(String(s||''))?s:'#5b2639';
const fonts=['Georgia','Times New Roman','Arial','Garamond','Cambria'];
export const stationeryKey='projectw1sc.legal-stationery-v1';
export function readStationery(storage){
 let cfg={};try{cfg=JSON.parse(storage?.getItem(stationeryKey)||'{}')}catch{}
 return {firm:clean(cfg.firm||'ESCRITÓRIO DE ADVOCACIA').slice(0,100),
  lawyer:clean(cfg.lawyer||'Advogado(a) responsável — a conferir').slice(0,100),
  oab:clean(cfg.oab||'').slice(0,25),state:clean(cfg.state||'').slice(0,2),
  address:clean(cfg.address||'').slice(0,175),font:fonts.includes(cfg.font)?cfg.font:'Georgia',
  size:Math.max(10,Math.min(16,Number(cfg.size)||12)),accent:color(cfg.accent),
  logoDataUrl:storage?.getItem(stationeryKey+'.logo')||''};
}
export function petitionParagraphs(body){
 const lines=clean(body).replace(/\r\n?/g,'\n').split('\n');const result=[];
 for(const line of lines){
  const v=line.trim();
  if(!v){if(result.at(-1)?.type!=='space')result.push({type:'space',text:''});continue}
  const heading=/^(?:[IVXLC]+\s*[-—.)]\s+|DOS FATOS\b|DOS FUNDAMENTOS\b|DOS PEDIDOS\b|DOCUMENTOS \/|EXCELENTÍSSIM[OA]|AO JUÍZO\b|MINUTA DE\b)/i.test(v);
  const center=/^(?:Nestes termos[,]?|Pede deferimento[.]?|\[LOCAL\],?\s*\[DATA\]\.?|\[CIDADE\],?\s*\[DATA\]\.?)/i.test(v);
  result.push({type:heading?'heading':center?'center':'normal',text:v});
 }
 return result;
}
const textEnc=new TextEncoder();
function crc32(data){let n=0xffffffff;for(const b of data){n^=b;for(let j=0;j<8;j++)n=(n>>>1)^((n&1)?0xedb88320:0)}return (n^0xffffffff)>>>0}
const u16=(n)=>[n&255,(n>>>8)&255];const u32=(n)=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
function zipStore(files){
 const local=[],central=[];let offset=0,count=0;
 for(const [name,body] of files){
  const path=textEnc.encode(name),bytes=typeof body==='string'?textEnc.encode(body):body,crc=crc32(bytes);
  const header=new Uint8Array([80,75,3,4,20,0,0,8,0,0,0,0,0,0,...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(path.length),0,0]);
  local.push(header,path,bytes);
  const directory=new Uint8Array([80,75,1,2,20,0,20,0,0,8,0,0,0,0,0,0,...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(path.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(offset)]);
  central.push(directory,path);offset+=header.length+path.length+bytes.length;count++;
 }
 const centralSize=central.reduce((n,x)=>n+x.length,0);
 const end=new Uint8Array([80,75,5,6,0,0,0,0,...u16(count),...u16(count),...u32(centralSize),...u32(offset),0,0]);
 const parts=[...local,...central,end],all=new Uint8Array(offset+centralSize+end.length);
 let k=0;for(const part of parts){all.set(part,k);k+=part.length}return all;
}
function inlineText(str){return '<w:r><w:t xml:space="preserve">'+xml(str)+'</w:t></w:r>'}
function paragraph(entry){
 if(entry.type==='space')return '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';
 const style=entry.type==='heading'?'Heading1':entry.type==='center'?'Center':'Normal';
 return '<w:p><w:pPr><w:pStyle w:val="'+style+'"/><w:keepNext w:val="'+(entry.type==='heading'?1:0)+'"/></w:pPr>'+inlineText(entry.text)+'</w:p>';
}
function safeImage(dataUrl){
 const m=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl||''));
 if(!m||m[2].length>1300000)return null;
 try{
  if(typeof Buffer!=='undefined'){const bytes=Uint8Array.from(Buffer.from(m[2],'base64'));return {ext:m[1]==='jpeg'?'jpg':'png',bytes};}
  const decoded=atob(m[2]),bytes=new Uint8Array(decoded.length);
  for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
  return {ext:m[1]==='jpeg'?'jpg':'png',bytes};
 }catch{return null}
}
function imageDrawing(){
 return '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="1240000" cy="720000"/><wp:docPr id="1" name="Logotipo do escritório"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1240000" cy="720000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}
export function createLegalDocx(body,prefs={},title='Petição jurídica'){
 const cfg={...readStationery(),...prefs},accent=color(cfg.accent).slice(1).toUpperCase(),size=Math.round(Math.max(10,Math.min(16,Number(cfg.size)||12))*2);
 const paragraphs=petitionParagraphs(body),logo=safeImage(cfg.logoDataUrl);
 const rootNS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
 const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr '+rootNS+'><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:color="'+accent+'"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="'+accent+'"/><w:sz w:val="24"/></w:rPr><w:t>'+xml(cfg.firm||'ESCRITÓRIO DE ADVOCACIA')+'</w:t></w:r></w:p><w:p>'+inlineText(cfg.address||'Minuta jurídica · conferência profissional obrigatória')+'</w:p></w:hdr>';
 const footer='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+rootNS+'><w:p><w:pPr><w:jc w:val="center"/></w:pPr>'+inlineText((cfg.lawyer||'Advogado(a) responsável')+(cfg.oab?' · OAB/'+(cfg.state||'UF')+' '+cfg.oab:'')+' · Minuta não protocolada')+'</w:p></w:ftr>';
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+rootNS+'>'+
 '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="'+xml(cfg.font||'Georgia')+'" w:hAnsi="'+xml(cfg.font||'Georgia')+'"/><w:sz w:val="'+size+'"/></w:rPr></w:rPrDefault></w:docDefaults>'+
 '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="100"/><w:ind w:firstLine="570"/></w:pPr></w:style>'+
 '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Título jurídico"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:before="220" w:after="120"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="'+accent+'"/></w:rPr></w:style>'+
 '<w:style w:type="paragraph" w:styleId="Center"><w:name w:val="Centralizado"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/></w:pPr></w:style></w:styles>';
 const wdoc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+rootNS+' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+
 (logo?imageDrawing():'')+paragraphs.map(paragraph).join('')+
 '<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1650" w:right="1800" w:bottom="1600" w:left="1800" w:header="720" w:footer="720"/><w:cols w:space="720"/></w:sectPr></w:body></w:document>';
 const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 const wordrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+(logo?'<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.'+logo.ext+'"/>':'')+'</Relationships>';
 const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+(logo?'<Default Extension="'+logo.ext+'" ContentType="image/'+(logo.ext==='jpg'?'jpeg':'png')+'"/>':'')+'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
 const files=[['[Content_Types].xml',types],['_rels/.rels',rels],['word/document.xml',wdoc],['word/styles.xml',styles],['word/header1.xml',header],['word/footer1.xml',footer],['word/_rels/document.xml.rels',wordrels]];
 if(logo)files.push(['word/media/logo.'+logo.ext,logo.bytes]);
 return zipStore(files);
}
export function downloadLegalDocx(body,{title='Petição',id='',storage=typeof localStorage!=='undefined'?localStorage:null}={}){
 const bytes=createLegalDocx(body,readStationery(storage),title);
 const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=('peticao-'+String(id||title).replace(/[^a-z0-9-]/gi,'_').slice(0,70)+'.docx');
 a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
export function buildLegalPrintHtml(body,prefs={}){
 const cfg={...readStationery(),...prefs};
 const paragraphs=petitionParagraphs(body).map(p=>p.type==='space'?'<div class="gap"></div>':'<p class="'+p.type+'">'+html(p.text)+'</p>').join('');
 const logo=safeImage(cfg.logoDataUrl)?'<img class="logo" src="'+html(cfg.logoDataUrl)+'" alt="Logotipo do escritório"/>':'';
 const accent=color(cfg.accent),font=fonts.includes(cfg.font)?cfg.font:'Georgia',size=Math.max(10,Math.min(16,Number(cfg.size)||12));
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Minuta jurídica · impressão</title><style>@page{size:A4;margin:18mm 20mm 20mm}*{box-sizing:border-box}html,body{background:#fff;color:#191919}body{font-family:'+font+',serif;font-size:'+size+'pt;margin:0}.head{display:flex;align-items:center;gap:14px;border-bottom:3px solid '+accent+';padding-bottom:14px;margin-bottom:19px}.head .logo{max-width:60px;max-height:55px;object-fit:contain}.head strong{display:block;color:'+accent+';font:700 17pt Georgia,serif}.head small{display:block;color:#555;font:9pt Arial;margin-top:4px}.paper p{line-height:1.55;text-align:justify;text-indent:12mm;margin:0 0 11pt;overflow-wrap:break-word}.paper p.heading{text-align:center;text-indent:0;font-weight:700;color:'+accent+';break-after:avoid;margin-top:14pt}.paper p.center{text-align:center;text-indent:0}.gap{height:7pt}.signature{text-align:center;margin-top:30pt;break-inside:avoid;font:10pt Georgia}.signature:before{content:"";display:block;width:65mm;border-top:1px solid #777;margin:0 auto 8pt}.footer{border-top:1px solid '+accent+';margin-top:25pt;padding-top:9pt;text-align:center;color:#555;font:8pt Arial}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header class="head">'+logo+'<div><strong>'+html(cfg.firm)+'</strong><small>'+html(cfg.address||'Minuta jurídica · revisão obrigatória')+'</small></div></header><main class="paper">'+paragraphs+'</main><div class="signature">'+html(cfg.lawyer)+(cfg.oab?'<div>OAB/'+html(cfg.state||'UF')+' nº '+html(cfg.oab)+'</div>':'')+'</div><footer class="footer">Minuta interna · Não protocolada · Revisão do advogado obrigatória</footer></body></html>';
}
export function printLegalPdf(body,storage=typeof localStorage!=='undefined'?localStorage:null){
 const w=window.open('','_blank');
 if(!w)throw Error('Permita a abertura de uma nova aba para imprimir o PDF.');
 w.document.open();w.document.write(buildLegalPrintHtml(body,readStationery(storage)));w.document.close();
 w.addEventListener('load',()=>{w.focus();w.print()},{once:true});
 // Some browsers complete document.write before a load listener is attached.
 if(w.document.readyState==='complete')setTimeout(()=>{w.focus();w.print()},200);
}
