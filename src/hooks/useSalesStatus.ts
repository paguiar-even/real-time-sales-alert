import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SalesStatus {
  id: number;
  vendas_minuto: number;
  vendas_status: 'OK' | 'ALERTA_ZERO';
  created_at: string;
}

export interface HourlySales {
  hour: string;
  total: number;
  hasZero: boolean;
}

export const useSalesStatus = () => {
  const [currentStatus, setCurrentStatus] = useState<SalesStatus | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);

  // Fetch latest status
  const fetchLatestStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from('sales_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setCurrentStatus(data as SalesStatus);
    }
  }, []);

  // Fetch hourly data for the last 24 hours
  const fetchHourlyData = useCallback(async () => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('sales_status')
      .select('*')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: true });

    if (data && !error) {
      // Group by hour
      const hourlyMap = new Map<string, { total: number; hasZero: boolean }>();
      
      // Initialize all 24 hours
      for (let i = 0; i < 24; i++) {
        const hour = String(i).padStart(2, '0') + 'h';
        hourlyMap.set(hour, { total: 0, hasZero: false });
      }

      // Aggregate data
      (data as SalesStatus[]).forEach((record) => {
        const date = new Date(record.created_at);
        const hour = String(date.getHours()).padStart(2, '0') + 'h';
        const current = hourlyMap.get(hour) || { total: 0, hasZero: false };
        hourlyMap.set(hour, {
          total: current.total + record.vendas_minuto,
          hasZero: current.hasZero || record.vendas_status === 'ALERTA_ZERO'
        });
      });

      // Convert to array
      const hourlyArray: HourlySales[] = [];
      for (let i = 0; i < 24; i++) {
        const hour = String(i).padStart(2, '0') + 'h';
        const data = hourlyMap.get(hour) || { total: 0, hasZero: false };
        hourlyArray.push({ hour, ...data });
      }

      setHourlyData(hourlyArray);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLatestStatus(), fetchHourlyData()]);
      setLoading(false);
    };
    init();
  }, [fetchLatestStatus, fetchHourlyData]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('sales-status-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_status'
        },
        (payload) => {
          console.log('New sales status received:', payload);
          const newStatus = payload.new as SalesStatus;
          setCurrentStatus(newStatus);
          
          // Update hourly data
          fetchHourlyData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHourlyData]);

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
