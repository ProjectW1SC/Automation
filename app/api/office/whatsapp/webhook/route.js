// Webhook oficial antigo desativado. A sessão Baileys/WA.Auto processa seus próprios eventos.
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){return Response.json({error:'Webhook Meta desativado; use a ponte WA.Auto.'},{status:410})}
export async function POST(){return Response.json({error:'Webhook Meta desativado; use a ponte WA.Auto.'},{status:410})}
