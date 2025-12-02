import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { supabase } from "@/integrations/supabase/client";
import { SalesIndicator } from "@/components/monitor/SalesIndicator";
import { TimeSinceUpdate } from "@/components/monitor/TimeSinceUpdate";
import { SalesChart } from "@/components/monitor/SalesChart";
import { HourlySales } from "@/hooks/useSalesStatus";
import { Button } from "@/components/ui/button";
import { useStaffToken } from "@/hooks/useStaffToken";

import evenLogo from "@/assets/even-logo.png";
import evenIcon from "@/assets/even-icon.png";
import rowPattern from "@/assets/row-pattern.png";

interface TenantInfo {
    tenant_id: string;
    tenant_name: string;
    tenant_logo_url: string | null;
    user_email: string;
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

const TenantMonitor = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { token, isValidated, setValidated, clearToken } = useStaffToken();

    const [validating, setValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [currentStatus, setCurrentStatus] = useState<SalesStatus | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);

    // Validate token
    useEffect(() => {
        const validateToken = async () => {
            // Trim and validate token and slug
            const trimmedToken = token?.trim();
            const trimmedSlug = slug?.trim();

            if (!trimmedToken || !trimmedSlug) {
                setError("Token ou slug não fornecido");
                setValidating(false);
                return;
            }

            try {
                const { data, error } = await supabase.rpc("validate_staff_token", {
                    p_token: trimmedToken,
                    p_tenant_slug: trimmedSlug
                });

                if (error) {
                    console.error("Error validating token:", error);
                    setError("Erro ao validar token");
                    setValidating(false);
                    return;
                }

                if (data && data.length > 0 && data[0].is_valid) {
                    setTenantInfo({
                        tenant_id: data[0].tenant_id,
                        tenant_name: data[0].tenant_name,
                        tenant_logo_url: data[0].tenant_logo_url,
                        user_email: data[0].user_email
                    });
                    setIsValid(true);

                    // Mark as validated and clean URL
                    setValidated();
                } else {
                    setError("Token inválido ou expirado");
                    clearToken();
                }
            } catch (err) {
                console.error("Error in token validation:", err);
                setError("Erro ao validar token");
            }

            setValidating(false);
        };

        validateToken();
    }, [token, slug, setValidated, clearToken]);

    // Fetch sales data
    useEffect(() => {
        if (!isValid || !tenantInfo) return;

        const fetchSalesData = async () => {
            // Fetch current status
            const { data: statusData, error: statusError } = await supabase
                .from("sales_status")
                .select("*")
                .eq("tenant_id", tenantInfo.tenant_id)
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
                .eq("tenant_id", tenantInfo.tenant_id)
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
            .channel("tenant-sales-status")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "sales_status",
                    filter: `tenant_id=eq.${tenantInfo.tenant_id}`
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
    }, [isValid, tenantInfo]);

    // Validating state
    if (validating) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#FFB81C" }} />
                    <p className="text-white/70">Validando acesso...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (!isValid || error) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                    <AlertTriangle className="w-16 h-16 text-red-500" />
                    <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
                    <p className="text-white/70">{error || "Token inválido ou expirado"}</p>
                    <Button
                        variant="outline"
                        onClick={() => navigate("/auth")}
                        className="mt-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar ao Login
                    </Button>
                </div>
            </div>
        );
    }

    const displayLogo = tenantInfo?.tenant_logo_url || evenLogo;
    const displayName = tenantInfo?.tenant_name || "Monitor";

    // Loading data state
    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: "#FFB81C" }} />
                    <p className="text-white/70">Carregando dados de {displayName}...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Monitor | {displayName}</title>
                <meta name="description" content={`Monitoramento em tempo real - ${displayName}`} />
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
                        {/* Back to list button */}
                        <div className="flex justify-start -mb-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/tenants")}
                                className="text-[#00313C] hover:bg-[#00313C]/10"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Ver todos
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

                        {/* Staff indicator */}
                        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "#00313C" }}>
                            <span className="opacity-70">Acesso Even:</span>
                            <span className="font-medium">{tenantInfo?.user_email}</span>
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
                                Acesso interno via{" "}
                                <span className="font-bold">Even Tecnologia</span>
                            </p>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
};

export default TenantMonitor;
