import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, History, Clock, User, Monitor } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccessLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface TenantAccessLogsProps {
  tenantId: string;
  tenantName: string;
}

export function TenantAccessLogs({ tenantId, tenantName }: TenantAccessLogsProps) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_tenant_access_logs', {
      target_tenant_id: tenantId,
      limit_count: 100
    });

    if (error) {
      console.error('Error fetching access logs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de acessos.',
        variant: 'destructive',
      });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      fetchLogs();
    }
  }, [tenantId]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'monitor_access':
        return { label: 'Acesso ao Monitor', variant: 'default' as const };
      case 'login':
        return { label: 'Login', variant: 'secondary' as const };
      case 'logout':
        return { label: 'Logout', variant: 'outline' as const };
      default:
        return { label: action, variant: 'outline' as const };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = new Date(log.created_at).toLocaleDateString('pt-BR');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, AccessLog[]>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Acessos
          </CardTitle>
          <CardDescription>
            Últimos 100 acessos ao monitoramento de {tenantName}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum acesso registrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground px-2">{date}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {dateLogs.map((log) => {
                    const actionInfo = getActionLabel(log.action);
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Monitor className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{log.user_email}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(log.created_at)}
                              <span className="mx-1">•</span>
                              {getTimeAgo(log.created_at)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={actionInfo.variant}>
                          {actionInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
