'use client';
import {Activity,CalendarClock,ChartNoAxesCombined,Landmark} from 'lucide-react';
import {dashboardMetrics} from '../lib/dashboard-charts.mjs';
import {todayBrazil} from '../lib/tarefas.mjs';
const number=n=>Number(n||0).toLocaleString('pt-BR');
const tone={vencido:'var(--ui-danger-ink)',hoje:'var(--ui-warning-ink)',em_dia:'var(--ui-success-ink)',sem_data:'var(--ui-neutral-ink)',finalizado:'var(--ui-border)'};
function ChartPanel({icon:Icon,title,subtitle,children}){
 return <section className="dashboard-chart-card"><header><span className="dashboard-chart-icon"><Icon size={18}/></span><div><h3>{title}</h3><p>{subtitle}</p></div></header>{children}</section>
}
export default function DashboardCharts({clients=[],today=todayBrazil()}){
 const metrics=dashboardMetrics(clients,today);
 let left=0;
 const distribution=metrics.statuses.map(item=>{const from=left;left+=metrics.total?100*item.value/metrics.total:0;return item.value?[''+tone[item.code]+' '+from.toFixed(2)+'% '+left.toFixed(2)+'%']:[]}).flat().join(', ');
 const maxBank=Math.max(1,...metrics.banks.map(x=>x.value)),maxHorizon=Math.max(1,...metrics.horizon.map(x=>x.value));
 return <section className="dashboard-chart-section" aria-label="Gráficos operacionais da carteira">
  <div className="dashboard-chart-section-head"><div><span className="reference-overline">DADOS DA CARTEIRA · EM TEMPO REAL</span><h2>Visão analítica</h2><p>Gráficos calculados exclusivamente dos clientes cadastrados no Supabase.</p></div><span className="dashboard-chart-date">Referência: {today.split('-').reverse().join('/')}</span></div>
  <div className="dashboard-chart-grid">
   <ChartPanel icon={Activity} title="Situação dos clientes" subtitle="Ativos, vencidos e finalizados">
    <div className="dashboard-chart-distribution"><div className="dashboard-chart-donut" role="img" aria-label={metrics.statuses.map(x=>x.label+': '+x.value).join(', ')} style={{background:metrics.total?'conic-gradient('+distribution+')':'var(--ui-border)'}}><div><strong>{number(metrics.total)}</strong><small>clientes</small></div></div>
     <div className="dashboard-chart-legend">{metrics.statuses.map(x=><div key={x.code}><i style={{background:tone[x.code]}}/><span>{x.label}</span><strong>{number(x.value)}</strong></div>)}</div>
    </div>
   </ChartPanel>
   <ChartPanel icon={Landmark} title="Principais instituições" subtitle="Clientes ativos por instituição">
    <div className="dashboard-chart-bars">{metrics.banks.map((b,i)=><div className="dashboard-chart-bar" key={b.label}>
     <div><span title={b.label}>{b.label}</span><strong>{number(b.value)}</strong></div>
     <div className="dashboard-chart-bar-track"><span style={{width:(b.value/maxBank*100)+'%',opacity:Math.max(.48,1-i*.07)}}/></div>
    </div>)}{metrics.banks.length===0&&<p className="dashboard-chart-empty">Sem instituições cadastradas na carteira ativa.</p>}</div>
   </ChartPanel>
   <ChartPanel icon={CalendarClock} title="Próximos retornos" subtitle="Distribuição por prazo — somente ativos">
    <div className="dashboard-chart-horizon">{metrics.horizon.map((h,i)=><div className="dashboard-chart-horizon-col" key={h.code}>
     <div className="dashboard-chart-horizon-bar"><span style={{height:(h.value?Math.max(5,h.value/maxHorizon*100):1)+'%',background:h.code==='overdue'?'var(--ui-danger-ink)':h.code==='today'?'var(--ui-warning-ink)':'var(--ui-accent)'}}/></div>
     <b>{number(h.value)}</b><small>{h.label}</small>
    </div>)}</div>
    <p className="dashboard-chart-foot">{number(metrics.urgents)} ativo(s) marcado(s) como urgente(s).</p>
   </ChartPanel>
  </div>
 </section>;
}
