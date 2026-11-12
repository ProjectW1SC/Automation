/** @type {import('next').NextConfig} */
const nextConfig={
 reactStrictMode:true,poweredByHeader:false,
 async redirects(){
  return [
   {source:'/tarefas',destination:'/prazos',permanent:false},
   {source:'/report',destination:'/relatorios',permanent:false},
   {source:'/finalizados',destination:'/clientes',permanent:false},
   {source:'/revisar',destination:'/clientes',permanent:false},
   {source:'/minhas-atividades',destination:'/agentes',permanent:false},
   {source:'/veredito',destination:'/processos',permanent:false}
  ];
 }
};
export default nextConfig;
