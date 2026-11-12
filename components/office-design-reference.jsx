'use client';
import Link from 'next/link';
import {ArrowLeft,Image as ImageIcon,Layers3,Monitor,MousePointer2} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
function Gallery(){
 return <main className="inf-studio blackhole-reference-gallery">
  <header className="inf-heading"><div><small>BLACKHOLE / DESIGN SYSTEM</small><h1>Guia visual</h1>
   <p>Referências extraídas do vídeo do Infinitum enviado e propostas visuais criadas para orientar a reconstrução do CRM.</p></div>
   <Link className="inf-btn" href="/"><ArrowLeft size={14}/> Voltar ao painel</Link></header>
  <section className="inf-panel"><div className="gallery-title"><div className="gallery-icon"><Monitor size={19}/></div><div><h2>Infinitum real · gravação enviada</h2>
   <p>Capturas da navegação, dos procedimentos, da gestão de usuários, das integrações e da página inicial.</p></div></div>
   <img className="gallery-board" src="/design-references/infinitum-real-reference.webp" alt="Painel com cinco capturas reais do CRM Infinitum retiradas do vídeo enviado." loading="lazy"/>
  </section>
  <section className="inf-panel"><div className="gallery-title"><div className="gallery-icon"><Layers3 size={19}/></div><div><h2>Propostas visuais · BLACKHOLE</h2>
   <p>Quatro telas de referência: agenda, painel principal, WhatsApp integrado e login/cadastro.</p></div></div>
   <img className="gallery-board" src="/design-references/blackhole-ui-concepts.webp" alt="Painel com quatro conceitos visuais de interface para o BLACKHOLE." loading="lazy"/>
  </section>
  <section className="gallery-principles">
   <div><MousePointer2 size={17}/><strong>Componentes reais</strong><p>Botões, filtros, formulários, tabelas e navegação são elementos funcionais do aplicativo.</p></div>
   <div><ImageIcon size={17}/><strong>Imagem como referência</strong><p>As imagens ficam nesta galeria para comparação visual. Não são usadas como fundo falso de páginas ou botões.</p></div>
   <div><Layers3 size={17}/><strong>Mesmo padrão em todas as áreas</strong><p>O design system define espaçamento, contraste, hierarquia, cartões, tabelas e estados em todas as telas.</p></div>
  </section>
 </main>
}
export default function OfficeDesignReference(){return <SecuredWorkspace active="Guia visual">{()=> <Gallery/>}</SecuredWorkspace>}
