import React, { useState } from "react";
import { User, Mail, Shield, Calendar, Edit2, Save, X } from "lucide-react";
import { Session } from "../../hooks/useAuth";
import { Ticket } from "../../hooks/useTickets";

interface ProfileViewProps {
  session: Session;
  tickets: Ticket[];
}

export function ProfileView({ session, tickets }: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session.name,
    email: session.email,
  });

  const myTickets = tickets.filter((t) => t.authorId === session.id);
  const myResolvedTickets = myTickets.filter((t) => t.status === "Resolvido" || t.status === "Fechado");

  const avgResponseTime = myResolvedTickets.length > 0
    ? myResolvedTickets.reduce((acc, t) => {
        if (t.resolvedAt) {
          const diff = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
          return acc + diff / (1000 * 60 * 60);
        }
        return acc;
      }, 0) / myResolvedTickets.length
    : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <User className="w-8 h-8 text-primary" />
          Meu Perfil
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-soft">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{session.name}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  session.role === "master" ? "bg-warning/10 text-warning" :
                  session.role === "admin" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {session.role === "master" ? "Master" : session.role === "admin" ? "Administrador" : "Usuário"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {editing ? <X className="w-5 h-5 text-muted-foreground" /> : <Edit2 className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>

          {editing ? (
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{session.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Função</p>
                  <p className="text-sm font-medium text-foreground">
                    {session.role === "master" ? "Administrador Master" :
                     session.role === "admin" ? "Administrador" :
                     "Usuário"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Membro desde</p>
                  <p className="text-sm font-medium text-foreground">Janeiro 2025</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 shadow-soft">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Meus Chamados</h3>
            <p className="text-4xl font-bold text-primary">{myTickets.length}</p>
          </div>
          <div className="bg-success/5 border border-success/20 rounded-lg p-6 shadow-soft">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Resolvidos</h3>
            <p className="text-4xl font-bold text-success">{myResolvedTickets.length}</p>
          </div>
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-6 shadow-soft">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Tempo Médio</h3>
            <p className="text-4xl font-bold text-warning">{Math.round(avgResponseTime * 10) / 10}h</p>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-foreground mb-4">Segurança</h3>
        <div className="space-y-3">
          <button className="w-full sm:w-auto px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors text-sm">
            Alterar Senha
          </button>
          <button className="w-full sm:w-auto px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors text-sm ml-0 sm:ml-2">
            Autenticação em Dois Fatores
          </button>
        </div>
      </div>
    </div>
  );
}
