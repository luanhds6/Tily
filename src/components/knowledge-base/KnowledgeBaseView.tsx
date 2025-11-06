import React, { useState } from "react";
import { BookOpen, Search, Plus, Edit2, Trash2, Eye, ThumbsUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  views: number;
  helpful: number;
  createdAt: string;
  author: string;
}

const DEMO_ARTICLES: Article[] = [
  {
    id: "1",
    title: "Como resetar sua senha",
    category: "Conta",
    content: "Para resetar sua senha, acesse a página de login e clique em 'Esqueci minha senha'. Um email será enviado com as instruções de recuperação.",
    views: 245,
    helpful: 38,
    createdAt: "2025-01-15",
    author: "Admin TI",
  },
  {
    id: "2",
    title: "Configuração de VPN corporativa",
    category: "Rede",
    content: "Para configurar a VPN: 1) Baixe o cliente VPN; 2) Use suas credenciais corporativas; 3) Conecte ao servidor principal. Em caso de dúvidas, contate o suporte.",
    views: 189,
    helpful: 42,
    createdAt: "2025-01-10",
    author: "Admin TI",
  },
  {
    id: "3",
    title: "Solução de problemas de impressora",
    category: "Hardware",
    content: "Problemas comuns: 1) Verifique a conexão; 2) Reinicie a impressora; 3) Atualize os drivers; 4) Limpe a fila de impressão. Se persistir, abra um chamado.",
    views: 167,
    helpful: 29,
    createdAt: "2025-01-08",
    author: "Admin TI",
  },
  {
    id: "4",
    title: "Acesso remoto ao sistema",
    category: "Acesso",
    content: "Para acessar o sistema remotamente, use o portal web ou VPN. Credenciais: mesmas do login local. Suporte disponível 24/7 para emergências.",
    views: 203,
    helpful: 51,
    createdAt: "2025-01-05",
    author: "Admin Master",
  },
];

interface KnowledgeBaseViewProps {
  isAdmin: boolean;
}

export function KnowledgeBaseView({ isAdmin }: KnowledgeBaseViewProps) {
  const [articles, setArticles] = useState<Article[]>(DEMO_ARTICLES);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showForm, setShowForm] = useState(false);

  const categories = ["all", ...Array.from(new Set(articles.map((a) => a.category)))];

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            Base de Conhecimento
          </h1>
          <p className="text-muted-foreground mt-1">Artigos e soluções para problemas comuns</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-5 h-5" />
            Novo Artigo
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-soft">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 border border-input rounded-lg px-3 py-2 bg-background">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artigos..."
              className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Todas Categorias</option>
            {categories.filter((c) => c !== "all").map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* New Article Form */}
      {showForm && isAdmin && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-4">Novo Artigo</h3>
          <form className="space-y-4">
            <input
              placeholder="Título do artigo"
              className="w-full border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select className="w-full border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Selecione uma categoria</option>
              <option value="Conta">Conta</option>
              <option value="Rede">Rede</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Acesso">Acesso</option>
            </select>
            <textarea
              placeholder="Conteúdo do artigo..."
              rows={6}
              className="w-full border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button type="submit">Publicar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Articles List */}
      {!selectedArticle ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Nenhum artigo encontrado</p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="bg-card border border-border rounded-lg p-5 shadow-soft hover:shadow-medium transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {article.category}
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon">
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {article.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    {article.helpful}
                  </span>
                  <span>{new Date(article.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Article Detail */
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <Button variant="link" onClick={() => setSelectedArticle(null)} className="p-0 h-auto mb-4">
            ← Voltar
          </Button>
          <div className="flex items-start justify-between mb-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {selectedArticle.category}
            </span>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{selectedArticle.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <span>Por {selectedArticle.author}</span>
            <span>•</span>
            <span>{new Date(selectedArticle.createdAt).toLocaleDateString("pt-BR")}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {selectedArticle.views} visualizações
            </span>
          </div>
          <div className="prose max-w-none mb-6">
            <p className="text-foreground leading-relaxed">{selectedArticle.content}</p>
          </div>
          <div className="border-t border-border pt-6 mt-6">
            <p className="text-sm text-muted-foreground mb-3">Este artigo foi útil?</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 hover:border-success">
                <ThumbsUp className="w-4 h-4" />
                Sim ({selectedArticle.helpful})
              </Button>
              <Button variant="outline" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Abrir chamado
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
