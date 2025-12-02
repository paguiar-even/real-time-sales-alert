import { useSalesStatus } from '@/hooks/useSalesStatus';
import { useAlertSound } from '@/hooks/useAlertSound';
import { useFullscreen } from '@/hooks/useFullscreen';
import { MonitorHeader } from '@/components/monitor/MonitorHeader';
import { SalesIndicator } from '@/components/monitor/SalesIndicator';
import { TimeSinceUpdate } from '@/components/monitor/TimeSinceUpdate';
import { SalesChart } from '@/components/monitor/SalesChart';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';

const Monitor = () => {
  const { currentStatus, hourlyData, loading, timeSinceUpdate } = useSalesStatus();
  const isAlert = currentStatus?.vendas_status === 'ALERTA_ZERO';
  const { isMuted, toggleMute } = useAlertSound(isAlert);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--monitor-bg))]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Monitor de Vendas | Even Tecnologia</title>
        <meta name="description" content="Monitoramento em tempo real de vendas por minuto" />
      </Helmet>

      <div className={cn(
        'min-h-screen flex flex-col bg-[hsl(var(--monitor-bg))]',
        isFullscreen && 'fixed inset-0 z-50'
      )}>
        <MonitorHeader
          isFullscreen={isFullscreen}
          isMuted={isMuted}
          onToggleFullscreen={toggleFullscreen}
          onToggleMute={toggleMute}
        />

        <main className={cn(
          'flex-1',
          isFullscreen 
            ? 'flex items-stretch gap-6 p-6' 
            : 'flex flex-col gap-6 p-4 md:p-6'
        )}>
          {/* Main Indicator Section */}
          <section className={cn(
            'flex flex-col items-center justify-center gap-6',
            isFullscreen ? 'w-[60%]' : 'w-full'
          )}>
            {currentStatus ? (
              <>
                <SalesIndicator
                  vendas={currentStatus.vendas_minuto}
                  status={currentStatus.vendas_status}
                  isFullscreen={isFullscreen}
                />
                <TimeSinceUpdate
                  seconds={timeSinceUpdate}
                  lastUpdate={currentStatus.created_at}
                  isFullscreen={isFullscreen}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-border/50 bg-card/10">
                <p className="text-muted-foreground text-center">
                  Aguardando dados do webhook...
                  <br />
                  <span className="text-sm">Configure o n8n para enviar dados para este monitor</span>
                </p>
              </div>
            )}
          </section>

          {/* Chart Section */}
          <section className={cn(
            isFullscreen ? 'w-[40%] flex flex-col justify-center' : 'w-full'
          )}>
            <SalesChart data={hourlyData} isFullscreen={isFullscreen} />
          </section>
        </main>

        {/* Footer hint for fullscreen */}
        {isFullscreen && (
          <footer className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-muted-foreground/50 text-sm">
              Pressione ESC para sair do modo tela cheia
            </span>
          </footer>
        )}
      </div>
    </>
  );
};

export default Monitor;
