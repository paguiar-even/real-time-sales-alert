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
  UserPlus, 
  Loader2, 
  ShieldOff, 
  Ban, 
  CheckCircle, 
  RefreshCw, 
  Phone, 
  Mail, 
  User,
  Shield,
  Pencil
} from 'lucide-react';

interface TenantUser {
  user_tenant_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  mfa_enabled: boolean;
  is_blocked: boolean;
  created_at: string;
}

interface TenantUsersManagerProps {
  tenantId: string;
  tenantName: string;
}

export function TenantUsersManager({ tenantId, tenantName }: TenantUsersManagerProps) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingMfaUserId, setResettingMfaUserId] = useState<string | null>(null);
  const [togglingBlockUserId, setTogglingBlockUserId] = useState<string | null>(null);

  // Form state for create
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Form state for edit
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_tenant_users', {
      target_tenant_id: tenantId
    });

    if (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      fetchUsers();
    }
  }, [tenantId]);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Email e senha são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      // Create user using the admin function
      const { data: newUserId, error: createError } = await supabase.rpc('admin_create_user', {
        user_email: newEmail.trim().toLowerCase(),
        user_password: newPassword,
        user_full_name: newFullName.trim() || null,
        user_phone: newPhone.trim() || null
      });

      if (createError) {
        throw createError;
      }

      // Associate user with tenant
      const { error: assignError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: newUserId,
          tenant_id: tenantId
        });

      if (assignError) {
        throw assignError;
      }

      toast({
        title: 'Usuário criado',
        description: `${newEmail} foi criado e associado a ${tenantName}.`,
      });

      setNewEmail('');
      setNewFullName('');
      setNewPhone('');
      setNewPassword('');
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      let message = 'Não foi possível criar o usuário.';
      if (error.message?.includes('duplicate key')) {
        message = 'Este email já está cadastrado.';
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  const handleResetMfa = async (user: TenantUser) => {
    if (!confirm(`Tem certeza que deseja resetar o 2FA de "${user.email}"? O usuário terá que configurar novamente.`)) {
      return;
    }

    setResettingMfaUserId(user.user_id);

    const { error } = await supabase.rpc('admin_reset_user_mfa', {
      target_user_id: user.user_id
    });

    if (error) {
      console.error('Error resetting MFA:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível resetar o 2FA.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: '2FA resetado',
        description: `O 2FA de ${user.email} foi resetado.`,
      });
      fetchUsers();
    }

    setResettingMfaUserId(null);
  };

  const handleToggleBlock = async (user: TenantUser) => {
    const newStatus = !user.is_blocked;
    const action = newStatus ? 'bloquear' : 'desbloquear';
    
    if (!confirm(`Tem certeza que deseja ${action} "${user.email}"?`)) {
      return;
    }

    setTogglingBlockUserId(user.user_id);

    const { error } = await supabase
      .from('user_tenants')
      .update({ is_blocked: newStatus })
      .eq('id', user.user_tenant_id);

    if (error) {
      console.error('Error toggling block:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível ${action} o usuário.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: newStatus ? 'Usuário bloqueado' : 'Usuário desbloqueado',
        description: `${user.email} foi ${newStatus ? 'bloqueado' : 'desbloqueado'}.`,
      });
      setUsers(prev => prev.map(u => 
        u.user_tenant_id === user.user_tenant_id 
          ? { ...u, is_blocked: newStatus }
          : u
      ));
    }

    setTogglingBlockUserId(null);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const openEditDialog = (user: TenantUser) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditPhone(user.phone || '');
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editFullName.trim() || null,
        phone: editPhone.trim() || null
      })
      .eq('id', editingUser.user_id);

    if (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Usuário atualizado',
        description: `Os dados de ${editingUser.email} foram atualizados.`,
      });
      setUsers(prev => prev.map(u => 
        u.user_id === editingUser.user_id 
          ? { ...u, full_name: editFullName.trim() || null, phone: editPhone.trim() || null }
          : u
      ));
      setEditDialogOpen(false);
      setEditingUser(null);
    }

    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Usuários do Tenant
          </CardTitle>
          <CardDescription>
            Gerencie os usuários que têm acesso ao monitoramento de {tenantName}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Cadastre um novo usuário para {tenantName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome Completo
                  </Label>
                  <Input
                    id="new-name"
                    placeholder="João da Silva"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Senha Inicial *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-password"
                      type="text"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={generatePassword} title="Gerar senha">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O usuário poderá alterar a senha depois.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Usuário
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
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum usuário cadastrado para este tenant.</p>
            <p className="text-sm">Clique em "Novo Usuário" para adicionar.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_tenant_id} className={user.is_blocked ? 'opacity-60' : ''}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone ? (
                      <span className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.mfa_enabled ? (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        <Shield className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <ShieldOff className="h-3 w-3 mr-1" />
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <Ban className="h-3 w-3" />
                        Bloqueado
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" />
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        title="Editar usuário"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.mfa_enabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetMfa(user)}
                          disabled={resettingMfaUserId === user.user_id}
                          title="Resetar 2FA"
                          className="text-amber-600 hover:text-amber-700"
                        >
                          {resettingMfaUserId === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldOff className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!user.is_blocked}
                          onCheckedChange={() => handleToggleBlock(user)}
                          disabled={togglingBlockUserId === user.user_id}
                        />
                        <span className="text-xs text-muted-foreground w-16">
                          {user.is_blocked ? 'Bloq.' : 'Ativo'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingUser(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize os dados de {editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  value={editingUser?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="edit-name"
                  placeholder="João da Silva"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditUser} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
