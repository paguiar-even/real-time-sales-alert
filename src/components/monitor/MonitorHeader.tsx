import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MonitorHeaderProps {
  isFullscreen: boolean;
  isMuted: boolean;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
}

export const MonitorHeader = ({ 
  isFullscreen, 
  isMuted, 
  onToggleFullscreen, 
  onToggleMute 
}: MonitorHeaderProps) => {
  return (
    <header className={cn(
      'flex items-center justify-between border-b border-border/30 bg-card/30',
      isFullscreen ? 'px-8 py-4' : 'px-4 py-3 md:px-6'
    )}>
      <h1 className={cn(
        'font-bold tracking-tight text-foreground',
        isFullscreen ? 'text-2xl' : 'text-lg md:text-xl'
      )}>
        Monitoramento de Vendas
        <span className={cn(
          'block font-normal text-muted-foreground',
          isFullscreen ? 'text-lg' : 'text-xs md:text-sm'
        )}>
          Último minuto
        </span>
      </h1>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMute}
          className={cn(
            'rounded-full',
            isMuted ? 'text-muted-foreground' : 'text-foreground'
          )}
          title={isMuted ? 'Ativar alertas sonoros' : 'Silenciar alertas'}
        >
          {isMuted ? (
            <VolumeX className={cn(isFullscreen ? 'w-6 h-6' : 'w-5 h-5')} />
          ) : (
            <Volume2 className={cn(isFullscreen ? 'w-6 h-6' : 'w-5 h-5')} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="rounded-full text-foreground"
          title={isFullscreen ? 'Sair da tela cheia (ESC)' : 'Modo tela cheia'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-6 h-6" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </Button>
      </div>
    </header>
  );
};
