// Dois temas oficiais do Infinitum. Light é o padrão; Dark mantém a mesma estrutura com superfícies noturnas.
const theme = values => Object.freeze(values);
export const CRM_THEMES=Object.freeze([
 theme({
  id:'infinitum',mode:'light',label:'Infinitum Light',description:'Claro, elegante e confortável para o uso diário.',
  page:'#f6f2ee',surface:'#fffdfa',ink:'#2d2520',muted:'#71665e',
  accent:'#89684f',accentInk:'#fffaf4',nav:'#f1eae4',navInk:'#342821',
  border:'#e4d8ce',tint:'#f1e8df',tintInk:'#59483b',
  warningBg:'#fff1df',warningInk:'#7b4c1d',successBg:'#e8f4eb',successInk:'#275b3d',
  dangerBg:'#fae9e8',dangerInk:'#8e3835',neutralBg:'#ede9e5',neutralInk:'#554d47'
 }),
 theme({
  id:'infinitum-dark',mode:'dark',label:'Infinitum Dark',description:'Noturno, cósmico e com detalhes em champanhe e cobre.',
  page:'#100e0e',surface:'#20191a',ink:'#f4ece6',muted:'#c4b3a7',
  accent:'#d7aa80',accentInk:'#2a1d15',nav:'#130f10',navInk:'#f4eae2',
  border:'#493a36',tint:'#302524',tintInk:'#f3e8df',
  warningBg:'#47331f',warningInk:'#ffe0b5',successBg:'#1d3c2e',successInk:'#b1e9c8',
  dangerBg:'#4b2228',dangerInk:'#ffc0c8',neutralBg:'#332b29',neutralInk:'#e7ddd5'
 })
]);
export function resolveTheme(value){
 const selected=String(value||'').trim().toLowerCase();
 if(['blackhole','dark','infinitum-dark'].includes(selected))return 'infinitum-dark';
 if(['light','infinitum-light','prestige'].includes(selected))return 'infinitum';
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
