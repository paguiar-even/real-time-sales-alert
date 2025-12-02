import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';
import evenLogo from '@/assets/even-logo.png';
import evenIcon from '@/assets/even-icon.png';
import rowPattern from '@/assets/row-pattern.png';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido').optional().or(z.literal('')),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; phone?: string }>({});
  
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check MFA status and redirect
  useEffect(() => {
    const checkMfaAndRedirect = async () => {
      if (!user) return;

      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');

        if (!totpFactor) {
          navigate('/mfa/enroll?redirect=/monitor');
          return;
        }

        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData?.currentLevel !== 'aal2') {
          navigate('/mfa/verify?redirect=/monitor');
        } else {
          navigate('/monitor');
        }
      } catch (error) {
        console.error('Error checking MFA:', error);
        navigate('/monitor');
      }
    };

    if (user && !loading) {
      checkMfaAndRedirect();
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    if (isSignUp) {
      const result = signupSchema.safeParse({ email, password, fullName, phone });
      if (!result.success) {
        const fieldErrors: typeof errors = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof typeof errors;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    } else {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        const fieldErrors: typeof errors = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof typeof errors;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              variant: 'destructive',
              title: 'Erro no cadastro',
              description: 'Este email já está cadastrado.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Erro no cadastro',
              description: error.message,
            });
          }
        } else {
          // Update profile with phone if provided
          if (phone) {
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (newUser) {
              await supabase
                .from('profiles')
                .update({ phone })
                .eq('id', newUser.id);
            }
          }
          
          toast({
            title: 'Conta criada!',
            description: 'Configure o 2FA para continuar.',
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: 'destructive',
              title: 'Erro de login',
              description: 'Email ou senha incorretos.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Erro de login',
              description: error.message,
            });
          }
        } else {
          toast({
            title: 'Login realizado!',
            description: 'Verificando autenticação...',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#00313C' }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#FFB81C' }} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isSignUp ? 'Cadastro' : 'Login'} | Monitor de Vendas - Even Tecnologia</title>
        <meta name="description" content="Acesse o monitor de vendas em tempo real" />
      </Helmet>

      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
        style={{ backgroundColor: '#00313C' }}
      >
        {/* Row pattern background */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none" 
          style={{
            backgroundImage: `url(${rowPattern})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto'
          }} 
        />

        <div className="w-full max-w-md relative z-10">
          {/* Card with Even branding */}
          <div 
            className="rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ backgroundColor: '#FFB81C' }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src={evenLogo} alt="Even Tecnologia" className="h-12" />
            </div>

            {/* Title */}
            <h1 
              className="text-2xl font-bold text-center mb-1 font-mono"
              style={{ color: '#00313C' }}
            >
              Monitor de Vendas
            </h1>
            <p 
              className="text-center mb-6 text-sm"
              style={{ color: '#00313C', opacity: 0.7 }}
            >
              {isSignUp ? 'Crie sua conta para acessar' : 'Entre com suas credenciais'}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label 
                      htmlFor="fullName" 
                      className="font-medium"
                      style={{ color: '#00313C' }}
                    >
                      Nome completo
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="border-2 focus:ring-2 focus:ring-offset-2"
                      style={{ 
                        backgroundColor: 'white',
                        borderColor: '#00313C',
                        color: '#00313C'
                      }}
                      disabled={isSubmitting}
                    />
                    {errors.fullName && (
                      <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label 
                      htmlFor="phone" 
                      className="font-medium"
                      style={{ color: '#00313C' }}
                    >
                      Telefone (opcional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="border-2 focus:ring-2 focus:ring-offset-2"
                      style={{ 
                        backgroundColor: 'white',
                        borderColor: '#00313C',
                        color: '#00313C'
                      }}
                      disabled={isSubmitting}
                    />
                    {errors.phone && (
                      <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{errors.phone}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="font-medium"
                  style={{ color: '#00313C' }}
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: 'white',
                    borderColor: '#00313C',
                    color: '#00313C'
                  }}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="font-medium"
                  style={{ color: '#00313C' }}
                >
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: 'white',
                    borderColor: '#00313C',
                    color: '#00313C'
                  }}
                  disabled={isSubmitting}
                />
                {errors.password && (
                  <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full border-2 font-semibold transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: '#00313C',
                  borderColor: '#00313C',
                  color: '#FFB81C'
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isSignUp ? (
                  <UserPlus className="h-4 w-4 mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {isSignUp ? 'Criar conta' : 'Entrar'}
              </Button>
            </form>

            {/* Toggle */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                className="text-sm font-medium underline hover:no-underline"
                style={{ color: '#00313C' }}
              >
                {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
              </button>
            </div>

            {/* Info */}
            <div className="mt-4 text-center">
              <p 
                className="text-xs"
                style={{ color: '#00313C', opacity: 0.6 }}
              >
                {isSignUp 
                  ? 'Após o cadastro, você precisará configurar o 2FA.' 
                  : 'Não possui acesso? Entre em contato com a Even Tecnologia.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center animate-in fade-in duration-1000 delay-300">
            <img 
              src={evenIcon} 
              alt="Even Icon" 
              className="w-10 h-10 mx-auto mb-3 object-contain animate-pulse" 
            />
            <p className="text-sm text-white/50">
              Construído com excelência pela{" "}
              <span className="font-semibold text-white/70">Even Tecnologia</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
