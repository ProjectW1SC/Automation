// Optional Google Sign-In via the *Firebase client SDK*.
// Firebase provides a genuine Google OIDC ID token; Supabase exchanges it
// for the project's existing native session. No Firebase JWT is ever used
// as a Supabase user ID and no Supabase RLS/owner mapping is bypassed.
export function firebaseGoogleConfigured(){
 return !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN&&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID&&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
}
export function firebasePublicConfig(){
 if(!firebaseGoogleConfigured())return null;
 return {apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID};
}
async function firebaseModules(){
 const [{initializeApp,getApps,getApp},authMod]=await Promise.all([
  import('firebase/app'),import('firebase/auth')]);
 const config=firebasePublicConfig();
 if(!config)throw Error('Firebase não configurado neste CRM. Use e-mail e senha ou o login Google do Supabase.');
 const app=getApps().find(x=>x.name==='w1sc-google-auth')||
  initializeApp(config,'w1sc-google-auth');
 return {auth:authMod.getAuth(app),...authMod};
}
async function exchangeGoogleToken(db,result,provider,auth,signOut){
 const credential=provider.credentialFromResult(result);
 const idToken=credential?.idToken;
 if(!idToken)throw Error('O Firebase não retornou uma identidade Google válida.');
 try{
  // Not a Firebase ID token: this is the ORIGINAL Google provider ID token,
  // which the configured Supabase Google provider verifies independently.
  const {data,error}=await db.auth.signInWithIdToken({provider:'google',token:idToken,
   ...(credential.accessToken?{access_token:credential.accessToken}:{})});
  if(error||!data?.session)throw Error(error?.message||'Não foi possível validar a conta Google no Supabase.');
  return data;
 }finally{
  // Avoid retaining a second unrelated Firebase session; the CRM uses only Supabase.
  await signOut(auth).catch(()=>{});
 }
}
export async function firebaseGoogleLogin(db,{redirect=false}={}){
 if(!db?.auth?.signInWithIdToken)throw Error('Sessão Supabase indisponível.');
 const {auth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut}=await firebaseModules();
 const googleProvider=new GoogleAuthProvider();
 googleProvider.addScope('email');googleProvider.addScope('profile');
 if(redirect){
  await signInWithRedirect(auth,googleProvider);
  return {redirecting:true};
 }
 try{
  const result=await signInWithPopup(auth,googleProvider);
  return await exchangeGoogleToken(db,result,GoogleAuthProvider,auth,signOut);
 }catch(error){
  if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(error?.code)){
   await signInWithRedirect(auth,googleProvider);
   return {redirecting:true};
  }
  throw error;
 }
}
export async function completeFirebaseGoogleRedirect(db){
 if(!firebaseGoogleConfigured()||!db?.auth?.signInWithIdToken)return null;
 const {auth,GoogleAuthProvider,getRedirectResult,signOut}=await firebaseModules();
 const result=await getRedirectResult(auth);
 return result?exchangeGoogleToken(db,result,GoogleAuthProvider,auth,signOut):null;
}
