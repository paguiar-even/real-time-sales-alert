import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, Smartphone, CheckCircle2 } from 'lucide-react';
import evenLogo from '@/assets/even-logo.png';

const MfaEnroll = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/monitor';
  const { user, loading: authLoading } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      startEnrollment();
    }
  }, [user, authLoading, navigate]);

  const startEnrollment = async () => {
    setEnrolling(true);
    try {
      // First, check for existing unverified factors and remove them
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      
      if (factorsData?.totp) {
        for (const factor of factorsData.totp) {
          if (factor.status !== 'verified') {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }
      }

      // Now enroll a new factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Google Authenticator',
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (error: any) {
      console.error('Error enrolling MFA:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a configuração do 2FA.',
        variant: 'destructive',
      });
    } finally {
      setEnrolling(false);
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

      // Update profile to mark MFA as enabled
      await supabase
        .from('profiles')
        .update({ mfa_enabled: true })
        .eq('id', user?.id);

      toast({
        title: 'Sucesso!',
        description: 'Autenticação em duas etapas configurada com sucesso.',
      });

      navigate(redirect);
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      toast({
        title: 'Código incorreto',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || enrolling) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#00313C' }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
          <p className="text-white/70">Preparando configuração de 2FA...</p>
        </div>
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
            <CardTitle className="text-xl">Configurar 2FA</CardTitle>
          </div>
          <CardDescription>
            Configure a autenticação em duas etapas para proteger sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: QR Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
              Escaneie o QR Code com o Google Authenticator
            </div>
            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Ou insira o código manualmente:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded break-all">{secret}</code>
            </div>
          </div>

          {/* Step 2: Verify */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
              Digite o código do app
            </div>
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || verifyCode.length !== 6}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Verificar e ativar
            </Button>
          </form>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Baixe o Google Authenticator na <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="underline">Play Store</a> ou <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener noreferrer" className="underline">App Store</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MfaEnroll;
