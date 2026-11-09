import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {GoogleAuth,OAuth2Client} from 'google-auth-library';
import {parseTab,parseParties,mergeClients} from '../../../lib/normalize.mjs';
export const runtime='nodejs';export const maxDuration=60;
const ALLOWED=['ANDAMENTO','VENCIDOS','QUITADOS','FINALIZADOS','FINANCEIRAS'];
function fail(msg,status=500){return NextResponse.json({error:msg},{status})}
function serverDB(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Configure Supabase no servidor');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function google(){
 if(process.env.GOOGLE_SERVICE_ACCOUNT_JSON){const credentials=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);const auth=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});return await auth.getClient()}
 if(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REFRESH_TOKEN){const auth=new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET);auth.setCredentials({refresh_token:process.env.GOOGLE_REFRESH_TOKEN});return auth}
 throw Error('Credenciais Google não configuradas');
}
async function sheet(g,id,tab){const range=encodeURIComponent(`'${tab}'!A1:AE2000`);const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${range}?valueRenderOption=FORMATTED_VALUE`;const r=await g.request({url});return r.data.values||[]}
async function authorized(request,db){const h=request.headers.get('authorization')||'';const cron=process.env.CRON_SECRET&&h===`Bearer ${process.env.CRON_SECRET}`;if(cron)return true;const token=h.startsWith('Bearer ')?h.slice(7):'';if(!token)return false;const {data,error}=await db.auth.getUser(token);if(error||!data?.user)return false;if(data.user.email?.toLowerCase()==='intermedioesenegociacoes@gmail.com')return true;const {data:member,error:memberError}=await db.from('crm_memberships').select('role,enabled').eq('user_id',data.user.id).eq('enabled',true).maybeSingle();return !memberError&&member?.role==='admin'&&member.enabled}
async function run(request){let db;try{db=serverDB()}catch(e){return fail(e.message,503)}if(!await authorized(request,db))return fail('Acesso não autorizado',401);
 const ids=(process.env.GOOGLE_SHEETS_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);if(!ids.length)return fail('Nenhuma planilha configurada',503);
 let g;try{g=await google()}catch(e){return fail(e.message,503)}
 const all=[],sources=[],parties=[],errors=[];
 for(const id of ids){for(const tab of ALLOWED){try{const rows=await sheet(g,id,tab);if(tab==='FINANCEIRAS')parties.push(...parseParties(rows));else all.push(...parseTab(tab,rows,id));sources.push({spreadsheet:id,tab,rows:rows.length})}catch(e){errors.push({spreadsheet:id,tab,error:e.response?.status===403?'Sem permissão Google':String(e.message).slice(0,120)})}}}
 if(!all.length)return fail('Nenhuma fonte de clientes acessível. '+errors.map(e=>e.tab+': '+e.error).join('; '),503);
 const grouped=mergeClients(all),now=new Date().toISOString();
 // Não substitui etapa operacional nem documento de quitação validado durante reimportações.
 const fields=['name','doc_digits','phone','consultant','institution','contacted_party','source_status','source_tab','source_spreadsheet','source_conflict','source_tabs','source_row_count','sale_amount','sale_date','last_contact','next_return','debtor_balance','estimated_amount','current_amount','last_negotiation','notes'];
 const {data:existing,error:e1}=await db.from('crm_clients').select('id,source_key').in('source_key',grouped.map(x=>x.source_key));if(e1)return fail('Erro de conciliação: '+e1.message);
 const index=new Map((existing||[]).map(x=>[x.source_key,x.id]));const payload=grouped.map(c=>{let o={source_key:c.source_key,source_seen_at:now,updated_at:now};for(let key of fields)o[key]=c[key]??null;return o});
 // Não sobrescrever registros antigos quando uma fonte falha parcialmente.
 for(let i=0;i<payload.length;i+=200){const {error}=await db.from('crm_clients').upsert(payload.slice(i,i+200),{onConflict:'source_key'});if(error)return fail('Erro de gravação: '+error.message)}
 const {data:written,error:e2}=await db.from('crm_clients').select('id,source_key').in('source_key',grouped.map(x=>x.source_key));if(e2)return fail(e2.message);for(const x of written)index.set(x.source_key,x.id);
 const raw=all.map(r=>({source_ref:r.source_ref,client_id:index.get('doc:'+r.doc_digits),source_spreadsheet:r.source_spreadsheet,source_tab:r.source_tab,source_row:r.source_row,snapshot:r,seen_at:now}));
 for(let i=0;i<raw.length;i+=150){const {error}=await db.from('crm_source_rows').upsert(raw.slice(i,i+150),{onConflict:'source_ref'});if(error)errors.push({tab:'origens',error:error.message})}
 const dedup=[...new Map(parties.map(p=>[p.kind+':'+p.name.toUpperCase(),p])).values()];
 for(let i=0;i<dedup.length;i+=150){const {error}=await db.from('crm_parties').upsert(dedup.slice(i,i+150),{onConflict:'name,kind'});if(error)errors.push({tab:'instituicoes',error:error.message})}
 const status=errors.length?'parcial':'concluido';
 await db.from('crm_import_runs').insert({source_file:ids.join(','),started_at:now,finished_at:new Date().toISOString(),status,rows_read:all.length,clients_merged:grouped.length,error:errors.length?JSON.stringify(errors).slice(0,4000):null});
 return NextResponse.json({status,clients:grouped.length,rows:all.length,sources,errors});
}
export async function POST(request){return run(request)}
export async function GET(request){return run(request)}
