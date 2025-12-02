import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, RefreshCw, Play, Key, Link, Terminal, Activity, Clock, Loader2, CheckCircle2, XCircle, AlertCircle, Users, History, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TenantUsersManager } from "./TenantUsersManager";
import { TenantAccessLogs } from "./TenantAccessLogs";

interface StaffToken {
    id: string;
    name: string;
    token: string;
    user_email: string;
    is_active: boolean;
}

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

interface TenantStatus {
    lastUpdate: string | null;
    lastStatus: string | null;
    lastVendas: number | null;
    totalRecords: number;
}

interface TenantDetailsDialogProps {
    tenant: Tenant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTokenRegenerated: (tenantId: string, newToken: string) => void;
}

export function TenantDetailsDialog({ tenant, open, onOpenChange, onTokenRegenerated }: TenantDetailsDialogProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [regeneratingToken, setRegeneratingToken] = useState(false);
    const [testingWebhook, setTestingWebhook] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [testVendas, setTestVendas] = useState("5");
    const [staffTokens, setStaffTokens] = useState<StaffToken[]>([]);
    const [selectedTokenId, setSelectedTokenId] = useState<string>("");

    const fetchStaffTokens = async () => {
        const { data, error } = await supabase.rpc("get_staff_tokens");

        if (!error && data) {
            const activeTokens = data.filter((t: StaffToken) => t.is_active);
            setStaffTokens(activeTokens);

            if (activeTokens.length > 0 && !selectedTokenId) {
                setSelectedTokenId(activeTokens[0].id);
            }
        }
    };

    useEffect(() => {
        if (open) {
            fetchStaffTokens();
        }
    }, [open]);

    const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-webhook`;

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            toast({ title: "Copiado!", description: `${field} copiado para a área de transferência.` });
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
        }
    };

    const regenerateToken = async () => {
        if (!tenant) return;

        if (!confirm("Tem certeza? O token atual deixará de funcionar.")) return;

        setRegeneratingToken(true);
        const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        const { error } = await supabase
            .from("tenants")
            .update({ webhook_token: newToken })
            .eq("id", tenant.id);

        if (error) {
            toast({ title: "Erro", description: "Não foi possível regenerar o token.", variant: "destructive" });
        } else {
            onTokenRegenerated(tenant.id, newToken);
            toast({ title: "Token regenerado", description: "Atualize o n8n com o novo token." });
        }
        setRegeneratingToken(false);
    };

    const fetchTenantStatus = async () => {
        if (!tenant) return;
        setLoadingStatus(true);

        const { data, error, count } = await supabase
            .from("sales_status")
            .select("*", { count: "exact" })
            .eq("tenant_id", tenant.id)
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) {
            console.error("Error fetching status:", error);
            setTenantStatus(null);
        } else {
            setTenantStatus({
                lastUpdate: data?.[0]?.created_at || null,
                lastStatus: data?.[0]?.vendas_status || null,
                lastVendas: data?.[0]?.vendas_minuto ?? null,
                totalRecords: count || 0,
            });
        }
        setLoadingStatus(false);
    };

    const testWebhook = async () => {
        if (!tenant || !tenant.webhook_token) return;

        setTestingWebhook(true);
        setTestResult(null);

        try {
            const response = await fetch(`${webhookBaseUrl}/${tenant.slug}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-webhook-token": tenant.webhook_token,
                },
                body: JSON.stringify({
                    vendas_minuto: parseInt(testVendas) || 0,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setTestResult({ success: true, message: "Webhook executado com sucesso!" });
                toast({ title: "Sucesso", description: "Webhook testado com sucesso." });

                // Refresh status after test
                setTimeout(fetchTenantStatus, 1000);
            } else {
                setTestResult({ success: false, message: data.error || "Erro desconhecido" });
                toast({ title: "Erro", description: data.error || "Erro ao testar webhook.", variant: "destructive" });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro de conexão";
            setTestResult({ success: false, message });
            toast({ title: "Erro", description: message, variant: "destructive" });
        }

        setTestingWebhook(false);
    };

    // Fetch status when dialog opens
    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);

        if (newOpen && tenant) {
            fetchTenantStatus();
            setTestResult(null);
        }
    };

    if (!tenant) return null;

    const webhookUrl = `${webhookBaseUrl}/${tenant.slug}`;
    const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-token: ${tenant.webhook_token || "SEU_TOKEN"}" \\
  -d '{"vendas_minuto": 10}'`;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("pt-BR");
    };

    const getStatusBadge = (status: string | null) => {
        if (!status) return <Badge variant="outline">Sem dados</Badge>;

        if (status === "OK") return <Badge className="bg-green-500">OK</Badge>;

        if (status === "ALERTA_ZERO") return <Badge variant="destructive">Alerta Zero</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {tenant.name}
                        {tenant.is_active ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                        ) : (
                            <Badge variant="secondary">Inativo</Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Configurações de webhook e status do tenant
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="users" className="mt-4">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="users" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Usuários
                        </TabsTrigger>
                        <TabsTrigger value="access" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Acessos
                        </TabsTrigger>
                        <TabsTrigger value="status" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Status
                        </TabsTrigger>
                        <TabsTrigger value="config" className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Webhook
                        </TabsTrigger>
                        <TabsTrigger value="test" className="flex items-center gap-2">
                            <Play className="h-4 w-4" />
                            Testar
                        </TabsTrigger>
                    </TabsList>

                    {/* Users Tab */}
                    <TabsContent value="users" className="mt-4">
                        <TenantUsersManager tenantId={tenant.id} tenantName={tenant.name} />
                    </TabsContent>

                    {/* Access Logs Tab */}
                    <TabsContent value="access" className="mt-4">
                        <TenantAccessLogs tenantId={tenant.id} tenantName={tenant.name} />
                    </TabsContent>

                    {/* Status Tab */}
                    <TabsContent value="status" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Status Atual</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={fetchTenantStatus} disabled={loadingStatus}>
                                        {loadingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingStatus ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : tenantStatus ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Última Atualização</p>
                                            <p className="font-medium flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                {formatDate(tenantStatus.lastUpdate)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Status</p>
                                            <div>{getStatusBadge(tenantStatus.lastStatus)}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Vendas/Minuto</p>
                                            <p className="font-medium text-2xl">
                                                {tenantStatus.lastVendas !== null ? tenantStatus.lastVendas : "-"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Total de Registros</p>
                                            <p className="font-medium">{tenantStatus.totalRecords}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        Nenhum dado recebido ainda
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Config Tab */}
                    <TabsContent value="config" className="space-y-4 mt-4">
                        {/* Admin Direct Access */}
                        <Card className="border-green-500/30 bg-green-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-green-500" />
                                    Acesso Administrativo Direto
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Visualize o monitor deste tenant diretamente como administrador
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={() => window.open(`${window.location.origin}/admin/monitor/${tenant.slug}`, "_blank")}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Abrir Monitor (Admin)
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Tenant Monitor URL */}
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Link className="h-4 w-4" />
                                    URL do Monitor (Acesso Staff)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Selecione um token de acesso para gerar URL compartilhável
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex gap-2">
                                    <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Selecione um token" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staffTokens.length === 0 ? (
                                                <SelectItem value="none" disabled>Nenhum token ativo</SelectItem>
                                            ) : (
                                                staffTokens.map((token) => (
                                                    <SelectItem key={token.id} value={token.id}>
                                                        {token.name} ({token.user_email})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedTokenId && staffTokens.find(t => t.id === selectedTokenId) && (
                                    <div className="flex gap-2">
                                        <code className="flex-1 bg-background px-3 py-2 rounded text-sm break-all border font-mono">
                                            {`${window.location.origin}/t/${tenant.slug}?token=${staffTokens.find(t => t.id === selectedTokenId)?.token}`}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                const token = staffTokens.find(t => t.id === selectedTokenId)?.token;
                                                copyToClipboard(`${window.location.origin}/t/${tenant.slug}?token=${token}`, "Tenant URL");
                                            }}
                                            title="Copiar URL"
                                        >
                                            {copiedField === "Tenant URL" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="icon"
                                            onClick={() => {
                                                const token = staffTokens.find(t => t.id === selectedTokenId)?.token;
                                                window.open(`${window.location.origin}/t/${tenant.slug}?token=${token}`, "_blank");
                                            }}
                                            title="Abrir Monitor"
                                            className="bg-primary hover:bg-primary/90"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                                {staffTokens.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Crie um token na aba "Tokens Even" para gerar URLs de acesso para staff.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Webhook URL */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Link className="h-4 w-4" />
                                Webhook URL
                            </Label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                                    {webhookUrl}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(webhookUrl, "URL")}
                                >
                                    {copiedField === "URL" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* Token */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                Token de Autenticação
                            </Label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                                    {tenant.webhook_token || "Não configurado"}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(tenant.webhook_token || "", "Token")}
                                    disabled={!tenant.webhook_token}
                                >
                                    {copiedField === "Token" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={regenerateToken}
                                    disabled={regeneratingToken}
                                    title="Regenerar token"
                                >
                                    {regeneratingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* cURL Command */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Terminal className="h-4 w-4" />
                                Comando cURL
                            </Label>
                            <div className="relative">
                                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                    {curlCommand}
                                </pre>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(curlCommand, "cURL")}
                                >
                                    {copiedField === "cURL" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* n8n Instructions */}
                        <Card className="border-dashed">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Configuração no n8n</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>1. Adicione um nó <strong>HTTP Request</strong></p>
                                <p>2. Método: <code className="bg-muted px-1 rounded">POST</code></p>
                                <p>3. URL: Cole a URL acima</p>
                                <p>4. Headers: Adicione <code className="bg-muted px-1 rounded">x-webhook-token</code> com o token</p>
                                <p>5. Body: JSON com <code className="bg-muted px-1 rounded">{`{"vendas_minuto": N}`}</code></p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Test Tab */}
                    <TabsContent value="test" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Testar Webhook</CardTitle>
                                <CardDescription>
                                    Envie um teste para verificar se o webhook está funcionando
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="test-vendas">Valor de vendas_minuto</Label>
                                    <Input
                                        id="test-vendas"
                                        type="number"
                                        value={testVendas}
                                        onChange={(e) => setTestVendas(e.target.value)}
                                        placeholder="5"
                                        min="0"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use 0 para simular um alerta de vendas zeradas
                                    </p>
                                </div>

                                <Button
                                    onClick={testWebhook}
                                    disabled={testingWebhook || !tenant.webhook_token}
                                    className="w-full"
                                >
                                    {testingWebhook ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 mr-2" />
                                            Enviar Teste
                                        </>
                                    )}
                                </Button>

                                {testResult && (
                                    <div className={`p-4 rounded-lg flex items-center gap-3 ${
                                        testResult.success
                                            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                                            : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                                    }`}>
                                        {testResult.success ? (
                                            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="h-5 w-5 flex-shrink-0" />
                                        )}
                                        <span className="text-sm">{testResult.message}</span>
                                    </div>
                                )}

                                {!tenant.webhook_token && (
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        ⚠️ Token não configurado. Regenere um token na aba Configuração.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
