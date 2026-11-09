'use client';
import {useState} from 'react';
import {Landmark} from 'lucide-react';
import {getInstitutionBrand} from '../lib/institution-brands.mjs';
export default function InstitutionLogo({name,size='md',showName=false}){
 const [failed,setFailed]=useState(false);
 const brand=getInstitutionBrand(name);
 const initial=String(name||'?').trim().charAt(0).toLocaleUpperCase('pt-BR')||'?';
 return <span className={'reference-institution-logo reference-institution-logo-'+size} title={brand?.name||name||'Instituição'}>
  <span className="reference-institution-mark">
   {brand&&!failed?
    <img alt={'Logo de '+brand.name} loading="lazy" decoding="async" referrerPolicy="no-referrer"
      src={'https://www.google.com/s2/favicons?domain='+brand.domain+'&sz=128'}
      onError={()=>setFailed(true)}/>:
    <span className="reference-institution-fallback" aria-label={'Instituição '+(name||'não informada')}>{name?initial:<Landmark size={17}/>}</span>}
  </span>
  {showName&&<span className="reference-institution-text">{name||'Não informada'}</span>}
 </span>;
}
