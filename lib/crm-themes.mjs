// Uma paleta para toda a interface. Cores verificadas para texto normal WCAG AA (4,5:1).
export const CRM_THEMES=Object.freeze([
 {id:'vinho',label:'Vinho clássico',page:'#fdf9f8',surface:'#ffffff',ink:'#381b29',muted:'#624956',accent:'#6b2442',accentInk:'#ffffff',nav:'#421326',navInk:'#ffffff',border:'#dcc4cf',tint:'#f8edf2',tintInk:'#5e2840',warningBg:'#fff4ec',warningInk:'#7a3f19',successBg:'#e9f4eb',successInk:'#235b34',dangerBg:'#ffebed',dangerInk:'#9f2436'},
 {id:'azul',label:'Azul executivo',page:'#f5f8ff',surface:'#ffffff',ink:'#172d4b',muted:'#465b74',accent:'#234e83',accentInk:'#ffffff',nav:'#112e50',navInk:'#ffffff',border:'#d4dfec',tint:'#e8f1fb',tintInk:'#1c4774',warningBg:'#fff4e8',warningInk:'#704010',successBg:'#e7f5ef',successInk:'#1b5e43',dangerBg:'#fff0ee',dangerInk:'#992f36'},
 {id:'verde',label:'Verde profundo',page:'#f3f8f5',surface:'#ffffff',ink:'#193d31',muted:'#486456',accent:'#17553f',accentInk:'#ffffff',nav:'#123d31',navInk:'#ffffff',border:'#ceded3',tint:'#e4f3e9',tintInk:'#1b5541',warningBg:'#fff3df',warningInk:'#76470e',successBg:'#e6f5e8',successInk:'#285c36',dangerBg:'#ffedeb',dangerInk:'#992a35'},
 {id:'grafite',label:'Grafite escuro',page:'#111827',surface:'#202b3d',ink:'#f5f7fc',muted:'#d1d9e6',accent:'#b7d4ff',accentInk:'#152033',nav:'#0b1422',navInk:'#f5f7fc',border:'#526078',tint:'#2a3e55',tintInk:'#ecf4ff',warningBg:'#443623',warningInk:'#ffe0ac',successBg:'#234638',successInk:'#d0f7db',dangerBg:'#4c2631',dangerInk:'#ffd3df'},
 {id:'marfim',label:'Marfim elegante',page:'#fbf8ef',surface:'#ffffff',ink:'#332b1e',muted:'#605748',accent:'#685022',accentInk:'#ffffff',nav:'#3e321e',navInk:'#fff9e9',border:'#dfd6c2',tint:'#f4eddb',tintInk:'#59441f',warningBg:'#fff2df',warningInk:'#785011',successBg:'#e8f3e7',successInk:'#255b33',dangerBg:'#ffeeeb',dangerInk:'#9f3037'}
]);
export const resolveTheme=id=>CRM_THEMES.some(theme=>theme.id===id)?id:'vinho';
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
