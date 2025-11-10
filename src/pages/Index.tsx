import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/ui/BrandLogo";

const features = [
  { title: "Chamados e SLA", desc: "Abertura, acompanhamento, resolução e métricas de SLA com alertas.", emoji: "🎫" },
  { title: "Dashboard e Analytics", desc: "KPIs, ranking de atendentes, tendências e relatórios.", emoji: "📊" },
  { title: "Reuniões (WebRTC)", desc: "Videochamadas, compartilhamento de tela e gravações com salvamento automático.", emoji: "🎥" },
  { title: "Chat Interno", desc: "Mensageria prática para suporte e colaboração entre equipes.", emoji: "💬" },
  { title: "Arquivos e Fichário", desc: "Upload e organização de documentos por sala/ticket.", emoji: "🗂️" },
  { title: "Base de Conhecimento", desc: "Artigos e informativos para agilizar atendimentos.", emoji: "📚" },
  { title: "Links Rápidos", desc: "Acesso imediato a sistemas e portais essenciais.", emoji: "🔗" },
  { title: "Notificações", desc: "Alertas de respostas, prazos e atualizações relevantes.", emoji: "🔔" },
  { title: "Controle de Acesso", desc: "Perfis, empresas e permissões integradas ao Supabase.", emoji: "🔐" },
];

export default function Index() {
  const navigate = useNavigate();
  const handleLogin = () => navigate("/login");

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Wordmark sem bordas, apenas o nome ampliado */}
            <BrandLogo variant="wordmark" size={56} />
          </div>
          <Button onClick={handleLogin} className="rounded-full h-10 px-6 text-base">Login</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Sistema de Chamados Empresarial</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Centralize o suporte, acelere a resolução de demandas e tenha visibilidade total do seu atendimento.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={handleLogin} className="rounded-full">Entrar</Button>
                <Button variant="outline" className="rounded-full" onClick={() => {
                  const mail = "mailto:comercial@tily.app?subject=Orçamento%20Tily&body=Olá,%20tenho%20interesse%20no%20Tily.";
                  window.location.href = mail;
                }}>
                  FAÇA O SEU ORÇAMENTO
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-border shadow-soft bg-white/60 backdrop-blur p-6">
                <div className="flex items-center justify-center">
                  <BrandLogo size={280} />
                </div>
                <p className="mt-4 text-center text-muted-foreground">
                  Interface moderna, fluida e intuitiva para equipes de suporte.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Recursos do Sistema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-border p-5 shadow-soft hover:shadow-md transition-shadow">
                <div className="text-2xl">{f.emoji}</div>
                <h3 className="mt-2 font-semibold text-lg">{f.title}</h3>
                <p className="mt-1 text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold">Pronto para elevar o suporte da sua empresa?</h3>
          <p className="mt-2 text-muted-foreground">Solicite uma apresentação e orçamento personalizado.</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button className="rounded-full" onClick={handleLogin}>Login</Button>
            <Button variant="outline" className="rounded-full" onClick={() => {
              const mail = "mailto:comercial@tily.app?subject=Orçamento%20Tily&body=Olá,%20quero%20conhecer%20o%20Tily.";
              window.location.href = mail;
            }}>
              FAÇA O SEU ORÇAMENTO
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Tily — Sistema de Chamados
        </div>
      </footer>
    </div>
  );
}
