import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
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

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/monitor');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
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
            description: 'Redirecionando...',
          });
          navigate('/monitor');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              variant: 'destructive',
              title: 'Erro no cadastro',
              description: 'Este email já está cadastrado. Tente fazer login.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Erro no cadastro',
              description: error.message,
            });
          }
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Redirecionando...',
          });
          navigate('/monitor');
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
        <title>Login | Monitor de Vendas - Even Tecnologia</title>
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
              className="text-center mb-8 text-sm"
              style={{ color: '#00313C', opacity: 0.7 }}
            >
              {isLogin ? 'Entre para acessar o monitor' : 'Crie sua conta para acessar'}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                ) : isLogin ? (
                  <LogIn className="h-4 w-4 mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            {/* Toggle */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-sm font-medium transition-colors hover:underline"
                style={{ color: '#00313C', opacity: 0.8 }}
                disabled={isSubmitting}
              >
                {isLogin ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center animate-in fade-in duration-1000 delay-300">
            <img 
              src={evenIcon} 
              alt="Even Icon" 
              className="w-10 h-10 mx-auto mb-3 object-contain" 
              style={{ animation: 'spin 8s linear infinite' }}
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
