import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const [checkingMfa, setCheckingMfa] = useState(true);
  const [needsMfaEnroll, setNeedsMfaEnroll] = useState(false);
  const [needsMfaVerify, setNeedsMfaVerify] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkMfaAndAdmin = async () => {
      if (!user) {
        setCheckingMfa(false);
        return;
      }

      try {
        // Check admin status if required
        if (requireAdmin) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          setIsAdmin(!!roleData);
          
          if (!roleData) {
            setCheckingMfa(false);
            return;
          }
        } else {
          // Check if user is blocked (only for non-admin routes)
          const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('is_blocked')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (userTenant?.is_blocked) {
            setIsBlocked(true);
            setCheckingMfa(false);
            return;
          }
        }

        // Check MFA status
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');

        if (!totpFactor) {
          setNeedsMfaEnroll(true);
          setCheckingMfa(false);
          return;
        }

        // Check if MFA is verified for this session
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData?.currentLevel !== 'aal2') {
          setNeedsMfaVerify(true);
        }
      } catch (error) {
        console.error('Error checking MFA/Admin:', error);
      } finally {
        setCheckingMfa(false);
      }
    };

    if (!loading && user) {
      checkMfaAndAdmin();
    } else if (!loading) {
      setCheckingMfa(false);
    }
  }, [user, loading, requireAdmin]);

  if (loading || checkingMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#00313C' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#00313C' }}>
        <div className="text-center space-y-4 p-8 max-w-md">
          <Ban className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acesso Bloqueado</h1>
          <p className="text-gray-300">
            Seu acesso ao monitoramento foi temporariamente bloqueado. 
            Entre em contato com o administrador para mais informações.
          </p>
          <Button 
            variant="outline" 
            onClick={() => signOut()}
            className="mt-4"
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (requireAdmin && isAdmin === false) {
    return <Navigate to="/monitor" replace />;
  }

  if (needsMfaEnroll) {
    return <Navigate to={`/mfa/enroll?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (needsMfaVerify) {
    return <Navigate to={`/mfa/verify?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
