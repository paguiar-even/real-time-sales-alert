import { useSalesStatus } from '@/hooks/useSalesStatus';
import { useAlertSound } from '@/hooks/useAlertSound';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { SalesIndicator } from '@/components/monitor/SalesIndicator';
import { TimeSinceUpdate } from '@/components/monitor/TimeSinceUpdate';
import { SalesChart } from '@/components/monitor/SalesChart';
import { Loader2, Maximize2, Minimize2, Volume2, VolumeX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Helmet } from 'react-helmet-async';
import evenLogo from '@/assets/even-logo.png';
import evenIcon from '@/assets/even-icon.png';
import rowPattern from '@/assets/row-pattern.png';

const Monitor = () => {
  const { currentStatus, hourlyData, loading, timeSinceUpdate } = useSalesStatus();
  const isAlert = currentStatus?.vendas_status === 'ALERTA_ZERO';
  const { isMuted, toggleMute } = useAlertSound(isAlert);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { signOut } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();

  // Use tenant logo if available, otherwise use Even logo
  const displayLogo = tenant?.logo_url || evenLogo;
  const displayName = tenant?.name || 'Even Tecnologia';

  if (loading || tenantLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#00313C' }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#FFB81C' }} />
          <p className="text-white/70">Carregando dados...</p>
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

        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#00313C' }}>
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
                  />
                  <TimeSinceUpdate
                    seconds={timeSinceUpdate}
                    lastUpdate={currentStatus.created_at}
                    isFullscreen={true}
                  />
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

          <footer className="text-center py-4">
            <span className="text-white/30 text-sm">
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

      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#00313C' }}>
        {/* Row pattern background */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none" 
          style={{
            backgroundImage: `url(${rowPattern})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto'
          }} 
        />

        <div className="container max-w-5xl mx-auto px-4 py-12 relative">
          {/* Header */}
          <header 
            className="mb-8 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 -mx-4 px-4 py-6 rounded-2xl"
            style={{ backgroundColor: '#FFB81C' }}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <img 
                src={displayLogo} 
                alt={displayName} 
                className="h-12 w-auto object-contain" 
              />
              <p className="text-xl font-mono font-semibold" style={{ color: '#00313C' }}>
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
                  borderColor: '#00313C', 
                  color: '#00313C',
                  backgroundColor: 'transparent'
                }}
              >
                {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                {isMuted ? 'Som desativado' : 'Som ativo'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="rounded-full border-2 hover:bg-white/20"
                style={{ 
                  borderColor: '#00313C', 
                  color: '#00313C',
                  backgroundColor: 'transparent'
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
                  borderColor: '#00313C', 
                  color: '#00313C',
                  backgroundColor: 'transparent'
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>

            <Separator className="w-32 mx-auto" style={{ backgroundColor: '#00313C', opacity: 0.3 }} />
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
                  style={{ borderColor: 'rgba(255, 255, 255, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
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

          {/* Footer */}
          <footer 
            className="mt-16 text-center space-y-4 animate-in fade-in duration-1000 delay-300 -mx-4 px-4 py-6 rounded-2xl"
            style={{ backgroundColor: '#FFB81C' }}
          >
            <Separator className="w-32 mx-auto" style={{ backgroundColor: '#00313C', opacity: 0.3 }} />
            <div className="flex flex-col items-center gap-3">
              <img 
                src={evenIcon} 
                alt="Even Icon" 
                className="w-12 h-12 object-contain animate-pulse" 
              />
              <p className="text-sm" style={{ color: '#00313C' }}>
                Construído com excelência pela{" "}
                <span className="font-bold">Even Tecnologia</span>
              </p>
            </div>
            <p className="text-xs" style={{ color: '#00313C', opacity: 0.8 }}>
              Está faltando algo? Entre em contato conosco!
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Monitor;
