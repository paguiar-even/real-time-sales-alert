import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw, 
  Key, 
  Trash2,
  Clock,
  User,
  Search,
  Link,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StaffToken {
  id: string;
  user_id: string;
  user_email: string;
  token: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface SearchedUser {
  id: string;
  email: string;
  created_at: string;
}

export function StaffTokensManager() {
  const [tokens, setTokens] = useState<StaffToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedUrlTokenId, setCopiedUrlTokenId] = useState<string | null>(null);

  // Search state
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');

  // Form state
  const [tokenName, setTokenName] = useState('');

  const fetchTokens = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_staff_tokens');

    if (error) {
      console.error('Error fetching tokens:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tokens.',
        variant: 'destructive',
      });
    } else {
      setTokens(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleSearchUsers = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: 'Digite um email',
        description: 'Informe um email para buscar.',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    const { data, error } = await supabase.rpc('search_users_by_email', { 
      search_email: searchEmail.trim() 
    });

    if (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar usuários.',
        variant: 'destructive',
      });
    } else {
      setSearchResults(data || []);
      if (data?.length === 0) {
        toast({
          title: 'Nenhum resultado',
          description: 'Nenhum usuário encontrado com este email.',
        });
      }
    }
    setSearching(false);
  };

  const selectUser = (user: SearchedUser) => {
    setSelectedUserId(user.id);
    setSelectedUserEmail(user.email);
    setSearchResults([]);
    setSearchEmail('');
  };

  const handleCreateToken = async () => {
    if (!selectedUserId || !tokenName.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um usuário e informe um nome para o token.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('staff_access_tokens')
      .insert({
        user_id: selectedUserId,
        name: tokenName.trim()
      });

    if (error) {
      console.error('Error creating token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o token.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Token criado',
        description: `Token "${tokenName}" criado com sucesso.`,
      });
      setTokenName('');
      setSelectedUserId('');
      setSelectedUserEmail('');
      setCreateDialogOpen(false);
      fetchTokens();
    }

    setSaving(false);
  };

  const copyToken = async (token: StaffToken) => {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopiedTokenId(token.id);
      toast({
        title: 'Token copiado',
        description: 'Token copiado para a área de transferência.',
      });
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o token.',
        variant: 'destructive',
      });
    }
  };

  const copyTenantsUrl = async (token: StaffToken) => {
    try {
      const url = `${window.location.origin}/tenants?token=${token.token}`;
      await navigator.clipboard.writeText(url);
      setCopiedUrlTokenId(token.id);
      toast({
        title: 'URL copiada',
        description: 'URL da lista de tenants copiada.',
      });
      setTimeout(() => setCopiedUrlTokenId(null), 2000);
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a URL.',
        variant: 'destructive',
      });
    }
  };

  const toggleTokenActive = async (token: StaffToken) => {
    const newStatus = !token.is_active;
    
    const { error } = await supabase
      .from('staff_access_tokens')
      .update({ is_active: newStatus })
      .eq('id', token.id);

    if (error) {
      console.error('Error toggling token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o token.',
        variant: 'destructive',
      });
    } else {
      setTokens(prev => prev.map(t => 
        t.id === token.id ? { ...t, is_active: newStatus } : t
      ));
      toast({
        title: newStatus ? 'Token ativado' : 'Token desativado',
        description: `O token "${token.name}" foi ${newStatus ? 'ativado' : 'desativado'}.`,
      });
    }
  };

  const deleteToken = async (token: StaffToken) => {
    if (!confirm(`Tem certeza que deseja excluir o token "${token.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('staff_access_tokens')
      .delete()
      .eq('id', token.id);

    if (error) {
      console.error('Error deleting token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o token.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Token excluído',
        description: `O token "${token.name}" foi excluído.`,
      });
      fetchTokens();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return null;
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Key className="h-6 w-6" />
            Tokens de Acesso Even
          </CardTitle>
          <CardDescription>
            Gerencie os tokens de acesso para usuários da Even visualizarem monitores de clientes.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTokens} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setSearchEmail('');
              setSearchResults([]);
              setSelectedUserId('');
              setSelectedUserEmail('');
              setTokenName('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Token de Acesso</DialogTitle>
                <DialogDescription>
                  Crie um token para permitir que um usuário Even acesse monitores de clientes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Search users */}
                <div className="space-y-2">
                  <Label>Buscar Usuário Even</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o email..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    />
                    <Button variant="outline" onClick={handleSearchUsers} disabled={searching}>
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selecione o Usuário</Label>
                    <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                          onClick={() => selectUser(user)}
                        >
                          {user.email}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected user */}
                {selectedUserEmail && (
                  <div className="space-y-2">
                    <Label>Usuário Selecionado</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedUserEmail}</span>
                    </div>
                  </div>
                )}

                {/* Token name */}
                <div className="space-y-2">
                  <Label htmlFor="token-name">Nome do Token</Label>
                  <Input
                    id="token-name"
                    placeholder="Ex: Acesso Suporte"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Um nome descritivo para identificar o token.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateToken} disabled={saving || !selectedUserId || !tokenName.trim()}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Token
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum token de acesso criado.</p>
            <p className="text-sm">Clique em "Novo Token" para criar.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>URL Tenants</TableHead>
                <TableHead>Último Uso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id} className={!token.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{token.user_email}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {token.token.substring(0, 8)}...{token.token.slice(-4)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToken(token)}
                      >
                        {copiedTokenId === token.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyTenantsUrl(token)}
                      className="gap-1"
                    >
                      {copiedUrlTokenId === token.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Link className="h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                  </TableCell>
                  <TableCell>
                    {token.last_used_at ? (
                      <div className="flex flex-col">
                        <span className="text-sm">{formatDate(token.last_used_at)}</span>
                        <span className="text-xs text-muted-foreground">{getTimeAgo(token.last_used_at)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Nunca usado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={token.is_active}
                        onCheckedChange={() => toggleTokenActive(token)}
                      />
                      {token.is_active ? (
                        <Badge className="bg-green-500/10 text-green-600">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteToken(token)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
