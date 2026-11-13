// Diagnóstico de versão: jamais confundir build publicado com commit apenas salvo no GitHub.
import {NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(){
 const rev=String(process.env.VERCEL_GIT_COMMIT_SHA||'').trim();
 const channel=String(process.env.VERCEL_ENV||'local').trim();
 return NextResponse.json({
  service:'infinitum',buildReady:true,revision:rev?/^[0-9a-f]{40}$/i.test(rev)?rev.slice(0,12):'desconhecida':'não informada',
  environment:['production','preview','development'].includes(channel)?channel:'local',
  checks:{supabase:'não executado',djen:'não executado',datajud:'não executado'},
  note:'Este endpoint confirma apenas o build publicado. Não comprova disponibilidade dos serviços judiciais ou autenticação.',
 },{headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
}
