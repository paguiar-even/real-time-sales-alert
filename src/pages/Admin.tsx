import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, LogOut, Building2, Loader2, Trash2 } from 'lucide-react';
import evenLogo from '@/assets/even-logo.png';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email_domains: string[];
  is_active: boolean;
  logo_url: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [emailDomains, setEmailDomains] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      });
      navigate('/monitor');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchTenants();
    }
  }, [isAdmin]);

  const fetchTenants = async () => {
    setLoadingTenants(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes.',
        variant: 'destructive',
      });
    } else {
      setTenants(data || []);
    }
    setLoadingTenants(false);
  };

  const handleCreateTenant = async () => {
    if (!name || !slug || !emailDomains) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const domains = emailDomains.split(',').map(d => d.trim().toLowerCase());

    const { error } = await supabase
      .from('tenants')
      .insert({
        name,
        slug: slug.toLowerCase(),
        email_domains: domains,
      });

    if (error) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o cliente.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Cliente criado com sucesso.',
      });
      setName('');
      setSlug('');
      setEmailDomains('');
      setDialogOpen(false);
      fetchTenants();
    }
    setSaving(false);
  };

  const handleToggleActive = async (tenant: Tenant) => {
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id);

    if (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } else {
      setTenants(prev =>
        prev.map(t =>
          t.id === tenant.id ? { ...t, is_active: !t.is_active } : t
        )
      );
      toast({
        title: 'Atualizado',
        description: `${tenant.name} foi ${!tenant.is_active ? 'ativado' : 'desativado'}.`,
      });
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Tem certeza que deseja excluir "${tenant.name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenant.id);

    if (error) {
      console.error('Error deleting tenant:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o cliente.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Excluído',
        description: `${tenant.name} foi excluído.`,
      });
      fetchTenants();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={evenLogo} alt="Even" className="h-8" />
            <span className="text-xl font-semibold text-foreground">Painel Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/monitor')}>
              <Building2 className="h-4 w-4 mr-2" />
              Monitor
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Clientes</CardTitle>
              <CardDescription>Gerencie os clientes que têm acesso ao sistema.</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Cliente</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo cliente para acesso ao monitor de vendas.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Pix do Milhão"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      placeholder="Ex: pdm"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Identificador único usado no webhook.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domains">Domínios de Email</Label>
                    <Input
                      id="domains"
                      placeholder="Ex: empresa.com.br, empresa.com"
                      value={emailDomains}
                      onChange={(e) => setEmailDomains(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separe múltiplos domínios por vírgula.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTenant} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente cadastrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Domínios</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {tenant.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tenant.email_domains.map((domain) => (
                            <span
                              key={domain}
                              className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs"
                            >
                              {domain}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tenant.is_active}
                            onCheckedChange={() => handleToggleActive(tenant)}
                          />
                          <span className={tenant.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                            {tenant.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTenant(tenant)}
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
      </main>
    </div>
  );
};

export default Admin;
