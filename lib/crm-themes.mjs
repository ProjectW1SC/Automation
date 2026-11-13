// Infinitum Prestige is now the sole, immutable visual theme for the CRM.
export const CRM_THEMES=Object.freeze([Object.freeze({id:'infinitum',label:'Infinitum · referência TXT',page:'#fafaf9',surface:'#ffffff',ink:'#1c1917',muted:'#57534e',accent:'#292524',accentInk:'#ffffff',nav:'#1c1917',navInk:'#fafaf9',border:'#d6d3d1',tint:'#e7e5e4',tintInk:'#292524',warningBg:'#fff7ed',warningInk:'#7c2d12',successBg:'#ecfdf5',successInk:'#065f46',dangerBg:'#fef2f2',dangerInk:'#991b1b',neutralBg:'#f5f5f4',neutralInk:'#44403c'})]);
export const resolveTheme=()=> 'infinitum';
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
