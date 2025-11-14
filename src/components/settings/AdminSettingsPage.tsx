import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProfilesManagementView from "@/components/users/ProfilesManagementView";
import { ProfileView } from "@/components/profile/ProfileView";
import { SettingsView } from "@/components/settings/SettingsView";
import AccessCategoriesView from "@/components/settings/AccessCategoriesView";
import { Session, User } from "@/hooks/useAuth";
import { Ticket } from "@/hooks/useTickets";

interface AdminSettingsPageProps {
  session: Session;
  users: User[];
  tickets: Ticket[];
  onCreateUser: (data: { name: string; email: string; password: string; role: "user" | "master" }) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

export default function AdminSettingsPage({
  session,
  users,
  tickets,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: AdminSettingsPageProps) {
  const isMaster = session.role === "master";
  const currentUser = users.find((u) => u.id === session.id);
  const defaultTab = isMaster ? (currentUser ? "users" : "profile") : "profile";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, seu perfil e preferências</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="settings">Preferências</TabsTrigger>
          {isMaster && <TabsTrigger value="access">Acesso</TabsTrigger>}
        </TabsList>

        <TabsContent value="users">
          {isMaster ? (
            <ProfilesManagementView />
          ) : (
            <div className="p-6 border border-border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground">
                Somente usuários com papel <span className="font-medium text-foreground">Master</span> podem gerenciar usuários.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <ProfileView session={session} tickets={tickets} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsView />
        </TabsContent>

        <TabsContent value="access">
          {isMaster ? (
            <AccessCategoriesView />
          ) : (
            <div className="p-6 border border-border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground">
                Somente usuários com papel <span className="font-medium text-foreground">Master</span> podem gerenciar categorias de acesso.
              </p>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
