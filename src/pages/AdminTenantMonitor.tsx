import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, ArrowLeft, Shield } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { SalesIndicator } from "@/components/monitor/SalesIndicator";
import { TimeSinceUpdate } from "@/components/monitor/TimeSinceUpdate";
import { SalesChart } from "@/components/monitor/SalesChart";
import { Button } from "@/components/ui/button";

import evenLogo from "@/assets/even-logo.png";
import evenIcon from "@/assets/even-icon.png";
import rowPattern from "@/assets/row-pattern.png";

interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_active: boolean;
}

interface SalesStatus {
    vendas_minuto: number;
    vendas_status: "OK" | "ALERTA_ZERO";
    created_at: string;
}

interface HourlyData {
    hour: string;
    total: number;
    hasZero: boolean;
}

const AdminTenantMonitor = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: adminLoading } = useAdmin();

    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [currentStatus, setCurrentStatus] = useState<SalesStatus | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Fetch tenant info
    useEffect(() => {
        const fetchTenant = async () => {
            if (!slug || !isAdmin) return;

            const { data, error } = await supabase
                .from("tenants")
                .select("id, name, slug, logo_url, is_active")
                .eq("slug", slug)
                .maybeSingle();

            if (error) {
                console.error("Error fetching tenant:", error);
                setError("Erro ao carregar tenant");
                setLoading(false);
                return;
            }

            if (!data) {
                setError("Tenant não encontrado");
                setLoading(false);
                return;
            }

            setTenantInfo(data);
        };

        if (!adminLoading && isAdmin) {
            fetchTenant();
        }
    }, [slug, isAdmin, adminLoading]);

    // Fetch sales data
    useEffect(() => {
        if (!tenantInfo) return;

        const fetchSalesData = async () => {
            // Fetch current status
            const { data: statusData, error: statusError } = await supabase
                .from("sales_status")
                .select("*")
                .eq("tenant_id", tenantInfo.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (statusError) {
                console.error("Error fetching status:", statusError);
            } else if (statusData) {
                setCurrentStatus({
                    vendas_minuto: statusData.vendas_minuto,
                    vendas_status: statusData.vendas_status as "OK" | "ALERTA_ZERO",
                    created_at: statusData.created_at
                });
            }

            // Fetch hourly data for chart
            const { data: hourlyDataResult, error: hourlyError } = await supabase
                .from("sales_status")
                .select("vendas_minuto, created_at")
                .eq("tenant_id", tenantInfo.id)
                .order("created_at", { ascending: false })
                .limit(60);

            if (hourlyError) {
                console.error("Error fetching hourly data:", hourlyError);
            } else if (hourlyDataResult) {
                // Group by hour
                const hourMap: { [key: string]: { values: number[], hasZero: boolean } } = {};

                hourlyDataResult.forEach((record) => {
                    const hour = new Date(record.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                    });

                    if (!hourMap[hour]) {
                        hourMap[hour] = { values: [], hasZero: false };
                    }

                    hourMap[hour].values.push(record.vendas_minuto);

                    if (record.vendas_minuto === 0) {
                        hourMap[hour].hasZero = true;
                    }
                });

                const chartData: HourlyData[] = Object.entries(hourMap)
                    .map(([hour, data]) => ({
                        hour,
                        total: Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length),
                        hasZero: data.hasZero
                    }))
                    .slice(0, 12)
                    .reverse();

                setHourlyData(chartData);
            }

            setLoading(false);
        };

        fetchSalesData();

        // Set up realtime subscription
        const channel = supabase
            .channel("admin-tenant-sales-status")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "sales_status",
                    filter: `tenant_id=eq.${tenantInfo.id}`
                },
                (payload) => {
                    setCurrentStatus(payload.new as SalesStatus);
                    setTimeSinceUpdate(0);
                }
            )
            .subscribe();

        // Update timer
        const timer = setInterval(() => {
            setTimeSinceUpdate(prev => prev + 1);
        }, 1000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(timer);
        };
    }, [tenantInfo]);

    // Auth loading state
    if (authLoading || adminLoading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#FFB81C" }} />
                    <p className="text-white/70">Verificando permissões...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        navigate("/auth");
        return null;
    }

    // Not admin
    if (!isAdmin) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                    <AlertTriangle className="w-16 h-16 text-red-500" />
                    <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
                    <p className="text-white/70">Apenas administradores podem acessar esta página.</p>
                    <Button
                        variant="outline"
                        onClick={() => navigate("/monitor")}
                        className="mt-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                    <AlertTriangle className="w-16 h-16 text-red-500" />
                    <h1 className="text-2xl font-bold text-white">Erro</h1>
                    <p className="text-white/70">{error}</p>
                    <Button
                        variant="outline"
                        onClick={() => navigate("/admin")}
                        className="mt-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar ao Admin
                    </Button>
                </div>
            </div>
        );
    }

    // Loading data state
    if (loading || !tenantInfo) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#FFB81C" }} />
                    <p className="text-white/70">Carregando dados...</p>
                </div>
            </div>
        );
    }

    const displayLogo = tenantInfo.logo_url || evenLogo;
    const displayName = tenantInfo.name;

    return (
        <>
            <Helmet>
                <title>Admin Monitor | {displayName}</title>
                <meta name="description" content={`Monitoramento administrativo - ${displayName}`} />
            </Helmet>

            <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#00313C" }}>
                {/* Row pattern background */}
                <div
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{
                        backgroundImage: `url(${rowPattern})`,
                        backgroundRepeat: "repeat",
                        backgroundSize: "auto"
                    }}
                />

                <div className="container max-w-5xl mx-auto px-4 py-12 relative">
                    {/* Header */}
                    <header
                        className="mb-8 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 -mx-4 px-4 py-6 rounded-2xl"
                        style={{ backgroundColor: "#FFB81C" }}
                    >
                        {/* Back to admin button */}
                        <div className="flex justify-start -mb-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/admin")}
                                className="text-[#00313C] hover:bg-[#00313C]/10"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Voltar ao Admin
                            </Button>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-4">
                            <img
                                src={displayLogo}
                                alt={displayName}
                                className="h-12 w-auto object-contain"
                            />
                            <p className="text-xl font-mono font-semibold" style={{ color: "#00313C" }}>
                                Monitoramento de Vendas - Último Minuto
                            </p>
                        </div>

                        {/* Admin indicator */}
                        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "#00313C" }}>
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">Visualização Administrativa</span>
                            {!tenantInfo.is_active && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                                    Tenant Inativo
                                </span>
                            )}
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {/* Sales Indicator */}
                        <section className="flex flex-col items-center gap-6">
                            {currentStatus ? (
                                <>
                                    <SalesIndicator
                                        vendas={currentStatus.vendas_minuto}
                                        status={currentStatus.vendas_status}
                                        isFullscreen={false}
                                    />
                                    <TimeSinceUpdate
                                        seconds={timeSinceUpdate}
                                        lastUpdate={currentStatus.created_at}
                                        isFullscreen={false}
                                    />
                                </>
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed"
                                    style={{ borderColor: "rgba(255, 255, 255, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                                >
                                    <p className="text-white/70 text-center">
                                        Aguardando dados do webhook...
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Chart */}
                        <section>
                            <SalesChart data={hourlyData} isFullscreen={false} />
                        </section>
                    </main>

                    {/* Footer */}
                    <footer
                        className="mt-16 text-center space-y-4 animate-in fade-in duration-1000 delay-300 -mx-4 px-4 py-6 rounded-2xl"
                        style={{ backgroundColor: "#FFB81C" }}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={evenIcon}
                                alt="Even Icon"
                                className="w-12 h-12 object-contain animate-pulse"
                            />
                            <p className="text-sm" style={{ color: "#00313C" }}>
                                Visualização administrativa{" "}
                                <span className="font-bold">Even Tecnologia</span>
                            </p>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
};

export default AdminTenantMonitor;
