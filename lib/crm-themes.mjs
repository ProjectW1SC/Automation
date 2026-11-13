// Dois temas oficiais do INFINITUM. Light é o padrão para novas instalações.
const theme = values => Object.freeze(values);
export const DEFAULT_CRM_THEME='infinitum';
export const CRM_THEMES=Object.freeze([
 theme({id:'infinitum',label:'Infinitum Light · Padrão',page:'#fbf7f8',surface:'#fffdfd',ink:'#392c39',muted:'#756575',accent:'#8d6686',accentInk:'#ffffff',nav:'#f4edf3',navInk:'#4c3549',border:'#e5d8e3',tint:'#f3eaf1',tintInk:'#594256',warningBg:'#fff3e8',warningInk:'#835322',successBg:'#eaf4ed',successInk:'#24613e',dangerBg:'#fae9eb',dangerInk:'#9b3544',neutralBg:'#f1edf1',neutralInk:'#5e5360'}),
 theme({id:'infinitum-dark',label:'Infinitum Dark',page:'#110d14',surface:'#211a24',ink:'#f5edf2',muted:'#c4b6c3',accent:'#d5a48e',accentInk:'#271a20',nav:'#140f17',navInk:'#f5eaf1',border:'#493849',tint:'#342638',tintInk:'#f1e3ee',warningBg:'#49331f',warningInk:'#f3c58b',successBg:'#1e3c30',successInk:'#9bd8b0',dangerBg:'#4a252e',dangerInk:'#ffb2ba',neutralBg:'#39313d',neutralInk:'#d5cad7'})
]);
export function resolveTheme(value){if(value==='dark')return 'infinitum-dark';return CRM_THEMES.some(t=>t.id===value)?value:DEFAULT_CRM_THEME}
export function contrastRatio(foreground,background){
 function luminance(hex){const m=/^#([a-f\d]{6})$/i.exec(hex);if(!m)throw new Error('Cor hexadecimal inválida: '+hex);const rgb=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722}
 const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)
}
