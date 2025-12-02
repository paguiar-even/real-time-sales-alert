import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2, 
  RefreshCw, 
  Users,
  Mail,
  Phone,
  Shield,
  KeyRound,
  UserPlus,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EvenUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  mfa_enabled: boolean;
  created_at: string;
  has_token: boolean;
}

export function EvenUsersManager() {
  const [users, setUsers] = useState<EvenUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    
    // Get all staff tokens to identify Even users
    const { data: tokensData, error: tokensError } = await supabase.rpc('get_staff_tokens');
    
    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Get unique user IDs from tokens
    const userIds = [...new Set((tokensData || []).map((t: any) => t.user_id))];
    
    if (userIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, mfa_enabled, created_at')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Build user list with email from tokens data
    const usersMap = new Map<string, EvenUser>();
    
    (tokensData || []).forEach((token: any) => {
      if (!usersMap.has(token.user_id)) {
        const profile = profilesData?.find(p => p.id === token.user_id);
        usersMap.set(token.user_id, {
          id: token.user_id,
          email: token.user_email,
          full_name: profile?.full_name || null,
          phone: profile?.phone || null,
          mfa_enabled: profile?.mfa_enabled || false,
          created_at: profile?.created_at || token.created_at,
          has_token: true
        });
      }
    });

    setUsers(Array.from(usersMap.values()));
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Email e senha são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        user_email: email.trim(),
        user_password: password,
        user_full_name: fullName.trim() || null,
        user_phone: phone.trim() || null
      });

      if (error) {
        console.error('Error creating user:', error);
        toast({
          title: 'Erro ao criar usuário',
          description: error.message || 'Não foi possível criar o usuário.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({
        title: 'Usuário criado',
        description: `Usuário ${email} criado com sucesso. Agora crie um token de acesso para ele.`,
      });

      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao criar o usuário.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  const getTimeAgo = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="h-6 w-6" />
            Usuários Even
          </CardTitle>
          <CardDescription>
            Gerencie os usuários da Even que podem acessar monitores de clientes.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setEmail('');
              setPassword('');
              setFullName('');
              setPhone('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Usuário Even</DialogTitle>
                <DialogDescription>
                  Crie um novo usuário que poderá acessar monitores de clientes usando tokens de acesso.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email *
                  </Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="usuario@even.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-password" className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Senha *
                  </Label>
                  <Input
                    id="user-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome Completo
                  </Label>
                  <Input
                    id="user-name"
                    placeholder="Nome do usuário"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="user-phone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p>Após criar o usuário, você precisará criar um <strong>Token de Acesso</strong> na aba "Tokens Even" para que ele possa acessar os monitores.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} disabled={saving || !email.trim() || !password.trim()}>
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
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum usuário Even com token de acesso.</p>
            <p className="text-sm">Crie um usuário e depois um token de acesso para ele.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{user.full_name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.email}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.phone || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.mfa_enabled ? (
                      <Badge className="bg-green-500/10 text-green-600">
                        <Shield className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Desativado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getTimeAgo(user.created_at)}
                    </span>
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
