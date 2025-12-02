import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Maximize2, Minimize2, Volume2, VolumeX, LogOut, Settings } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { useSalesStatus } from "@/hooks/useSalesStatus";
import { useAlertSound } from "@/hooks/useAlertSound";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useAdmin } from "@/hooks/useAdmin";
import { SalesIndicator } from "@/components/monitor/SalesIndicator";
import { TimeSinceUpdate } from "@/components/monitor/TimeSinceUpdate";
import { SalesChart } from "@/components/monitor/SalesChart";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

import evenLogo from "@/assets/even-logo.png";
import evenIcon from "@/assets/even-icon.png";
import rowPattern from "@/assets/row-pattern.png";

const Monitor = () => {
    const navigate = useNavigate();
    const { tenant, loading: tenantLoading, isBlocked } = useTenant();
    const { currentStatus, hourlyData, loading, timeSinceUpdate } = useSalesStatus();
    const isAlert = currentStatus?.vendas_status === "ALERTA_ZERO";
    const { isMuted, toggleMute } = useAlertSound(isAlert);
    const { isFullscreen, toggleFullscreen } = useFullscreen();
    const { signOut } = useAuth();
    const { isAdmin } = useAdmin();
    const hasLoggedAccess = useRef(false);
    const [isSalesHidden, setIsSalesHidden] = useState(false);

    const toggleSalesVisibility = () => setIsSalesHidden(prev => !prev);

    // Log access when user visits the monitor
    useEffect(() => {
        const logAccess = async () => {
            if (tenant && !hasLoggedAccess.current && !isBlocked) {
                hasLoggedAccess.current = true;

                try {
                    await supabase.rpc("log_user_access", {
                        p_tenant_id: tenant.id,
                        p_tenant_name: tenant.name,
                        p_action: "monitor_access"
                    });
                } catch (error) {
                    console.error("Error logging access:", error);
                }
            }
        };

        if (!loading && !tenantLoading && tenant) {
            logAccess();
        }
    }, [tenant, loading, tenantLoading, isBlocked]);

    // Use tenant logo if available, otherwise use Even logo
    const displayLogo = tenant?.logo_url || evenLogo;
    const displayName = tenant?.name || "Even Tecnologia";

    if (loading || tenantLoading) {
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

    // Blocked user
    if (isBlocked) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                        <LogOut className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Acesso Bloqueado</h1>
                    <p className="text-white/70">
                        Seu acesso a este monitor foi bloqueado pelo administrador.
                        Entre em contato com o suporte para mais informações.
                    </p>
                    <Button
                        variant="outline"
                        onClick={signOut}
                        className="mt-4 border-white/30 text-white hover:bg-white/10"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                    </Button>
                </div>
            </div>
        );
    }

    // No tenant access - redirect admins to admin panel
    if (!tenant) {
        if (isAdmin) {
            return (
                <div
                    className="min-h-screen flex items-center justify-center"
                    style={{ backgroundColor: "#00313C" }}
                >
                    <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Settings className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Área de Administração</h1>
                        <p className="text-white/70">
                            Como administrador, você não possui um monitor de cliente associado.
                            Acesse o painel administrativo para gerenciar todos os tenants.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <Button
                                onClick={() => navigate("/admin")}
                                style={{ backgroundColor: "#FFB81C", color: "#00313C" }}
                                className="hover:opacity-90"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Painel Admin
                            </Button>
                            <Button
                                variant="outline"
                                onClick={signOut}
                                className="border-white/30 text-white hover:bg-white/10"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Settings className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Sem Acesso</h1>
                    <p className="text-white/70">
                        Você não possui acesso a nenhum monitor.
                        Verifique se sua conta está vinculada a um cliente ativo.
                    </p>
                    <Button
                        variant="outline"
                        onClick={signOut}
                        className="mt-4 border-white/30 text-white hover:bg-white/10"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                    </Button>
                </div>
            </div>
        );
    }

    // Fullscreen mode - simplified dark layout
    if (isFullscreen) {
        return (
            <>
                <Helmet>
                    <title>Monitor de Vendas | {displayName}</title>
                    <meta name="description" content="Monitoramento em tempo real de vendas por minuto" />
                </Helmet>

                <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#00313C" }}>
                    {/* Fullscreen Header */}
                    <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <img src={displayLogo} alt={displayName} className="h-8 w-auto" />
                            <span className="text-white/70 text-lg">Monitoramento de Vendas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMute}
                                className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                            >
                                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleFullscreen}
                                className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                            >
                                <Minimize2 className="w-6 h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={signOut}
                                className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                                title="Sair"
                            >
                                <LogOut className="w-6 h-6" />
                            </Button>
                        </div>
                    </header>

                    {/* Fullscreen Content */}
                    <main className="flex-1 flex items-stretch gap-6 p-6">
                        <section className="w-[60%] flex flex-col items-center justify-center gap-6">
                            {currentStatus ? (
                                <>
                                    <SalesIndicator
                                        vendas={currentStatus.vendas_minuto}
                                        status={currentStatus.vendas_status}
                                        isFullscreen={true}
                                        isHidden={isSalesHidden}
                                        onToggleVisibility={toggleSalesVisibility}
                                    />
                                    <TimeSinceUpdate
                                        seconds={timeSinceUpdate}
                                        lastUpdate={currentStatus.created_at}
                                        isFullscreen={true}
                                    />
                                    
                                    {/* Status Message */}
                                    {currentStatus.vendas_status === "OK" && (
                                        <div className="flex items-center justify-center gap-3 py-3 px-5 rounded-xl bg-green-500/15 border border-green-500/30 mt-2">
                                            <div className="relative flex items-center justify-center">
                                                <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-500 opacity-75 animate-ping" />
                                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                                            </div>
                                            <span className="text-green-400 font-medium text-lg">
                                                Por aqui tá tudo certo! Tá tudo Even!
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-white/20 bg-white/5">
                                    <p className="text-white/70 text-center">
                                        Aguardando dados do webhook...
                                    </p>
                                </div>
                            )}
                        </section>

                        <section className="w-[40%] flex flex-col justify-center">
                            <SalesChart data={hourlyData} isFullscreen={true} />
                        </section>
                    </main>

                    <footer className="text-center py-4 px-8 space-y-3">
                        <p className="text-white/60 text-sm leading-relaxed max-w-2xl mx-auto italic">
                            "Todo aquele, pois, que ouve estas minhas palavras e as pratica será comparado a um homem prudente que construiu a sua casa sobre a rocha."
                            <span className="text-white/40 not-italic ml-2">— Mateus 7:24</span>
                        </p>
                        <span className="text-white/30 text-sm block">
                            Pressione ESC para sair do modo tela cheia
                        </span>
                    </footer>
                </div>
            </>
        );
    }

    // Normal mode - branded layout
    return (
        <>
            <Helmet>
                <title>Monitor de Vendas | {displayName}</title>
                <meta name="description" content="Monitoramento em tempo real de vendas por minuto" />
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

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleMute}
                                className="rounded-full border-2 hover:bg-white/20"
                                style={{
                                    borderColor: "#00313C",
                                    color: "#00313C",
                                    backgroundColor: "transparent"
                                }}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                                {isMuted ? "Som desativado" : "Som ativo"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleFullscreen}
                                className="rounded-full border-2 hover:bg-white/20"
                                style={{
                                    borderColor: "#00313C",
                                    color: "#00313C",
                                    backgroundColor: "transparent"
                                }}
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Tela cheia
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={signOut}
                                className="rounded-full border-2 hover:bg-white/20"
                                style={{
                                    borderColor: "#00313C",
                                    color: "#00313C",
                                    backgroundColor: "transparent"
                                }}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </Button>

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/admin")}
                                    className="rounded-full border-2 hover:bg-white/20"
                                    style={{
                                        borderColor: "#00313C",
                                        color: "#00313C",
                                        backgroundColor: "transparent"
                                    }}
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Admin
                                </Button>
                            )}
                        </div>

                        <Separator className="w-32 mx-auto" style={{ backgroundColor: "#00313C", opacity: 0.3 }} />
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
                                        isHidden={isSalesHidden}
                                        onToggleVisibility={toggleSalesVisibility}
                                    />
                                    <TimeSinceUpdate
                                        seconds={timeSinceUpdate}
                                        lastUpdate={currentStatus.created_at}
                                        isFullscreen={false}
                                    />
                                    
                                    {/* Status Message */}
                                    {currentStatus.vendas_status === "OK" && (
                                        <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-green-500/15 border border-green-500/30 mt-4">
                                            <div className="relative flex items-center justify-center">
                                                <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-500 opacity-75 animate-ping" />
                                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                                            </div>
                                            <span className="text-green-400 font-medium text-sm">
                                                Por aqui tá tudo certo! Tá tudo Even!
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed"
                                    style={{ borderColor: "rgba(255, 255, 255, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                                >
                                    <p className="text-white/70 text-center">
                                        Aguardando dados do webhook...
                                        <br />
                                        <span className="text-sm text-white/50">Configure o n8n para enviar dados para este monitor</span>
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Chart */}
                        <section>
                            <SalesChart data={hourlyData} isFullscreen={false} />
                        </section>
                    </main>

                    {/* Bible Verse */}
                    <div className="mt-12 text-center px-4 py-8 rounded-2xl" style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}>
                        <p className="text-white/80 text-base leading-relaxed max-w-2xl mx-auto italic">
                            "Todo aquele, pois, que ouve estas minhas palavras e as pratica será comparado a um homem prudente que construiu a sua casa sobre a rocha. Caiu a chuva, vieram as torrentes, sopraram os ventos e bateram com força contra aquela casa, e ela não desabou, porque tinha sido construída sobre a rocha."
                        </p>
                        <p className="text-white/50 text-sm mt-4 font-medium">
                            — Mateus 7:24-25
                        </p>
                    </div>

                    {/* Footer */}
                    <footer
                        className="mt-8 text-center space-y-4 animate-in fade-in duration-1000 delay-300 -mx-4 px-4 py-6 rounded-2xl"
                        style={{ backgroundColor: "#FFB81C" }}
                    >
                        <Separator className="w-32 mx-auto" style={{ backgroundColor: "#00313C", opacity: 0.3 }} />
                        <div className="flex flex-col items-center gap-3">
                            <img
                                src={evenIcon}
                                alt="Even Icon"
                                className="w-12 h-12 object-contain animate-pulse"
                            />
                            <p className="text-sm" style={{ color: "#00313C" }}>
                                Construído com excelência pela{" "}
                                <span className="font-bold">Even Tecnologia</span>
                            </p>
                        </div>
                        <p className="text-xs" style={{ color: "#00313C", opacity: 0.8 }}>
                            Está faltando algo? Entre em contato conosco!
                        </p>
                    </footer>
                </div>
            </div>
        </>
    );
};

export default Monitor;
