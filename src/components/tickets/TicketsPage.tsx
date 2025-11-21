import React, { useState } from "react";
import { Ticket } from "@/hooks/useTickets";
import { Session, User } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketListView } from "./TicketListView";
import { NewTicketForm } from "./NewTicketForm";

interface TicketsPageProps {
  session: Session;
  users: User[];
  tickets: Ticket[];
  onTicketClick: (ticketId: string) => void;
  onCreateTicket: (data: any) => void;
}

export function TicketsPage({ session, users, tickets, onTicketClick, onCreateTicket }: TicketsPageProps) {
  const access = useAccessControl(session);
  const isAdmin = !!access?.perms && access.perms.role === "master";
  const [tab, setTab] = useState<string>(isAdmin ? "todos" : "meus");

  const myTickets = tickets.filter((t) => t.authorId === session.id);

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Chamados</h1>
        <p className="text-muted-foreground mt-1">Navegue entre Meus, Todos e Novo Chamado</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="meus">Meus Chamados</TabsTrigger>
          {isAdmin && <TabsTrigger value="todos">Todos Chamados</TabsTrigger>}
          <TabsTrigger value="novo">Novo Chamado</TabsTrigger>
        </TabsList>

        <TabsContent value="meus">
          <TicketListView
            tickets={myTickets}
            users={users}
            onTicketClick={onTicketClick}
            title="Meus Chamados"
            isAdmin={false}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="todos">
            <TicketListView
              tickets={tickets}
              users={users}
              onTicketClick={onTicketClick}
              title="Todos os Chamados"
              isAdmin={true}
            />
          </TabsContent>
        )}

        <TabsContent value="novo">
          <NewTicketForm
            onSubmit={(data) => {
              onCreateTicket(data);
              setTab("meus");
            }}
            onCancel={() => setTab(isAdmin ? "todos" : "meus")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
