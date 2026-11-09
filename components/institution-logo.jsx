'use client';
import {useEffect,useMemo,useState} from 'react';
import {Landmark} from 'lucide-react';
import {getInstitutionBrand} from '../lib/institution-brands.mjs';
// A custom uploaded mark takes precedence over a verified public corporate favicon.
// For unidentified offices, show a deliberate monogram rather than an unrelated company's logo.
export default function InstitutionLogo({name,size='md',showName=false,customUrl='',kind=''}) {
 const [failed,setFailed]=useState(false);
 const brand=getInstitutionBrand(name);
 const text=String(name||'').trim();
 const mark=text.replace(/[./&-]/g,' ').split(/\s+/).filter(Boolean);
 const initials=mark.length>1?(mark[0].charAt(0)+mark[1].charAt(0)).toUpperCase():text.slice(0,2).toUpperCase()||'?';
 const variant=[...text].reduce((v,c)=>v+c.charCodeAt(0),0)%6;
 const src=customUrl||(!failed&&brand?'https://www.google.com/s2/favicons?domain='+encodeURIComponent(brand.domain)+'&sz=128':'');
 useEffect(()=>{setFailed(false)},[name,customUrl]);
 return <span className={'reference-institution-logo reference-institution-logo-'+size} title={brand?.name||text||'Instituição'}>
  <span className={'reference-institution-mark reference-institution-variant-'+variant}>
   {src&&!failed?<img alt={'Identidade visual de '+(brand?.name||name)} src={src}
     loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:
    <span className="reference-institution-fallback" aria-label={'Identificação de '+(text||'instituição')}>{text?initials:<Landmark size={17}/>}</span>}
  </span>
  {showName&&<span className="reference-institution-text">{text||'Não informada'}</span>}
 </span>;
}