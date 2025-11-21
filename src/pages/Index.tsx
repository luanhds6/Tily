import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/ui/BrandLogo";
import { ShieldCheck, BarChart3, MessageSquare, Ticket, Video, FileText, Link as LinkIcon, Bell, Lock } from "lucide-react";

const features = [
  { title: "Gestão de Chamados e SLA", desc: "Fluxo completo de abertura, classificação, atendimento e resolução com SLAs monitorados.", icon: Ticket },
  { title: "Dashboard e Analytics", desc: "KPIs operacionais, ranking de atendentes e tendências para tomada de decisão.", icon: BarChart3 },
  { title: "Reuniões (WebRTC)", desc: "Videochamadas, compartilhamento de tela e registro de gravações para alinhamentos rápidos.", icon: Video },
  { title: "Chat Interno", desc: "Mensageria corporativa para colaboração entre equipes e atendimento ágil.", icon: MessageSquare },
  { title: "Arquivos e Fichário", desc: "Organização de documentos por ticket/sala com controle e histórico.", icon: FileText },
  { title: "Base de Conhecimento", desc: "Artigos e informativos centralizados para acelerar a resolução.", icon: FileText },
  { title: "Links Rápidos", desc: "Atalhos para sistemas corporativos essenciais e portais internos.", icon: LinkIcon },
  { title: "Notificações", desc: "Alertas sobre prazos, respostas e atualizações do atendimento.", icon: Bell },
  { title: "Controle de Acesso", desc: "Perfis, empresas e permissões integradas via Supabase e políticas RLS.", icon: Lock },
];

export default function Index() {
  const navigate = useNavigate();
  const handleLogin = () => navigate("/login");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-foreground">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo variant="wordmark" size={56} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full hidden sm:inline-flex" onClick={() => {
              const mail = "mailto:comercial@tily.app?subject=Apresentação%20Tily&body=Olá,%20gostaria%20de%20agendar%20uma%20demonstração.";
              window.location.href = mail;
            }}>Agendar demo</Button>
            <Button onClick={handleLogin} className="rounded-full h-10 px-6 text-base">Login</Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Suporte Corporativo moderno e mensurável</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Centralize demandas, acelere a resolução e acompanhe indicadores de desempenho com uma plataforma preparada para o público empresarial.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={handleLogin} className="rounded-full">Entrar</Button>
                <Button variant="outline" className="rounded-full" onClick={() => {
                  const mail = "mailto:comercial@tily.app?subject=Proposta%20Tily&body=Olá,%20tenho%20interesse%20no%20Tily%20para%20minha%20empresa.";
                  window.location.href = mail;
                }}>Solicitar proposta</Button>
              </div>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-white p-3">
                  <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" /> Segurança e acesso granular</div>
                  <div className="mt-1 text-xs text-muted-foreground">Políticas RLS e controle por empresas.</div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" /> Indicadores operacionais</div>
                  <div className="mt-1 text-xs text-muted-foreground">SLAs, ranking e produtividade.</div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" /> Comunicação integrada</div>
                  <div className="mt-1 text-xs text-muted-foreground">Chat, reuniões e notificações.</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-border shadow-soft bg-white/70 backdrop-blur p-6">
                <div className="flex items-center justify-center">
                  <BrandLogo size={280} />
                </div>
                <p className="mt-4 text-center text-muted-foreground">
                  Interface elegante e responsiva, pensada para o dia a dia corporativo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 md:p-6">
            <div className="text-center text-sm text-muted-foreground">Empresas que confiam</div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
              <img src="/placeholder.svg" alt="Logo" className="h-10 opacity-70" />
              <img src="/placeholder.svg" alt="Logo" className="h-10 opacity-70" />
              <img src="/placeholder.svg" alt="Logo" className="h-10 opacity-70" />
              <img src="/placeholder.svg" alt="Logo" className="h-10 opacity-70" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Recursos do Sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-border p-5 shadow-soft hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  {React.createElement(f.icon, { className: "h-5 w-5 text-muted-foreground" })}
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                </div>
                <p className="mt-2 text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h3 className="text-2xl font-bold">Pronto para elevar o suporte da sua empresa?</h3>
          <p className="mt-2 text-muted-foreground">Agende uma demonstração e conheça o Tily aplicado ao seu cenário.</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button className="rounded-full" onClick={handleLogin}>Login</Button>
            <Button variant="outline" className="rounded-full" onClick={() => {
              const mail = "mailto:comercial@tily.app?subject=Apresentação%20Tily&body=Olá,%20gostaria%20de%20agendar%20uma%20demonstração.";
              window.location.href = mail;
            }}>Agendar demo</Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 bg-white/70">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Tily — Sistema de Chamados
        </div>
      </footer>
    </div>
  );
}
