import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSinceUpdateProps {
  seconds: number;
  lastUpdate: string | null;
  isFullscreen?: boolean;
}

const formatTimeSince = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} hora${hours !== 1 ? 's' : ''}`;
};

const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const TimeSinceUpdate = ({ seconds, lastUpdate, isFullscreen }: TimeSinceUpdateProps) => {
  const isStale = seconds > 120; // More than 2 minutes since last update

  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-xl border',
        isFullscreen ? 'bg-white/5 border-white/10' : ''
      )}
      style={{
        backgroundColor: isStale ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        borderColor: isStale ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="flex items-center gap-2">
        <Clock 
          className={cn(isFullscreen ? 'w-6 h-6' : 'w-4 h-4')}
          style={{ color: isStale ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)' }}
        />
        <span 
          className={cn('font-medium', isFullscreen ? 'text-lg' : 'text-sm')}
          style={{ color: isStale ? '#fbbf24' : 'rgba(255, 255, 255, 0.6)' }}
        >
          Atualizado há {formatTimeSince(seconds)}
        </span>
      </div>
      
      {lastUpdate && (
        <span 
          className={cn(isFullscreen ? 'text-base' : 'text-xs')}
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          {formatTimestamp(lastUpdate)}
        </span>
      )}
    </div>
  );
};
