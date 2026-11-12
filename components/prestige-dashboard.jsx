'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CalendarDays,CheckCircle2,ChevronLeft,ChevronRight,Clock3,FileText,Gavel,Plus,Scale,Users} from 'lucide-react';
const now=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const fmt=v=>Number(v||0).toLocaleString('pt-BR');
const day=x=>String(x||'').slice(0,10);
const dateText=x=>x?new Date(day(x)+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'Sem data';
const category=c=>{const s=String(c.subject||'').toLowerCase()+' '+String(c.title||'').toLowerCase();return /trabalh|empreg|reclamação/.test(s)?'Trabalhista':/tribut|imposto|fiscal/.test(s)?'Tributário':/empres|societ/.test(s)?'Empresarial':/cível|civil|consumidor|cobrança|família|banco/.test(s)?'Cível':'Outros'};
const label={audiencia:'Audiência',prazo:'Prazo',retorno:'Retorno',tarefa:'Tarefa'};
function PanelHeading({children,caption,href}){return <header className="pr-panel-heading"><div><h2>{children}</h2><small>{caption}</small></div>{href&&<Link href={href}>Ver todos <ArrowRight size={14}/></Link>}</header>}
function Metric({Icon,name,value,href,help}){return <Link className="pr-metric" href={href}><div><span><Icon size={20}/></span><small>{name}</small></div><strong>{fmt(value)}</strong><p>{help}</p></Link>}
function Calendar({deadlines}){
 const [month,setMonth]=useState(now().slice(0,7));const [y,m]=month.split('-').map(Number);
 const first=new Date(Date.UTC(y,m-1,1)),offset=(first.getUTCDay()+6)%7,last=new Date(Date.UTC(y,m,0)).getUTCDate();
 const length=offset+last>35?42:35;const move=d=>setMonth(new Date(Date.UTC(y,m-1+d,1)).toISOString().slice(0,7));
 const marks=new Set(deadlines.filter(x=>x.status==='aberto'&&x.due_on).map(x=>day(x.due_on)));
 return <section className="pr-surface pr-calendar"><header className="pr-cal-header"><button type="button" onClick={()=>move(-1)} aria-label="Mês anterior"><ChevronLeft size={17}/></button><strong>{first.toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})}</strong><button type="button" onClick={()=>move(1)} aria-label="Próximo mês"><ChevronRight size={17}/></button></header><div className="pr-calendar-grid">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=><b key={x}>{x}</b>)}{Array.from({length},(_,i)=>{const d=new Date(Date.UTC(y,m-1,i-offset+1)),id=d.toISOString().slice(0,10);return <Link href="/agenda" aria-label={'Abrir agenda de '+id} className={'pr-cal-day '+(id.slice(0,7)!==month?'outside':'')+(id===now()?' today':'')} key={id}>{d.getUTCDate()}{marks.has(id)&&<i/>}</Link>})}</div><Link className="pr-calendar-foot" href="/agenda">Abrir agenda completa <ArrowRight size={14}/></Link></section>;
}
function Trend({cases}){
 const [yy,mm]=now().slice(0,7).split('-').map(Number);
 const months=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(yy,mm-6+i,1)),key=d.toISOString().slice(0,7);return {key,label:d.toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}),count:cases.filter(x=>day(x.created_at).slice(0,7)===key).length}});
 const max=Math.max(1,...months.map(x=>x.count));
 const points=months.map((x,i)=>(18+i*98)+','+(140-x.count/max*110)).join(' ');
 return <section className="pr-surface pr-trend"><PanelHeading caption="Novos processos nos últimos seis meses" href="/relatorios">Movimentação do escritório</PanelHeading>{months.some(x=>x.count)?<><svg viewBox="0 0 544 165" role="img" aria-label="Gráfico de cadastros de processos"><path d="M18 30H508M18 85H508M18 140H508" stroke="#e8e3dc" fill="none"/><polyline fill="none" stroke="#171614" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" points={points}/>{months.map((x,i)=><circle key={x.key} cx={18+i*98} cy={140-x.count/max*110} r="3.8" fill="#171614" stroke="#fff" strokeWidth="1.4"/>)}</svg><div className="pr-chart-labels">{months.map(x=><span key={x.key}>{x.label}</span>)}</div></>:<p className="pr-empty">Nenhum processo com data de cadastro neste período.</p>}</section>;
}
function Breakdown({cases}){
 const labels=['Cível','Trabalhista','Tributário','Empresarial','Outros'],colors=['#171615','#695b4e','#af9271','#d5c1a8','#e9e4dd'];
 const counts=labels.map(l=>cases.filter(c=>category(c)===l).length),sum=counts.reduce((a,b)=>a+b,0);
 let pos=0;const stops=counts.map((n,i)=>{const a=pos;pos+=sum?100*n/sum:0;return colors[i]+' '+a+'% '+pos+'%'});
 return <section className="pr-surface pr-breakdown"><PanelHeading caption="Distribuição por matéria">Processos por área</PanelHeading><div className="pr-breakdown-row"><div className="pr-donut" style={{background:sum?'conic-gradient('+stops.join(',')+')':'#e9e4dd'}}><div><strong>{fmt(sum)}</strong><small>processos</small></div></div><div className="pr-legend">{labels.map((l,i)=><div key={l}><i style={{background:colors[i]}}/><span>{l}</span><strong>{sum?Math.round(100*counts[i]/sum):0}%</strong></div>)}</div></div></section>;
}
export default function PrestigeDashboard({clients=[],cases=[],deadlines=[],mini,session}){
 const today=now();
 const active=cases.filter(x=>x.status!=='encerrado');
 const future=deadlines.filter(x=>x.status==='aberto'&&day(x.due_on)>=today).sort((a,b)=>day(a.due_on).localeCompare(day(b.due_on)));
 const upcoming=future.filter(x=>x.kind==='audiencia');
 const name=String(session?.user?.user_metadata?.display_name||session?.user?.user_metadata?.full_name||'').trim().split(' ')[0];
 const humanDate=new Date(today+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 return <div className="pr-dashboard"><header className="pr-hero"><span>VISÃO EXECUTIVA · {humanDate}</span><h1>{name?'Bom dia, '+name+'.':'Seu escritório, em perspectiva.'}</h1><p>Uma visão clara da carteira, dos compromissos e das decisões que importam.</p><Link className="pr-main-button" href="/processos"><Plus size={17}/> Abrir processos</Link></header>
 <div className="pr-metrics">
 <Metric Icon={Scale} name="Processos ativos" value={active.length} href="/processos" help="Registros em andamento"/>
 <Metric Icon={Users} name="Clientes ativos" value={clients.filter(x=>x.status==='ativo').length} href="/clientes" help="Carteira jurídica"/>
 <Metric Icon={Gavel} name="Audiências futuras" value={upcoming.length} href="/audiencias" help="Compromissos cadastrados"/>
 <Metric Icon={Clock3} name="Prazos vencidos" value={mini?.counts?.overdue||0} href="/prazos?status=vencidos" help="Itens para atenção"/>
 <Metric Icon={CheckCircle2} name="Tarefas de hoje" value={deadlines.filter(x=>x.status==='aberto'&&day(x.due_on)===today).length} href="/prazos?status=hoje" help="Atividades do dia"/>
 </div>
 <div className="pr-upper-grid"><section className="pr-surface pr-agenda"><PanelHeading caption="Compromissos, retornos e prazos" href="/agenda">Agenda do escritório</PanelHeading><div className="pr-agenda-list">{future.slice(0,5).map((x,i)=><Link href="/agenda" className="pr-agenda-line" key={x.id||i}><span className="pr-sequence">{String(i+1).padStart(2,'0')}</span><div><strong>{x.title}</strong><small>{dateText(x.due_on)} · {label[x.kind]||'Compromisso'}{x.responsible?' · '+x.responsible:''}</small></div><em>{label[x.kind]||x.kind}</em></Link>)}{!future.length&&<p className="pr-empty">Nenhum compromisso futuro cadastrado.</p>}</div></section><Calendar deadlines={deadlines}/>
 <section className="pr-surface pr-processes"><PanelHeading caption="Acompanhamento da carteira" href="/processos">Meus processos</PanelHeading><div className="pr-process-head"><span>Processo</span><span>Cliente</span><span>Situação</span></div>{cases.slice(0,5).map((x,i)=><Link key={x.id||i} href="/processos" className="pr-process-line"><div><strong>{x.process_number||String(x.title||'Sem CNJ').slice(0,28)}</strong><small>{x.tribunal||category(x)}</small></div><span>{clients.find(c=>c.id===x.client_id)?.name||'Sem vínculo'}</span><em className={'pr-status '+(x.status||'ativo')}>{x.status==='encerrado'?'Encerrado':x.status==='suspenso'?'Suspenso':'Em andamento'}</em></Link>)}{!cases.length&&<p className="pr-empty">Nenhum processo cadastrado.</p>}</section></div>
 <div className="pr-lower-grid"><Trend cases={cases}/><section className="pr-surface pr-priorities"><PanelHeading caption="Providências mais urgentes" href="/prazos">Atividades prioritárias</PanelHeading>{(mini?.actions||[]).slice(0,5).map((x,i)=><Link className="pr-priority-line" href="/prazos" key={x.id||i}><span><FileText size={17}/></span><div><strong>{x.title}</strong><small>{dateText(x.date)} · {String(x.kind||'atividade').replaceAll('_',' ')}</small></div><ArrowRight size={14}/></Link>)}{!(mini?.actions||[]).length&&<p className="pr-empty">Sem pendências prioritárias identificadas.</p>}</section><Breakdown cases={cases}/></div><p className="pr-disclaimer">Indicadores calculados com os registros acessíveis. Confirme prazos e audiências nas fontes oficiais.</p></div>;
}