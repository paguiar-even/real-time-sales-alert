import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Building2, ExternalLink, ShieldAlert, Activity, Clock } from 'lucide-react';
import evenLogo from '@/assets/even-logo.png';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

interface TokenValidation {
  isValid: boolean;
  userEmail: string;
}

export default function StaffTenantsList() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [validating, setValidating] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<TokenValidation | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setValidating(false);
      return;
    }

    // Validate token using the dedicated function
    const { data, error } = await supabase.rpc('validate_staff_token_only', {
      p_token: token
    });

    if (data && data.length > 0 && data[0].is_valid) {
      setTokenInfo({
        isValid: true,
        userEmail: data[0].user_email || ''
      });
      fetchTenants();
    } else {
      setTokenInfo({ isValid: false, userEmail: '' });
    }

    setValidating(false);
  };

  const fetchTenants = async () => {
    if (!token) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_tenants_for_staff', {
      p_token: token
    });

    if (!error && data) {
      setTenants(data);
    }
    setLoading(false);
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(search.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(search.toLowerCase())
  );

  const activeTenants = filteredTenants.filter(t => t.is_active);
  const inactiveTenants = filteredTenants.filter(t => !t.is_active);

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenInfo?.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              {!token 
                ? 'Token de acesso não fornecido na URL.'
                : 'Token inválido ou expirado.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Para acessar a lista de tenants, utilize uma URL com token válido.</p>
            <p className="mt-2 font-mono text-xs bg-muted p-2 rounded">
              /tenants?token=SEU_TOKEN
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={evenLogo} alt="Even" className="h-8" />
              <div>
                <h1 className="font-semibold">Monitor de Vendas</h1>
                <p className="text-xs text-muted-foreground">Acesso Even Staff</p>
              </div>
            </div>
            {tokenInfo.userEmail && (
              <Badge variant="secondary" className="hidden sm:flex">
                {tokenInfo.userEmail}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tenant por nome ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Activity className="h-4 w-4 text-green-500" />
              {activeTenants.length} ativos
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {inactiveTenants.length} inativos
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Tenants Grid */}
          {!loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeTenants.map((tenant) => (
                <TenantCard key={tenant.id} tenant={tenant} token={token} />
              ))}
              {inactiveTenants.map((tenant) => (
                <TenantCard key={tenant.id} tenant={tenant} token={token} inactive />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredTenants.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? 'Nenhum tenant encontrado com este termo.' : 'Nenhum tenant cadastrado.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TenantCard({ tenant, token, inactive }: { tenant: Tenant; token: string; inactive?: boolean }) {
  const navigate = useNavigate();

  const handleAccess = () => {
    navigate(`/t/${tenant.slug}?token=${token}`);
  };

  return (
    <Card className={`transition-all hover:shadow-md ${inactive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-10 w-10 rounded-lg object-contain bg-muted p-1"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{tenant.name}</CardTitle>
            <CardDescription className="text-xs font-mono">/{tenant.slug}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge variant={tenant.is_active ? 'default' : 'secondary'} className="text-xs">
            {tenant.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAccess}
            disabled={!tenant.is_active}
            className="gap-1"
          >
            Acessar
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
