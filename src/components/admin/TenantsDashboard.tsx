import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock, TrendingUp, Activity, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TenantWithStatus {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_active: boolean;
    lastStatus: {
        vendas_minuto: number;
        vendas_status: string;
        created_at: string;
    } | null;
}

export function TenantsDashboard() {
    const [tenants, setTenants] = useState<TenantWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTenantsWithStatus = async () => {
        setRefreshing(true);

        // Fetch all active tenants
        const { data: tenantsData, error: tenantsError } = await supabase
            .from("tenants")
            .select("id, name, slug, logo_url, is_active")
            .eq("is_active", true)
            .order("name");

        if (tenantsError) {
            console.error("Error fetching tenants:", tenantsError);
            setRefreshing(false);
            setLoading(false);
            return;
        }

        // Fetch latest status for each tenant
        const tenantsWithStatus: TenantWithStatus[] = await Promise.all(
            (tenantsData || []).map(async (tenant) => {
                const { data: statusData } = await supabase
                    .from("sales_status")
                    .select("vendas_minuto, vendas_status, created_at")
                    .eq("tenant_id", tenant.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return {
                    ...tenant,
                    lastStatus: statusData,
                };
            })
        );

        setTenants(tenantsWithStatus);
        setRefreshing(false);
        setLoading(false);
    };

    useEffect(() => {
        fetchTenantsWithStatus();

        // Set up real-time subscription for sales_status changes
        const channel = supabase
            .channel("dashboard-sales-status")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "sales_status",
                },
                (payload) => {
                    console.log("Real-time update received:", payload);

                    // Update the specific tenant's status
                    const newStatus = payload.new as any;

                    if (newStatus.tenant_id) {
                        setTenants(prev => prev.map(t =>
                            t.id === newStatus.tenant_id
                                ? {
                                    ...t,
                                    lastStatus: {
                                        vendas_minuto: newStatus.vendas_minuto,
                                        vendas_status: newStatus.vendas_status,
                                        created_at: newStatus.created_at,
                                    }
                                }
                                : t
                        ));
                    }
                }
            )
            .subscribe();

        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchTenantsWithStatus, 60000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    const getTimeSinceUpdate = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    };

    const getStatusColor = (status: string | undefined) => {
        if (!status) return "bg-gray-500";

        if (status === "OK") return "bg-green-500";

        if (status === "ALERTA_ZERO") return "bg-red-500";
        return "bg-yellow-500";
    };

    const getStatusIcon = (status: string | undefined) => {
        if (!status) return <Clock className="h-5 w-5 text-gray-400" />;

        if (status === "OK") return <CheckCircle2 className="h-5 w-5 text-green-500" />;

        if (status === "ALERTA_ZERO") return <AlertTriangle className="h-5 w-5 text-red-500" />;
        return <Activity className="h-5 w-5 text-yellow-500" />;
    };

    // Summary stats
    const totalTenants = tenants.length;
    const tenantsWithData = tenants.filter(t => t.lastStatus).length;
    const tenantsOk = tenants.filter(t => t.lastStatus?.vendas_status === "OK").length;
    const tenantsAlert = tenants.filter(t => t.lastStatus?.vendas_status === "ALERTA_ZERO").length;
    const tenantsNoData = tenants.filter(t => !t.lastStatus).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with refresh */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Monitor de Tenants</h2>
                    <p className="text-muted-foreground">Visão geral de todos os clientes ativos</p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchTenantsWithStatus}
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Atualizar
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="text-3xl font-bold">{totalTenants}</p>
                            </div>
                            <Activity className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Vendendo</p>
                                <p className="text-3xl font-bold text-green-600">{tenantsOk}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-900">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Alerta Zero</p>
                                <p className="text-3xl font-bold text-red-600">{tenantsAlert}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Sem Dados</p>
                                <p className="text-3xl font-bold text-gray-500">{tenantsNoData}</p>
                            </div>
                            <Clock className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* All Good Indicator */}
            {tenantsAlert === 0 && tenantsWithData > 0 && (
                <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="relative flex items-center justify-center">
                        <span className="absolute inline-flex h-4 w-4 rounded-full bg-green-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                        Por aqui, tá tudo certo
                    </span>
                </div>
            )}

            {/* Tenants Grid */}
            {tenants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    Nenhum tenant ativo encontrado.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tenants.map((tenant) => (
                        <Card
                            key={tenant.id}
                            className={`relative overflow-hidden transition-all hover:shadow-lg ${
                                tenant.lastStatus?.vendas_status === "ALERTA_ZERO"
                                    ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                                    : tenant.lastStatus?.vendas_status === "OK"
                                        ? "border-green-200 dark:border-green-900"
                                        : ""
                            }`}
                        >
                            {/* Status indicator bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(tenant.lastStatus?.vendas_status)}`} />

                            <CardHeader className="pb-2 pt-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={tenant.logo_url || undefined} alt={tenant.name} />
                                        <AvatarFallback className="bg-muted text-xs">
                                            {tenant.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm font-medium truncate">{tenant.name}</CardTitle>
                                        <code className="text-xs text-muted-foreground">{tenant.slug}</code>
                                    </div>
                                    {getStatusIcon(tenant.lastStatus?.vendas_status)}
                                </div>
                            </CardHeader>

                            <CardContent className="pt-2">
                                {tenant.lastStatus ? (
                                    <div className="space-y-3">
                                        {/* Vendas display */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Vendas/min</span>
                                            </div>
                                            <span className={`text-2xl font-bold ${
                                                tenant.lastStatus.vendas_status === "ALERTA_ZERO"
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                            }`}>
                                                {tenant.lastStatus.vendas_minuto}
                                            </span>
                                        </div>

                                        {/* Status badge */}
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                variant={tenant.lastStatus.vendas_status === "OK" ? "default" : "destructive"}
                                                className={tenant.lastStatus.vendas_status === "OK" ? "bg-green-500" : ""}
                                            >
                                                {tenant.lastStatus.vendas_status === "OK" ? "Vendendo" : "Alerta Zero"}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {getTimeSinceUpdate(tenant.lastStatus.created_at)}
                                            </span>
                                        </div>

                                        {/* Quick access button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2"
                                            onClick={() => window.open(`/admin/monitor/${tenant.slug}`, "_blank")}
                                        >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            Abrir Monitor
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">Aguardando dados...</p>
                                        <p className="text-xs text-muted-foreground/70 mb-3">Webhook não configurado</p>
                                        
                                        {/* Quick access button even without data */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => window.open(`/admin/monitor/${tenant.slug}`, "_blank")}
                                        >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            Abrir Monitor
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
