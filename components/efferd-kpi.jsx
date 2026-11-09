'use client';
import {ArrowUpRight} from 'lucide-react';
/* A compact, theme-aware adaptation of LexisPredict's EfferdDashboard KPI system.
   No simulated trend lines: values always come from supplied CRM data. */
export default function EfferdKpi({icon:Icon,title,value,sub,tone='default',kind,onClick,selected=false,className=''}) {
 const theme={danger:'danger',good:'ok',pending:'warn',warning:'warn',ok:'ok',info:'info',violet:'violet'}[tone==='default'?(kind||'default'):tone]||'default';
 const label=String(title||'Indicador');
 const content=<><div className="efferd-kpi-head"><span className="efferd-kpi-label">{label}</span><span className="efferd-kpi-icon">{Icon&&<Icon size={19} strokeWidth={2.2}/>}</span></div><div className="efferd-kpi-main"><strong className={'efferd-kpi-value '+(String(value).length>12?'long':'')}>{value??'—'}</strong>{sub&&<span className="efferd-kpi-hint">{sub}</span>}</div>{onClick&&<ArrowUpRight size={15} className="efferd-kpi-go" aria-hidden="true"/>}</>;
 const cls='efferd-kpi tone-'+theme+(selected?' is-selected':'')+' '+className;
 return onClick?<button type="button" className={cls} onClick={onClick} aria-label={label+': '+String(value??'—')} data-efferd-kpi>{content}</button>:
 <article className={cls} role="group" aria-label={label+': '+String(value??'—')} data-efferd-kpi>{content}</article>;
}
