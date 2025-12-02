import { useState, useEffect, useCallback } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

export interface SalesStatus {
    id: number;
    vendas_minuto: number;
    vendas_status: "OK" | "ALERTA_ZERO";
    created_at: string;
    tenant_id?: string;
}

export interface HourlySales {
    hour: string;
    total: number;
    hasZero: boolean;
}

export const useSalesStatus = () => {
    const { tenant } = useTenant();
    const [currentStatus, setCurrentStatus] = useState<SalesStatus | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlySales[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);

    // Fetch latest status - MUST filter by tenant_id
    const fetchLatestStatus = useCallback(async () => {
        if (!tenant?.id) {
            setCurrentStatus(null);
            return;
        }

        const { data, error } = await supabase
            .from("sales_status")
            .select("*")
            .eq("tenant_id", tenant.id) // CRITICAL: Filter by user's tenant
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data && !error) {
            setCurrentStatus(data as SalesStatus);
        } else {
            setCurrentStatus(null);
        }
    }, [tenant?.id]);

    // Fetch hourly data for the last 24 hours - MUST filter by tenant_id
    const fetchHourlyData = useCallback(async () => {
        if (!tenant?.id) {
            setHourlyData([]);
            return;
        }

        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error } = await supabase
            .from("sales_status")
            .select("*")
            .eq("tenant_id", tenant.id) // CRITICAL: Filter by user's tenant
            .gte("created_at", twentyFourHoursAgo.toISOString())
            .order("created_at", { ascending: true });

        if (data && !error) {
            // Group by hour
            const hourlyMap = new Map<string, { total: number; hasZero: boolean }>();

            // Initialize all 24 hours
            for (let i = 0; i < 24; i++) {
                const hour = String(i).padStart(2, "0") + "h";
                hourlyMap.set(hour, { total: 0, hasZero: false });
            }

            // Aggregate data
            (data as SalesStatus[]).forEach((record) => {
                const date = new Date(record.created_at);
                const hour = String(date.getHours()).padStart(2, "0") + "h";
                const current = hourlyMap.get(hour) || { total: 0, hasZero: false };

                hourlyMap.set(hour, {
                    total: current.total + record.vendas_minuto,
                    hasZero: current.hasZero || record.vendas_status === "ALERTA_ZERO"
                });
            });

            // Convert to array
            const hourlyArray: HourlySales[] = [];

            for (let i = 0; i < 24; i++) {
                const hour = String(i).padStart(2, "0") + "h";
                const data = hourlyMap.get(hour) || { total: 0, hasZero: false };
                hourlyArray.push({ hour, ...data });
            }

            setHourlyData(hourlyArray);
        } else {
            setHourlyData([]);
        }
    }, [tenant?.id]);

    // Initial fetch when tenant changes
    useEffect(() => {
        const init = async () => {
            setLoading(true);

            if (tenant?.id) {
                await Promise.all([fetchLatestStatus(), fetchHourlyData()]);
            } else {
                setCurrentStatus(null);
                setHourlyData([]);
            }

            setLoading(false);
        };

        init();
    }, [tenant?.id, fetchLatestStatus, fetchHourlyData]);

    // Set up realtime subscription - CRITICAL: Filter by tenant_id
    useEffect(() => {
        if (!tenant?.id) return;

        const channel = supabase
            .channel(`sales-status-${tenant.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "sales_status",
                    filter: `tenant_id=eq.${tenant.id}` // CRITICAL: Only listen to this tenant's data
                },
                (payload) => {
                    console.log("New sales status received:", payload);
                    const newStatus = payload.new as SalesStatus;

                    // Double-check tenant_id matches (defense in depth)
                    if (newStatus.tenant_id === tenant.id) {
                        setCurrentStatus(newStatus);
                        setTimeSinceUpdate(0);
                        fetchHourlyData();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenant?.id, fetchHourlyData]);

    // Update time since last update every second
    useEffect(() => {
        const interval = setInterval(() => {
            if (currentStatus) {
                const now = new Date().getTime();
                const lastUpdate = new Date(currentStatus.created_at).getTime();
                setTimeSinceUpdate(Math.floor((now - lastUpdate) / 1000));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentStatus]);

    return {
        currentStatus,
        hourlyData,
        loading,
        timeSinceUpdate,
        refetch: () => {
            fetchLatestStatus();
            fetchHourlyData();
        }
    };
};
