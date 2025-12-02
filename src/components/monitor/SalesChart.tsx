import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { HourlySales } from "@/hooks/useSalesStatus";
import { cn } from "@/lib/utils";

interface SalesChartProps {
    data: HourlySales[];
    isFullscreen?: boolean;
}

export const SalesChart = ({ data, isFullscreen }: SalesChartProps) => {
    return (
        <div 
            className={cn(
                "rounded-2xl border p-4",
                isFullscreen ? "p-6 border-white/10 bg-white/5" : ""
            )}
            style={{
                backgroundColor: isFullscreen ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.05)",
                borderColor: "rgba(255, 255, 255, 0.1)"
            }}
        >
            <h3 
                className={cn(
                    "mb-4 font-semibold",
                    isFullscreen ? "text-xl" : "text-sm md:text-base"
                )}
                style={{ color: "rgba(255, 255, 255, 0.9)" }}
            >
                Histórico de Vendas - Últimas 24 Horas
            </h3>
            
            <div className={cn(isFullscreen ? "h-[300px]" : "h-[200px] md:h-[250px]")}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis 
                            dataKey="hour" 
                            tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: isFullscreen ? 14 : 10 }}
                            axisLine={{ stroke: "rgba(255, 255, 255, 0.2)" }}
                            tickLine={{ stroke: "rgba(255, 255, 255, 0.2)" }}
                            interval={isFullscreen ? 0 : 2}
                        />
                        <YAxis 
                            tick={{ fill: "rgba(255, 255, 255, 0.5)", fontSize: isFullscreen ? 14 : 10 }}
                            axisLine={{ stroke: "rgba(255, 255, 255, 0.2)" }}
                            tickLine={{ stroke: "rgba(255, 255, 255, 0.2)" }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#00313C",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                borderRadius: "8px",
                                color: "#ffffff"
                            }}
                            labelStyle={{ color: "#ffffff" }}
                            formatter={(value: number) => [`${value} vendas`, "Total"]}
                        />
                        <Bar 
                            dataKey="total" 
                            radius={[4, 4, 0, 0]}
                            maxBarSize={isFullscreen ? 40 : 30}
                        >
                            {data.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.hasZero ? "#ef4444" : "#22c55e"}
                                    opacity={entry.total === 0 ? 0.3 : 1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className={cn(
                "mt-4 flex justify-center gap-6",
                isFullscreen ? "text-base" : "text-xs"
            )}>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }} />
                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Normal</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }} />
                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Com alerta</span>
                </div>
            </div>
        </div>
    );
};
