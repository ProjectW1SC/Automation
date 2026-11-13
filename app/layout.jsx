import './globals.css';
import './motion-system.css';
import './reference-design.css';
import './crm-themes.css';
import './settings.css';
import './report-print.css';
import './efferd-crm.css';
import './dashboard-charts.css';
import './sales-workspace.css';
import './visual-overrides.css';
import './brand-auth.css';
import './infinitum-reference.css';
import './office-console.css';
import './infinitum-login.css';
import './integrations-console.css';
import './office-superagent.css';
import './blackhole-infinitum-studio.css';
import './blackhole-legibility.css';
import './crm-unified-2026.css';
import './wa-auto-inbox.css';
import './prestige-exact-reference.css';
import './prestige-dashboard.css';
import './prestige-office-lists.css';
import './prestige-final-polish.css';
import './crm-responsive-themes.css';
import './crm-judicial-history.css';
import './crm-case-client-link.css';
import './legal-stationery.css';
import './crm-mobile-all-areas.css';
import './crm-generator-names.css';
import './infinitum-video-motion.css';
import './infinitum-prestige-all-tabs.css';
// Carregada por último para limitar o vídeo real ao login, sem alterar o CRM.
import './infinitum-login-video.css';
import {WorkspaceSessionProvider} from '../components/workspace-session-provider';
export const metadata={title:'INFINITUM • CRM Jurídico W1',description:'Gestão operacional de processos, agenda, clientes e atendimentos',icons:{icon:'/branding/projectw1sc-symbol.svg'}};
// Restaura o único tema principal antes da primeira pintura; migra a preferência legada.
const hydrateTheme='try{if(localStorage.getItem("projectw1sc.crm-theme")!=="infinitum")localStorage.setItem("projectw1sc.crm-theme","infinitum")}catch(e){}document.documentElement.dataset.crmTheme="infinitum"';
export default function RootLayout({children}){return <html lang="pt-BR" data-crm-theme="infinitum" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:hydrateTheme}}/></head><body><WorkspaceSessionProvider>{children}</WorkspaceSessionProvider></body></html>}
