import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Shield, ShieldOff, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUser {
    user_id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    mfa_enabled: boolean;
    created_at: string;
}

export function AdminUsersManager() {

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);

    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newFullName, setNewFullName] = useState("");
    const [newPhone, setNewPhone] = useState("");

    const fetchUsers = async () => {

        setLoading(true);

        const { data, error } = await supabase.rpc("get_admin_users");

        if (error) {
            console.error("Error fetching admin users:", error);
            toast.error("Erro ao carregar administradores");
        } else {
            setUsers(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async () => {

        if (!newEmail || !newPassword) {
            toast.error("Email e senha são obrigatórios");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("A senha deve ter pelo menos 8 caracteres");
            return;
        }

        setCreating(true);

        const { error } = await supabase.rpc("admin_create_user", {
            user_email: newEmail,
            user_password: newPassword,
            user_full_name: newFullName || null,
            user_phone: newPhone || null,
            assign_staff: false,
            assign_admin: true
        });

        if (error) {
            console.error("Error creating admin user:", error);
            toast.error("Erro ao criar administrador: " + error.message);
        } else {
            toast.success("Administrador criado com sucesso");
            setDialogOpen(false);
            setNewEmail("");
            setNewPassword("");
            setNewFullName("");
            setNewPhone("");
            fetchUsers();
        }

        setCreating(false);
    };

    const handleRemoveAdmin = async (user: AdminUser) => {

        if (user.email === "admin@even7.com.br") {
            toast.error("Não é possível remover o administrador master");
            return;
        }

        if (!confirm(`Tem certeza que deseja remover o acesso administrativo de ${user.email}?`)) {
            return;
        }

        setRemovingUserId(user.user_id);

        const { error } = await supabase.rpc("remove_admin_role", {
            target_user_id: user.user_id
        });

        if (error) {
            console.error("Error removing admin role:", error);
            toast.error("Erro ao remover administrador: " + error.message);
        } else {
            toast.success("Acesso administrativo removido");
            fetchUsers();
        }

        setRemovingUserId(null);
    };

    const getTimeAgo = (dateStr: string | null) => {

        if (!dateStr) return "N/A";

        return formatDistanceToNow(new Date(dateStr), {
            addSuffix: true,
            locale: ptBR
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Administradores Even
                        </CardTitle>

                        <CardDescription>
                            Gerencie usuários com acesso ao painel administrativo
                        </CardDescription>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchUsers}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Atualizar
                        </Button>

                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Novo Admin
                                </Button>
                            </DialogTrigger>

                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Criar Novo Administrador</DialogTitle>

                                    <DialogDescription>
                                        Crie um novo usuário com acesso total ao painel administrativo
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="admin-email">Email *</Label>
                                        <Input
                                            id="admin-email"
                                            type="email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="admin@even7.com.br"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-password">Senha *</Label>
                                        <Input
                                            id="admin-password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-name">Nome Completo</Label>
                                        <Input
                                            id="admin-name"
                                            value={newFullName}
                                            onChange={(e) => setNewFullName(e.target.value)}
                                            placeholder="Nome do administrador"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-phone">Telefone</Label>
                                        <Input
                                            id="admin-phone"
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Cancelar
                                    </Button>

                                    <Button
                                        onClick={handleCreateUser}
                                        disabled={creating}
                                    >
                                        {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Criar Administrador
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhum administrador encontrado
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>2FA</TableHead>
                                <TableHead>Criado</TableHead>
                                <TableHead className="w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.user_id}>
                                    <TableCell className="font-medium">
                                        {user.email}
                                        {user.email === "admin@even7.com.br" && (
                                            <Badge variant="secondary" className="ml-2">
                                                Master
                                            </Badge>
                                        )}
                                    </TableCell>

                                    <TableCell>{user.full_name || "-"}</TableCell>

                                    <TableCell>{user.phone || "-"}</TableCell>

                                    <TableCell>
                                        {user.mfa_enabled ? (
                                            <Badge variant="default" className="bg-green-600">
                                                Ativo
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Pendente
                                            </Badge>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-muted-foreground text-sm">
                                        {getTimeAgo(user.created_at)}
                                    </TableCell>

                                    <TableCell>
                                        {user.email !== "admin@even7.com.br" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveAdmin(user)}
                                                disabled={removingUserId === user.user_id}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                {removingUserId === user.user_id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ShieldOff className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
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
