import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SalesIndicatorProps {
  vendas: number;
  status: 'OK' | 'ALERTA_ZERO';
  isFullscreen?: boolean;
}

export const SalesIndicator = ({ vendas, status, isFullscreen }: SalesIndicatorProps) => {
  const isAlert = status === 'ALERTA_ZERO';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border-2 transition-all duration-500',
        isAlert 
          ? 'bg-[hsl(var(--monitor-alert-bg))] border-destructive animate-glow' 
          : 'bg-[hsl(var(--monitor-success-bg))] border-success',
        isFullscreen ? 'p-12' : 'p-8 md:p-12'
      )}
    >
      {/* Status Icon */}
      <div className={cn(
        'mb-4 rounded-full p-4',
        isAlert 
          ? 'bg-destructive/20 text-destructive animate-pulse-alert' 
          : 'bg-success/20 text-success'
      )}>
        {isAlert ? (
          <AlertTriangle className={cn(isFullscreen ? 'w-16 h-16' : 'w-10 h-10 md:w-12 md:h-12')} />
        ) : (
          <CheckCircle2 className={cn(isFullscreen ? 'w-16 h-16' : 'w-10 h-10 md:w-12 md:h-12')} />
        )}
      </div>

      {/* Sales Number */}
      <div className={cn(
        'font-mono font-bold tracking-tight',
        isAlert ? 'text-destructive' : 'text-success',
        isFullscreen ? 'text-[12rem] leading-none' : 'text-7xl md:text-9xl'
      )}>
        {vendas}
      </div>

      {/* Label */}
      <p className={cn(
        'mt-4 font-medium uppercase tracking-widest',
        isAlert ? 'text-destructive/80' : 'text-success/80',
        isFullscreen ? 'text-2xl' : 'text-sm md:text-base'
      )}>
        Vendas no último minuto
      </p>

      {/* Status Badge */}
      <div className={cn(
        'mt-6 px-6 py-2 rounded-full font-semibold',
        isAlert 
          ? 'bg-destructive text-destructive-foreground animate-pulse-alert' 
          : 'bg-success text-success-foreground',
        isFullscreen ? 'text-xl' : 'text-sm'
      )}>
        {isAlert ? 'ALERTA ZERO' : 'OPERAÇÃO NORMAL'}
      </div>
    </div>
  );
};
