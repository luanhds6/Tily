import React, { useState } from "react";
import { User } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Shield, User as UserIcon, Trash2, Ban, CheckCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UsersManagementViewProps {
  users: User[];
  currentUser: User;
  onCreateUser: (data: { name: string; email: string; password: string; role: "user" | "admin" }) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

export function UsersManagementView({
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}: UsersManagementViewProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onCreateUser({ name, email, password, role });
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setIsCreateDialogOpen(false);
      toast({
        title: "Usuário criado!",
        description: `${name} foi adicionado com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = (user: User) => {
    onUpdateUser(user.id, { active: !user.active });
    toast({
      title: user.active ? "Usuário desativado" : "Usuário ativado",
      description: `${user.name} foi ${user.active ? "desativado" : "ativado"} com sucesso`,
    });
  };

  const handleChangeRole = (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    onUpdateUser(user.id, { role: newRole });
    toast({
      title: "Papel alterado",
      description: `${user.name} agora é ${newRole === "admin" ? "Administrador" : "Usuário"}`,
    });
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Tem certeza que deseja excluir ${user.name}?`)) {
      onDeleteUser(user.id);
      toast({
        title: "Usuário excluído",
        description: `${user.name} foi removido do sistema`,
      });
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === "master") return <Shield className="h-4 w-4" />;
    if (role === "admin") return <Shield className="h-4 w-4" />;
    return <UserIcon className="h-4 w-4" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === "master")
      return (
        <Badge className="bg-purple-500 text-white">
          <Shield className="h-3 w-3 mr-1" />
          Master
        </Badge>
      );
    if (role === "admin")
      return (
        <Badge className="bg-blue-500 text-white">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    return (
      <Badge variant="secondary">
        <UserIcon className="h-3 w-3 mr-1" />
        Usuário
      </Badge>
    );
  };

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    admins: users.filter((u) => u.role === "admin" || u.role === "master").length,
    users: users.filter((u) => u.role === "user").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie usuários e permissões do sistema
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo usuário
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João Silva"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@empresa.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Papel</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "user" | "admin")}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Usuário</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Total de Usuários</div>
          <div className="text-3xl font-bold">{userStats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Usuários Ativos</div>
          <div className="text-3xl font-bold text-green-600">{userStats.active}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Administradores</div>
          <div className="text-3xl font-bold text-blue-600">{userStats.admins}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Usuários Comuns</div>
          <div className="text-3xl font-bold text-purple-600">{userStats.users}</div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <Input
          placeholder="Buscar usuários por nome, email ou papel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Users List in two columns: Admins (left), Users (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Administradores</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredUsers.filter((u) => u.role === "admin" || u.role === "master").length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Nenhum administrador encontrado</div>
            ) : (
              filteredUsers
                .filter((u) => u.role === "admin" || u.role === "master")
                .map((user) => (
                  <div key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{user.name}</p>
                            {getRoleBadge(user.role)}
                            {!user.active && (
                              <Badge variant="destructive" className="text-xs">Inativo</Badge>
                            )}
                            {user.id === currentUser.id && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      {user.role !== "master" && user.id !== currentUser.id && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleToggleActive(user)} title={user.active ? "Desativar" : "Ativar"}>
                            {user.active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleChangeRole(user)} title={user.role === "admin" ? "Tornar usuário" : "Tornar admin"}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user)} title="Excluir usuário">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Usuários</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredUsers.filter((u) => u.role === "user").length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Nenhum usuário encontrado</div>
            ) : (
              filteredUsers
                .filter((u) => u.role === "user")
                .map((user) => (
                  <div key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{user.name}</p>
                            {getRoleBadge(user.role)}
                            {!user.active && (
                              <Badge variant="destructive" className="text-xs">Inativo</Badge>
                            )}
                            {user.id === currentUser.id && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      {user.id !== currentUser.id && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleToggleActive(user)} title={user.active ? "Desativar" : "Ativar"}>
                            {user.active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleChangeRole(user)} title="Tornar admin">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user)} title="Excluir usuário">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
