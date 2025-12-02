import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
    Loader2,
    RefreshCw,
    Users,
    Mail,
    Phone,
    Shield,
    KeyRound,
    UserPlus,
    User,
    Trash2,
    Key,
    ShieldPlus
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StaffUser {
    user_id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    mfa_enabled: boolean;
    created_at: string;
    has_active_token: boolean;
}

export function EvenUsersManager() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [promotingUserId, setPromotingUserId] = useState<string | null>(null);

    // Form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");

    const fetchUsers = async () => {
        setLoading(true);

        const { data, error } = await supabase.rpc("get_staff_users");

        if (error) {
            console.error("Error fetching staff users:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os usuários.",
                variant: "destructive",
            });
            setUsers([]);
        } else {
            setUsers(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async () => {
        if (!email.trim() || !password.trim()) {
            toast({
                title: "Campos obrigatórios",
                description: "Email e senha são obrigatórios.",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Senha muito curta",
                description: "A senha deve ter pelo menos 6 caracteres.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const { data, error } = await supabase.rpc("admin_create_user", {
                user_email: email.trim(),
                user_password: password,
                user_full_name: fullName.trim() || null,
                user_phone: phone.trim() || null,
                assign_staff: true
            });

            if (error) {
                console.error("Error creating user:", error);
                toast({
                    title: "Erro ao criar usuário",
                    description: error.message || "Não foi possível criar o usuário.",
                    variant: "destructive",
                });
                setSaving(false);
                return;
            }

            toast({
                title: "Usuário staff criado",
                description: `Usuário ${email} criado com role staff. Agora crie um token de acesso para ele.`,
            });

            // Reset form
            setEmail("");
            setPassword("");
            setFullName("");
            setPhone("");
            setCreateDialogOpen(false);
            fetchUsers();
        } catch (err) {
            console.error("Error:", err);
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao criar o usuário.",
                variant: "destructive",
            });
        }

        setSaving(false);
    };

    const handleRemoveStaffRole = async (user: StaffUser) => {

        if (!confirm(`Tem certeza que deseja remover o acesso staff de "${user.email}"? Os tokens de acesso serão desativados.`)) {
            return;
        }

        setRemovingUserId(user.user_id);

        try {
            const { error } = await supabase.rpc("remove_staff_role", {
                target_user_id: user.user_id
            });

            if (error) {
                console.error("Error removing staff role:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível remover o acesso staff.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Acesso removido",
                    description: `O acesso staff de ${user.email} foi removido.`,
                });
                fetchUsers();
            }
        } catch (err) {
            console.error("Error:", err);
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao remover o acesso.",
                variant: "destructive",
            });
        }

        setRemovingUserId(null);
    };

    const handlePromoteToAdmin = async (user: StaffUser) => {

        if (!confirm(`Promover "${user.email}" para Administrador? Ele terá acesso total ao painel administrativo.`)) {
            return;
        }

        setPromotingUserId(user.user_id);

        try {
            const { error } = await supabase.rpc("assign_admin_role", {
                target_user_id: user.user_id
            });

            if (error) {
                console.error("Error promoting to admin:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível promover o usuário.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Usuário promovido",
                    description: `${user.email} agora é Administrador e pode acessar o painel admin.`,
                });
            }
        } catch (err) {
            console.error("Error:", err);
            toast({
                title: "Erro",
                description: "Ocorreu um erro ao promover o usuário.",
                variant: "destructive",
            });
        }

        setPromotingUserId(null);
    };

    const getTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Usuários Even (Staff)
                    </CardTitle>
                    <CardDescription>
                        Gerencie os usuários da Even com role staff que podem acessar monitores de clientes.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    <Dialog open={createDialogOpen} onOpenChange={(open) => {
                        setCreateDialogOpen(open);

                        if (!open) {
                            setEmail("");
                            setPassword("");
                            setFullName("");
                            setPhone("");
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Novo Staff
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Criar Usuário Staff</DialogTitle>
                                <DialogDescription>
                                    Crie um novo usuário staff da Even que poderá acessar monitores de clientes.
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

                                <div className="p-3 bg-primary/10 rounded-lg text-sm">
                                    <div className="flex items-center gap-2 font-medium text-primary mb-1">
                                        <Shield className="h-4 w-4" />
                                        Role Staff
                                    </div>
                                    <p className="text-muted-foreground">
                                        O usuário será criado com role <strong>staff</strong>. Após criar, vá na aba "Tokens Even" para gerar um token de acesso.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleCreateUser} disabled={saving || !email.trim() || !password.trim()}>
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Criar Staff
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
                        <p>Nenhum usuário staff cadastrado.</p>
                        <p className="text-sm">Clique em "Novo Staff" para criar um usuário.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Token Ativo</TableHead>
                                <TableHead>MFA</TableHead>
                                <TableHead>Criado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.user_id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <span className="font-medium">{user.full_name || "-"}</span>
                                                <Badge variant="secondary" className="ml-2 text-xs">staff</Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{user.email}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {user.phone || "-"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {user.has_active_token ? (
                                            <Badge className="bg-green-500/10 text-green-600">
                                                <Key className="h-3 w-3 mr-1" />
                                                Ativo
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground">
                                                Sem token
                                            </Badge>
                                        )}
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
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-primary hover:text-primary"
                                                        onClick={() => handlePromoteToAdmin(user)}
                                                        disabled={promotingUserId === user.user_id}
                                                    >
                                                        {promotingUserId === user.user_id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <ShieldPlus className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Promover para Admin</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleRemoveStaffRole(user)}
                                                        disabled={removingUserId === user.user_id}
                                                    >
                                                        {removingUserId === user.user_id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Remover Staff</TooltipContent>
                                            </Tooltip>
                                        </div>
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
