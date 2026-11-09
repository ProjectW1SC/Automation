import {contrastRatio} from './crm-themes.mjs';
export const APP_COLORS=Object.freeze(['primary','secondary','tertiary']);
const HEX=/^#[a-f0-9]{6}$/i;
export const APPEARANCE_BUCKET='crm-backgrounds';
export function appearanceDefaults(theme){return {page:theme.page,primary:theme.ink,secondary:theme.muted,tertiary:theme.muted}}
export function validateAppearance(input={},theme){
 if(!theme||!theme.surface)throw new Error('Tema inválido.');
 const proposed={...appearanceDefaults(theme),...Object.fromEntries(Object.entries(input||{}).filter(([k])=>k==='page'||APP_COLORS.includes(k)))};
 for(const [key,value] of Object.entries(proposed))if(!HEX.test(String(value||'')))throw new Error('Informe uma cor hexadecimal válida para '+key+'.');
 for(const role of APP_COLORS){
  for(const base of [theme.surface,proposed.page]){
   const ratio=contrastRatio(proposed[role],base);
   if(ratio<4.5)throw new Error('Cor '+role+' sem contraste suficiente (mínimo 4,5:1). Escolha uma cor mais legível.');
  }
 }
 return proposed;
}
export function validateImageFile(file,purpose='logo'){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Selecione uma imagem JPG, PNG ou WebP.');
 const max=purpose==='background'?3:2;
 if(!Number.isFinite(file.size)||file.size<1||file.size>max*1024*1024)throw new Error('A imagem deve ter no máximo '+max+' MB.');
 return file;
}
export function appearancePathFor(userId,kind,mime,uniqueId){
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime];
 if(!/^[0-9a-f-]{36}$/i.test(userId)||!['background','logo'].includes(kind)||!ext||!/^[0-9a-f-]{36}$/i.test(uniqueId))throw new Error('Identificador de imagem inválido.');
 return userId+'/'+kind+'-'+uniqueId+'.'+ext;
}
export function applyAppearanceToDocument(root,theme,settings={},signedImage=''){
 if(!root||!root.style)return;
 const values=validateAppearance(settings||{},theme);
 root.style.setProperty('--ui-page',values.page);
 root.style.setProperty('--ui-ink',values.primary);
 root.style.setProperty('--ui-muted',values.secondary);
 root.style.setProperty('--ui-tertiary',values.tertiary);
 if(signedImage&&/^https:\/\//.test(signedImage)){
  root.style.setProperty('--crm-background-image','url("'+signedImage.replace(/["\\]/g,'')+'")');
  root.dataset.crmBackground='image';
 }else{
  root.style.removeProperty('--crm-background-image');
  delete root.dataset.crmBackground;
 }
 return values;
}
