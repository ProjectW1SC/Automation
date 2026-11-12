const safe=value=>String(value||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,300);
const escapeIcs=value=>safe(value).replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;');
export function createIcsEvent({title,date,description='',uid='blackhole-manual'}={}){
 if(!safe(title))throw new Error('Informe o título do compromisso.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Informe uma data válida.');
 const compact=date.replaceAll('-','');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BLACKHOLE//Agenda Juridica//PT-BR',
  'CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+escapeIcs(uid)+'@blackhole.local',
  'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
  'DTSTART;VALUE=DATE:'+compact,'DTEND;VALUE=DATE:'+formatNextDate(date),
  'SUMMARY:'+escapeIcs(title),'DESCRIPTION:'+escapeIcs(description||'Compromisso criado manualmente no BLACKHOLE. Confira a data nos autos.'),
  'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
function formatNextDate(date){
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);
 return d.toISOString().slice(0,10).replaceAll('-','');
}
