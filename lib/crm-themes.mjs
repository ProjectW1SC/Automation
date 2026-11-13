// Dois temas oficiais do Infinitum. Light é o padrão; Dark mantém a mesma estrutura com superfícies noturnas.
const theme = values => Object.freeze(values);
export const CRM_THEMES=Object.freeze([
 theme({
  id:'infinitum',mode:'light',label:'Infinitum Light',description:'Claro, luminoso e recomendado para o uso diário.',
  page:'#fff8fb',surface:'#fffdfd',ink:'#321d36',muted:'#715d75',
  accent:'#8a557e',accentInk:'#ffffff',nav:'#fffafd',navInk:'#49304d',
  border:'#eadce8',tint:'#f3e7f2',tintInk:'#633e68',
  warningBg:'#fff3e6',warningInk:'#854b13',successBg:'#e8f6ee',successInk:'#145a3a',
  dangerBg:'#fdecef',dangerInk:'#9f233f',neutralBg:'#f0eaf1',neutralInk:'#55465a'
 }),
 theme({
  id:'infinitum-dark',mode:'dark',label:'Infinitum Dark',description:'Noturno, cósmico e com detalhes em champanhe.',
  page:'#100c15',surface:'#1c1522',ink:'#f6edf7',muted:'#c7b5cb',
  accent:'#d5a27c',accentInk:'#2a1b25',nav:'#0d0911',navInk:'#f7eef8',
  border:'#44344d',tint:'#33243b',tintInk:'#f9eaf8',
  warningBg:'#47321f',warningInk:'#ffdcac',successBg:'#173b2c',successInk:'#a9edc7',
  dangerBg:'#4b202b',dangerInk:'#ffb8c8',neutralBg:'#332c3a',neutralInk:'#e5dce8'
 })
]);
export function resolveTheme(value){
 const selected=String(value||'').trim().toLowerCase();
 if(selected==='blackhole')return 'infinitum-dark';
 return CRM_THEMES.some(t=>t.id===selected)?selected:'infinitum';
}
export function contrastRatio(foreground,background){
 function luminance(hex){
  const m=/^#([a-f\d]{6})$/i.exec(hex);
  if(!m)throw new Error('Cor hexadecimal inválida: '+hex);
  const rgb=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)/255)
   .map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
 }
 const a=luminance(foreground),b=luminance(background);
 return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
