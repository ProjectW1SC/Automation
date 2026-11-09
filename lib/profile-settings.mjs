export const PROFILE_BUCKET='crm-profile-photos';
export const MAX_PROFILE_PHOTO_BYTES=2*1024*1024;
export const PROFILE_PHOTO_MIMES=Object.freeze({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'});
export function validateProfileName(value){
 const name=String(value??'').replace(/\s+/g,' ').trim();
 if(name.length<2||name.length>80)throw new Error('Informe um nome de perfil entre 2 e 80 caracteres.');
 if(/[\u0000-\u001f<>]/.test(name))throw new Error('Nome de perfil contém caracteres inválidos.');
 return name;
}
export function validateAvatarFile(file){
 if(!file||!Object.hasOwn(PROFILE_PHOTO_MIMES,String(file.type||'')))throw new Error('Selecione uma imagem JPG, PNG ou WebP.');
 if(!Number.isFinite(Number(file.size))||file.size<=0)throw new Error('A imagem está vazia.');
 if(file.size>MAX_PROFILE_PHOTO_BYTES)throw new Error('A foto deve ter até 2 MB.');
 return file;
}
export function avatarPathFor(uid,mime,nonce){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(uid||'')))throw new Error('Identificador de usuário inválido.');
 if(!Object.hasOwn(PROFILE_PHOTO_MIMES,mime))throw new Error('Formato de imagem inválido.');
 if(!/^[a-zA-Z0-9-]{2,72}$/.test(String(nonce||'')))throw new Error('Identificador da imagem inválido.');
 return uid+'/'+nonce+'.'+PROFILE_PHOTO_MIMES[mime];
}
export function validatePasswordChange(password,repeat){
 if(String(password||'').length<10||String(password).length>128)throw new Error('A nova senha precisa de 10 a 128 caracteres.');
 if(password!==repeat)throw new Error('As senhas não coincidem.');
 return password;
}
export function ownerAvatarPath(uid,path){
 return typeof path==='string'&&path.startsWith(uid+'/')&&/^[0-9a-f-]{36}\/[a-zA-Z0-9-]{2,72}\.(jpg|png|webp)$/.test(path);
}
