import { useState, useEffect, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Plus, LogOut, Building2, Loader2, Trash2, Search, UserPlus, Users, Upload, Image, Pencil, History, Copy, Check, RefreshCw, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import evenLogo from '@/assets/even-logo.png';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email_domains: string[];
  is_active: boolean;
  logo_url: string | null;
  webhook_token: string | null;
  created_at: string;
}

interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  created_at: string;
  user_email?: string;
  tenant_name?: string;
}

interface SearchedUser {
  id: string;
  email: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  tenant_id: string | null;
  tenant_name: string;
  action: string;
  changed_by: string | null;
  changed_by_email: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingUserTenants, setLoadingUserTenants] = useState(true);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTenantForLogo, setSelectedTenantForLogo] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  // Form state for new tenant
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [emailDomains, setEmailDomains] = useState('');

  // Form state for editing tenant
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editEmailDomains, setEditEmailDomains] = useState('');

  // Form state for user assignment
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [regeneratingTokenId, setRegeneratingTokenId] = useState<string | null>(null);

  // Webhook base URL
  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-webhook`;

  const copyWebhookUrl = async (tenant: Tenant) => {
    const url = `${webhookBaseUrl}/${tenant.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedWebhookId(tenant.id);
      toast({
        title: 'URL copiada',
        description: 'URL do webhook copiada para a área de transferência.',
      });
      setTimeout(() => setCopiedWebhookId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a URL.',
        variant: 'destructive',
      });
    }
  };

  const copyWebhookToken = async (tenant: Tenant) => {
    if (!tenant.webhook_token) return;
    try {
      await navigator.clipboard.writeText(tenant.webhook_token);
      setCopiedTokenId(tenant.id);
      toast({
        title: 'Token copiado',
        description: 'Token do webhook copiado para a área de transferência.',
      });
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o token.',
        variant: 'destructive',
      });
    }
  };

  const regenerateWebhookToken = async (tenant: Tenant) => {
    if (!confirm(`Tem certeza que deseja regenerar o token de "${tenant.name}"? O token atual deixará de funcionar.`)) {
      return;
    }

    setRegeneratingTokenId(tenant.id);
    
    // Generate new token using crypto
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { error } = await supabase
      .from('tenants')
      .update({ webhook_token: newToken })
      .eq('id', tenant.id);

    if (error) {
      console.error('Error regenerating token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível regenerar o token.',
        variant: 'destructive',
      });
    } else {
      await logAuditEntry(
        tenant.id,
        tenant.name,
        'token_regenerated',
        { webhook_token: '***' },
        { webhook_token: '***' }
      );
      
      setTenants(prev =>
        prev.map(t =>
          t.id === tenant.id ? { ...t, webhook_token: newToken } : t
        )
      );
      
      toast({
        title: 'Token regenerado',
        description: `Novo token gerado para ${tenant.name}. Copie e atualize no n8n.`,
      });
    }
    
    setRegeneratingTokenId(null);
  };

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
      fetchUserTenants();
      fetchAuditLogs();
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

  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    const { data, error } = await supabase
      .from('tenant_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
    } else {
      setAuditLogs(data || []);
    }
    setLoadingAuditLogs(false);
  };

  const logAuditEntry = async (
    tenantId: string | null,
    tenantName: string,
    action: string,
    oldValues?: Record<string, any> | null,
    newValues?: Record<string, any> | null
  ) => {
    try {
      await supabase.from('tenant_audit_log').insert({
        tenant_id: tenantId,
        tenant_name: tenantName,
        action,
        changed_by: user?.id,
        changed_by_email: user?.email,
        old_values: oldValues || null,
        new_values: newValues || null,
      });
      // Refresh audit logs
      fetchAuditLogs();
    } catch (error) {
      console.error('Error logging audit entry:', error);
    }
  };

  const fetchUserTenants = async () => {
    setLoadingUserTenants(true);
    const { data, error } = await supabase
      .from('user_tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user_tenants:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as associações.',
        variant: 'destructive',
      });
      setLoadingUserTenants(false);
      return;
    }

    // Enrich with tenant names and user emails
    const enrichedData: UserTenant[] = [];
    for (const ut of data || []) {
      const { data: emailData } = await supabase.rpc('get_user_email', { user_uuid: ut.user_id });
      const tenant = tenants.find(t => t.id === ut.tenant_id);
      enrichedData.push({
        ...ut,
        user_email: emailData || 'Unknown',
        tenant_name: tenant?.name || 'Unknown'
      });
    }
    setUserTenants(enrichedData);
    setLoadingUserTenants(false);
  };

  // Re-fetch user tenants when tenants change
  useEffect(() => {
    if (isAdmin && tenants.length > 0) {
      fetchUserTenants();
    }
  }, [tenants, isAdmin]);

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

    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name,
        slug: slug.toLowerCase(),
        email_domains: domains,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o cliente.',
        variant: 'destructive',
      });
    } else {
      await logAuditEntry(data.id, name, 'created', null, {
        name,
        slug: slug.toLowerCase(),
        email_domains: domains,
      });
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
    const newStatus = !tenant.is_active;
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: newStatus })
      .eq('id', tenant.id);

    if (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } else {
      await logAuditEntry(
        tenant.id,
        tenant.name,
        newStatus ? 'activated' : 'deactivated',
        { is_active: tenant.is_active },
        { is_active: newStatus }
      );
      setTenants(prev =>
        prev.map(t =>
          t.id === tenant.id ? { ...t, is_active: newStatus } : t
        )
      );
      toast({
        title: 'Atualizado',
        description: `${tenant.name} foi ${newStatus ? 'ativado' : 'desativado'}.`,
      });
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Tem certeza que deseja excluir "${tenant.name}"?`)) {
      return;
    }

    // Log before delete since tenant_id will be null after
    await logAuditEntry(null, tenant.name, 'deleted', {
      name: tenant.name,
      slug: tenant.slug,
      email_domains: tenant.email_domains,
      is_active: tenant.is_active,
    }, null);

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

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditSlug(tenant.slug);
    setEditEmailDomains(tenant.email_domains.join(', '));
    setEditDialogOpen(true);
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant || !editName || !editSlug || !editEmailDomains) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const domains = editEmailDomains.split(',').map(d => d.trim().toLowerCase());

    const { error } = await supabase
      .from('tenants')
      .update({
        name: editName,
        slug: editSlug.toLowerCase(),
        email_domains: domains,
      })
      .eq('id', editingTenant.id);

    if (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cliente.',
        variant: 'destructive',
      });
    } else {
      await logAuditEntry(
        editingTenant.id,
        editingTenant.name,
        'updated',
        {
          name: editingTenant.name,
          slug: editingTenant.slug,
          email_domains: editingTenant.email_domains,
        },
        {
          name: editName,
          slug: editSlug.toLowerCase(),
          email_domains: domains,
        }
      );
      toast({
        title: 'Sucesso',
        description: 'Cliente atualizado com sucesso.',
      });
      setTenants(prev =>
        prev.map(t =>
          t.id === editingTenant.id
            ? { ...t, name: editName, slug: editSlug.toLowerCase(), email_domains: domains }
            : t
        )
      );
      setEditDialogOpen(false);
      setEditingTenant(null);
    }
    setSaving(false);
  };

  const handleLogoUploadClick = (tenant: Tenant) => {
    setSelectedTenantForLogo(tenant);
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTenantForLogo) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem (PNG, JPG, etc).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingLogoId(selectedTenantForLogo.id);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedTenantForLogo.slug}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old logo if exists
      if (selectedTenantForLogo.logo_url) {
        const oldPath = selectedTenantForLogo.logo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('tenant-logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(filePath);

      // Update tenant with new logo URL
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', selectedTenantForLogo.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setTenants(prev =>
        prev.map(t =>
          t.id === selectedTenantForLogo.id ? { ...t, logo_url: urlData.publicUrl } : t
        )
      );

      await logAuditEntry(
        selectedTenantForLogo.id,
        selectedTenantForLogo.name,
        'logo_updated',
        { logo_url: selectedTenantForLogo.logo_url },
        { logo_url: urlData.publicUrl }
      );

      toast({
        title: 'Logo atualizado',
        description: `Logo de ${selectedTenantForLogo.name} foi atualizado com sucesso.`,
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload do logo.',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogoId(null);
      setSelectedTenantForLogo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async (tenant: Tenant) => {
    if (!tenant.logo_url) return;
    if (!confirm(`Remover logo de "${tenant.name}"?`)) return;

    setUploadingLogoId(tenant.id);

    try {
      // Delete from storage
      const oldPath = tenant.logo_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('tenant-logos').remove([oldPath]);
      }

      // Update tenant
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', tenant.id);

      if (error) throw error;

      setTenants(prev =>
        prev.map(t =>
          t.id === tenant.id ? { ...t, logo_url: null } : t
        )
      );

      await logAuditEntry(
        tenant.id,
        tenant.name,
        'logo_removed',
        { logo_url: tenant.logo_url },
        { logo_url: null }
      );

      toast({
        title: 'Logo removido',
        description: `Logo de ${tenant.name} foi removido.`,
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o logo.',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogoId(null);
    }
  };

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

  const handleAssignUser = async () => {
    if (!selectedUserId || !selectedTenantId) {
      toast({
        title: 'Selecione os campos',
        description: 'Selecione um usuário e um tenant.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('user_tenants')
      .insert({
        user_id: selectedUserId,
        tenant_id: selectedTenantId,
      });

    if (error) {
      console.error('Error assigning user:', error);
      if (error.code === '23505') {
        toast({
          title: 'Erro',
          description: 'Este usuário já está associado a este tenant.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível associar o usuário.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Sucesso',
        description: 'Usuário associado com sucesso.',
      });
      setSelectedUserId('');
      setSelectedTenantId('');
      setSearchEmail('');
      setSearchResults([]);
      setAssignDialogOpen(false);
      fetchUserTenants();
    }
    setSaving(false);
  };

  const handleRemoveAssignment = async (ut: UserTenant) => {
    if (!confirm(`Remover associação de "${ut.user_email}" com "${ut.tenant_name}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('user_tenants')
      .delete()
      .eq('id', ut.id);

    if (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a associação.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Removido',
        description: 'Associação removida com sucesso.',
      });
      fetchUserTenants();
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
      {/* Hidden file input for logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleLogoFileChange}
      />

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
        <Tabs defaultValue="tenants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tenants" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
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

                {/* Edit Tenant Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={(open) => {
                  setEditDialogOpen(open);
                  if (!open) {
                    setEditingTenant(null);
                  }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Cliente</DialogTitle>
                      <DialogDescription>
                        Atualize os dados do cliente.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Nome</Label>
                        <Input
                          id="edit-name"
                          placeholder="Ex: Pix do Milhão"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-slug">Slug</Label>
                        <Input
                          id="edit-slug"
                          placeholder="Ex: pdm"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Identificador único usado no webhook.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-domains">Domínios de Email</Label>
                        <Input
                          id="edit-domains"
                          placeholder="Ex: empresa.com.br, empresa.com"
                          value={editEmailDomains}
                          onChange={(e) => setEditEmailDomains(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Separe múltiplos domínios por vírgula.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdateTenant} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar
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
                        <TableHead className="w-[80px]">Logo</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Webhook URL</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Domínios</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={tenant.logo_url || undefined} alt={tenant.name} />
                                <AvatarFallback className="bg-muted">
                                  {tenant.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {tenant.slug}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="bg-muted px-2 py-1 rounded text-xs" title={`${webhookBaseUrl}/${tenant.slug}`}>
                                .../{tenant.slug}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyWebhookUrl(tenant)}
                                title="Copiar URL"
                                className="h-6 w-6 p-0"
                              >
                                {copiedWebhookId === tenant.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                {tenant.webhook_token ? `${tenant.webhook_token.substring(0, 8)}...` : '-'}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyWebhookToken(tenant)}
                                title="Copiar token"
                                className="h-6 w-6 p-0"
                                disabled={!tenant.webhook_token}
                              >
                                {copiedTokenId === tenant.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Key className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => regenerateWebhookToken(tenant)}
                                title="Regenerar token"
                                className="h-6 w-6 p-0"
                                disabled={regeneratingTokenId === tenant.id}
                              >
                                {regeneratingTokenId === tenant.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTenant(tenant)}
                                title="Editar cliente"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLogoUploadClick(tenant)}
                                disabled={uploadingLogoId === tenant.id}
                                title="Upload logo"
                              >
                                {uploadingLogoId === tenant.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </Button>
                              {tenant.logo_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveLogo(tenant)}
                                  disabled={uploadingLogoId === tenant.id}
                                  title="Remover logo"
                                  className="text-orange-500 hover:text-orange-600"
                                >
                                  <Image className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteTenant(tenant)}
                                title="Excluir cliente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Associações de Usuários</CardTitle>
                  <CardDescription>
                    Associe usuários específicos a clientes (tenants). Isso é útil quando o email do usuário não pertence ao domínio do cliente.
                  </CardDescription>
                </div>
                <Dialog open={assignDialogOpen} onOpenChange={(open) => {
                  setAssignDialogOpen(open);
                  if (!open) {
                    setSearchEmail('');
                    setSearchResults([]);
                    setSelectedUserId('');
                    setSelectedTenantId('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nova Associação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Associar Usuário a Cliente</DialogTitle>
                      <DialogDescription>
                        Busque um usuário por email e selecione o cliente para associação.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Search users */}
                      <div className="space-y-2">
                        <Label>Buscar Usuário</Label>
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
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um usuário" />
                            </SelectTrigger>
                            <SelectContent>
                              {searchResults.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Select tenant */}
                      <div className="space-y-2">
                        <Label>Cliente (Tenant)</Label>
                        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleAssignUser} 
                        disabled={saving || !selectedUserId || !selectedTenantId}
                      >
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Associar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingUserTenants ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : userTenants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma associação manual cadastrada.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email do Usuário</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userTenants.map((ut) => (
                        <TableRow key={ut.id}>
                          <TableCell className="font-medium">{ut.user_email}</TableCell>
                          <TableCell>{ut.tenant_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(ut.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveAssignment(ut)}
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
          </TabsContent>

          {/* Audit History Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Histórico de Alterações</CardTitle>
                <CardDescription>
                  Registro de todas as alterações realizadas nos clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAuditLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma alteração registrada.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-medium">{log.tenant_name}</TableCell>
                          <TableCell>
                            <Badge variant={
                              log.action === 'created' ? 'default' :
                              log.action === 'deleted' ? 'destructive' :
                              log.action === 'activated' ? 'default' :
                              log.action === 'deactivated' ? 'secondary' :
                              'outline'
                            }>
                              {log.action === 'created' && 'Criado'}
                              {log.action === 'updated' && 'Atualizado'}
                              {log.action === 'deleted' && 'Excluído'}
                              {log.action === 'activated' && 'Ativado'}
                              {log.action === 'deactivated' && 'Desativado'}
                              {log.action === 'logo_updated' && 'Logo atualizado'}
                              {log.action === 'logo_removed' && 'Logo removido'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.changed_by_email || 'Sistema'}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {log.old_values && log.new_values && (
                              <div className="text-xs text-muted-foreground">
                                {Object.keys(log.new_values).map((key) => {
                                  const oldVal = log.old_values?.[key];
                                  const newVal = log.new_values?.[key];
                                  if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                    return (
                                      <div key={key} className="truncate">
                                        <span className="font-medium">{key}:</span>{' '}
                                        <span className="line-through text-red-500">
                                          {Array.isArray(oldVal) ? oldVal.join(', ') : String(oldVal || '-')}
                                        </span>
                                        {' → '}
                                        <span className="text-green-600">
                                          {Array.isArray(newVal) ? newVal.join(', ') : String(newVal || '-')}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                            {log.action === 'created' && log.new_values && (
                              <div className="text-xs text-muted-foreground">
                                {Object.entries(log.new_values).map(([key, val]) => (
                                  <div key={key} className="truncate">
                                    <span className="font-medium">{key}:</span>{' '}
                                    {Array.isArray(val) ? val.join(', ') : String(val)}
                                  </div>
                                ))}
                              </div>
                            )}
                            {log.action === 'deleted' && log.old_values && (
                              <div className="text-xs text-muted-foreground line-through text-red-500">
                                {Object.entries(log.old_values).map(([key, val]) => (
                                  <div key={key} className="truncate">
                                    <span className="font-medium">{key}:</span>{' '}
                                    {Array.isArray(val) ? val.join(', ') : String(val)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
