import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, KeyRound } from 'lucide-react';
import evenLogo from '@/assets/even-logo.png';

const MfaVerify = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/monitor';
  const { user, loading: authLoading } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingFactors, setCheckingFactors] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      checkMfaFactors();
    }
  }, [user, authLoading, navigate]);

  const checkMfaFactors = async () => {
    setCheckingFactors(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;

      const totpFactor = data?.totp?.find(f => f.status === 'verified');
      
      if (!totpFactor) {
        // No MFA enrolled, redirect to enroll
        navigate(`/mfa/enroll?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      setFactorId(totpFactor.id);
    } catch (error: any) {
      console.error('Error checking MFA factors:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar o status do 2FA.',
        variant: 'destructive',
      });
    } finally {
      setCheckingFactors(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verifyCode || verifyCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite o código de 6 dígitos do seu app.',
        variant: 'destructive',
      });
      return;
    }

    if (!factorId) {
      toast({
        title: 'Erro',
        description: 'Fator de autenticação não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: 'Verificação concluída',
        description: 'Acesso autorizado.',
      });

      navigate(redirect);
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      toast({
        title: 'Código incorreto',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
      setVerifyCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (authLoading || checkingFactors) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#00313C' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#00313C' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={evenLogo} alt="Even" className="h-10" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Verificação em 2 etapas</CardTitle>
          </div>
          <CardDescription>
            Digite o código do Google Authenticator para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificação</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || verifyCode.length !== 6}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Verificar
            </Button>
          </form>

          <div className="text-center">
            <Button variant="link" onClick={handleSignOut} className="text-muted-foreground">
              Usar outra conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MfaVerify;
