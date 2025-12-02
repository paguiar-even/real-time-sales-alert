import { CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SalesIndicatorProps {
    vendas: number;
    status: "OK" | "ALERTA_ZERO";
    isFullscreen?: boolean;
    isHidden?: boolean;
    onToggleVisibility?: () => void;
}

export const SalesIndicator = ({ vendas, status, isFullscreen, isHidden = false, onToggleVisibility }: SalesIndicatorProps) => {
    const isAlert = status === "ALERTA_ZERO";

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-3xl border-4 transition-all duration-500 relative",
                isAlert 
                    ? "animate-glow" 
                    : "",
                isFullscreen ? "p-12" : "p-8 md:p-12"
            )}
            style={{
                backgroundColor: isAlert ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                borderColor: isAlert ? "#ef4444" : "#22c55e"
            }}
        >
            {/* Visibility Toggle */}
            {onToggleVisibility && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleVisibility}
                    className={cn(
                        "absolute top-4 right-4 rounded-full transition-colors",
                        isFullscreen ? "w-12 h-12" : "w-10 h-10"
                    )}
                    style={{
                        color: isAlert ? "rgba(239, 68, 68, 0.6)" : "rgba(34, 197, 94, 0.6)"
                    }}
                    title={isHidden ? "Mostrar vendas" : "Ocultar vendas"}
                >
                    {isHidden ? (
                        <EyeOff className={cn(isFullscreen ? "w-6 h-6" : "w-5 h-5")} />
                    ) : (
                        <Eye className={cn(isFullscreen ? "w-6 h-6" : "w-5 h-5")} />
                    )}
                </Button>
            )}

            {/* Status Icon */}
            <div 
                className={cn(
                    "mb-4 rounded-full p-4",
                    isAlert ? "animate-pulse-alert" : ""
                )}
                style={{
                    backgroundColor: isAlert ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                    color: isAlert ? "#ef4444" : "#22c55e"
                }}
            >
                {isAlert ? (
                    <AlertTriangle className={cn(isFullscreen ? "w-16 h-16" : "w-10 h-10 md:w-12 md:h-12")} />
                ) : (
                    <CheckCircle2 className={cn(isFullscreen ? "w-16 h-16" : "w-10 h-10 md:w-12 md:h-12")} />
                )}
            </div>

            {/* Sales Number */}
            <div 
                className={cn(
                    "font-mono font-bold tracking-tight transition-all duration-300",
                    isFullscreen ? "text-[12rem] leading-none" : "text-7xl md:text-9xl",
                    isHidden && "blur-xl select-none"
                )}
                style={{ color: isAlert ? "#ef4444" : "#22c55e" }}
            >
                {vendas}
            </div>

            {/* Label */}
            <p 
                className={cn(
                    "mt-4 font-medium uppercase tracking-widest",
                    isFullscreen ? "text-2xl" : "text-sm md:text-base"
                )}
                style={{ color: isAlert ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.8)" }}
            >
                Vendas no último minuto
            </p>

            {/* Status Badge */}
            <div 
                className={cn(
                    "mt-6 px-6 py-2 rounded-full font-semibold text-white",
                    isAlert ? "animate-pulse-alert" : "",
                    isFullscreen ? "text-xl" : "text-sm"
                )}
                style={{ backgroundColor: isAlert ? "#ef4444" : "#22c55e" }}
            >
                {isAlert ? "ALERTA ZERO" : "OPERAÇÃO NORMAL"}
            </div>
        </div>
    );
};
