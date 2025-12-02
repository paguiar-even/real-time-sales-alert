import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HourlySales } from '@/hooks/useSalesStatus';
import { cn } from '@/lib/utils';

interface SalesChartProps {
  data: HourlySales[];
  isFullscreen?: boolean;
}

export const SalesChart = ({ data, isFullscreen }: SalesChartProps) => {
  return (
    <div className={cn(
      'rounded-2xl border border-border/30 bg-card/30 p-4',
      isFullscreen ? 'p-6' : 'p-4'
    )}>
      <h3 className={cn(
        'mb-4 font-semibold text-foreground',
        isFullscreen ? 'text-xl' : 'text-sm md:text-base'
      )}>
        Histórico de Vendas - Últimas 24 Horas
      </h3>
      
      <div className={cn(isFullscreen ? 'h-[300px]' : 'h-[200px] md:h-[250px]')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <XAxis 
              dataKey="hour" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isFullscreen ? 14 : 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              interval={isFullscreen ? 0 : 2}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isFullscreen ? 14 : 10 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${value} vendas`, 'Total']}
            />
            <Bar 
              dataKey="total" 
              radius={[4, 4, 0, 0]}
              maxBarSize={isFullscreen ? 40 : 30}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.hasZero ? 'hsl(0, 84%, 60%)' : 'hsl(142, 76%, 45%)'}
                  opacity={entry.total === 0 ? 0.3 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className={cn(
        'mt-4 flex justify-center gap-6',
        isFullscreen ? 'text-base' : 'text-xs'
      )}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success" />
          <span className="text-muted-foreground">Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive" />
          <span className="text-muted-foreground">Com alerta</span>
        </div>
      </div>
    </div>
  );
};
