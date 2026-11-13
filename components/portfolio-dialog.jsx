'use client';
import {useEffect,useId,useRef} from 'react';
import {X} from 'lucide-react';

// O top layer nativo evita que a lista longa ou um ancestral com transform esconda o formulário.
export default function PortfolioDialog({title,onClose,busy=false,notice='',children}){
 const ref=useRef(null),titleId=useId();
 useEffect(()=>{
  const dialog=ref.current;
  const overflow=document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow='hidden';
  dialog.querySelector('input:not([type="checkbox"]),textarea,select')?.focus();
  return()=>{dialog.close();document.body.style.overflow=overflow};
 },[]);
 return <dialog ref={ref} className="inf-panel lx-action-dialog" aria-labelledby={titleId} aria-modal="true" aria-busy={busy}
  onCancel={event=>{event.preventDefault();if(!busy)onClose()}}>
  <header className="lx-dialog-header"><div><span className="lx-dialog-eyebrow">INFINITUM · CARTEIRA</span><h2 id={titleId}>{title}</h2></div>
   <button type="button" className="inf-btn lx-dialog-close" aria-label="Fechar janela" disabled={busy} onClick={onClose}><X size={20}/></button>
  </header>
  {notice&&<p className="lx-dialog-notice" role="status">{notice}</p>}
  {children}
 </dialog>;
}
