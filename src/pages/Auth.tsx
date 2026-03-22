import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import { Loader2, LogIn, ShieldCheck, KeyRound, ArrowLeft } from "lucide-react";
import { Turnstile } from "@/components/Turnstile";

import evenLogo from "@/assets/even-logo.png";
import evenIcon from "@/assets/even-icon.png";
import rowPattern from "@/assets/row-pattern.png";

const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const emailSchema = z.object({
    email: z.string().email("Email inválido"),
});

const Auth = () => {
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState(false);
    const turnstileKey = useRef(0);

    const { signIn, user, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Fetch Turnstile site key
    useEffect(() => {
        const fetchSiteKey = async () => {
            try {
                const { data, error } = await supabase.functions.invoke("get-turnstile-sitekey");

                if (error) {
                    console.error("Error fetching Turnstile site key:", error);
                    return;
                }

                if (data?.siteKey) {
                    setTurnstileSiteKey(data.siteKey);
                }
            } catch (error) {
                console.error("Error fetching Turnstile site key:", error);
            }
        };

        fetchSiteKey();
    }, []);

    const handleTurnstileVerify = useCallback((token: string) => {
        setTurnstileToken(token);
        setTurnstileError(false);
    }, []);

    const handleTurnstileError = useCallback(() => {
        setTurnstileToken(null);
        setTurnstileError(true);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const resetTurnstile = () => {
        setTurnstileToken(null);
        turnstileKey.current += 1;
    };

    // Check MFA status and redirect
    useEffect(() => {
        const checkMfaAndRedirect = async () => {
            if (!user) return;

            try {
                // First check if MFA is required for this user
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("mfa_enabled")
                    .eq("id", user.id)
                    .single();

                const mfaRequired = profileData?.mfa_enabled ?? false;

                // If MFA is not required, go directly to monitor
                if (!mfaRequired) {
                    navigate("/monitor");
                    return;
                }

                // MFA is required - check if user has a verified factor
                const { data: factorsData } = await supabase.auth.mfa.listFactors();
                const totpFactor = factorsData?.totp?.find(f => f.status === "verified");

                if (!totpFactor) {
                    navigate("/mfa/enroll?redirect=/monitor");
                    return;
                }

                const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (aalData?.currentLevel !== "aal2") {
                    navigate("/mfa/verify?redirect=/monitor");
                } else {
                    navigate("/monitor");
                }
            } catch (error) {
                console.error("Error checking MFA:", error);
                navigate("/monitor");
            }
        };

        if (user && !loading) {
            checkMfaAndRedirect();
        }
    }, [user, loading, navigate]);

    const validateForm = () => {
        if (isForgotPassword) {
            const result = emailSchema.safeParse({ email });

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

    const verifyTurnstile = async (token: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase.functions.invoke("verify-turnstile", {
                body: { token }
            });

            if (error) {
                console.error("Turnstile verification error:", error);
                return false;
            }

            return data?.success === true;
        } catch (error) {
            console.error("Turnstile verification error:", error);
            return false;
        }
    };

    const handleForgotPassword = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: error.message,
                });
            } else {
                toast({
                    title: "Email enviado!",
                    description: "Verifique sua caixa de entrada para redefinir sua senha.",
                });
                setIsForgotPassword(false);
                setEmail("");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isForgotPassword) {
            await handleForgotPassword();
            return;
        }

        if (!validateForm()) return;

        const isDev = window.location.hostname.includes('lovable') || window.location.hostname === 'localhost';

        // Verify Turnstile token (skip in development)
        if (!isDev) {
            if (!turnstileToken) {
                toast({
                    variant: "destructive",
                    title: "Verificação necessária",
                    description: "Por favor, complete a verificação de segurança.",
                });
                return;
            }

            setIsSubmitting(true);

            const isValid = await verifyTurnstile(turnstileToken);

            if (!isValid) {
                toast({
                    variant: "destructive",
                    title: "Verificação falhou",
                    description: "A verificação de segurança falhou. Por favor, tente novamente.",
                });
                resetTurnstile();
                setIsSubmitting(false);
                return;
            }
        } else {
            setIsSubmitting(true);
        }

        try {
            const { error } = await signIn(email, password);

            if (error) {
                resetTurnstile();

                if (error.message.includes("Invalid login credentials")) {
                    toast({
                        variant: "destructive",
                        title: "Erro de login",
                        description: "Email ou senha incorretos.",
                    });
                } else {
                    toast({
                        variant: "destructive",
                        title: "Erro de login",
                        description: error.message,
                    });
                }
            } else {
                toast({
                    title: "Login realizado!",
                    description: "Verificando autenticação...",
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#FFB81C" }} />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{isForgotPassword ? "Recuperar Senha" : "Login"} | Monitor de Vendas - Even Tecnologia</title>
                <meta name="description" content="Acesse o monitor de vendas em tempo real" />
            </Helmet>

            <div
                className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
                style={{ backgroundColor: "#00313C" }}
            >
                {/* Row pattern background */}
                <div
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{
                        backgroundImage: `url(${rowPattern})`,
                        backgroundRepeat: "repeat",
                        backgroundSize: "auto"
                    }}
                />

                <div className="w-full max-w-md relative z-10">
                    {/* Card with Even branding */}
                    <div
                        className="rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700"
                        style={{ backgroundColor: "#FFB81C" }}
                    >
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            <img src={evenLogo} alt="Even Tecnologia" className="h-12" />
                        </div>

                        {/* Title */}
                        <h1
                            className="text-2xl font-bold text-center mb-1 font-mono"
                            style={{ color: "#00313C" }}
                        >
                            {isForgotPassword ? "Recuperar Senha" : "Monitor de Vendas"}
                        </h1>
                        <p
                            className="text-center mb-6 text-sm"
                            style={{ color: "#00313C", opacity: 0.7 }}
                        >
                            {isForgotPassword
                                ? "Digite seu email para receber o link de recuperação"
                                : "Entre com suas credenciais"}
                        </p>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className="font-medium"
                                    style={{ color: "#00313C" }}
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
                                        backgroundColor: "white",
                                        borderColor: "#00313C",
                                        color: "#00313C"
                                    }}
                                    disabled={isSubmitting}
                                />

                                {errors.email && (
                                    <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{errors.email}</p>
                                )}
                            </div>

                            {!isForgotPassword && (
                                <>
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="password"
                                            className="font-medium"
                                            style={{ color: "#00313C" }}
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
                                                backgroundColor: "white",
                                                borderColor: "#00313C",
                                                color: "#00313C"
                                            }}
                                            disabled={isSubmitting}
                                        />

                                        {errors.password && (
                                            <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{errors.password}</p>
                                        )}
                                    </div>

                                    {/* Turnstile verification - hidden in development */}
                                    {turnstileSiteKey && !(window.location.hostname.includes('lovable') || window.location.hostname === 'localhost') && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShieldCheck className="h-4 w-4" style={{ color: "#00313C" }} />
                                                <span className="text-sm font-medium" style={{ color: "#00313C" }}>
                                                    Verificação de segurança
                                                </span>
                                            </div>
                                            <div
                                                key={turnstileKey.current}
                                                className="rounded-lg overflow-hidden"
                                                style={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                                            >
                                                <Turnstile
                                                    siteKey={turnstileSiteKey}
                                                    onVerify={handleTurnstileVerify}
                                                    onError={handleTurnstileError}
                                                    onExpire={handleTurnstileExpire}
                                                    theme="light"
                                                />
                                            </div>

                                            {turnstileError && (
                                                <p className="text-sm font-medium" style={{ color: "#dc2626" }}>
                                                    Erro na verificação. Recarregue a página e tente novamente.
                                                </p>
                                            )}

                                            {turnstileToken && (
                                                <p className="text-sm flex items-center gap-1" style={{ color: "#16a34a" }}>
                                                    <ShieldCheck className="h-3 w-3" />
                                                    Verificação concluída
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <Button
                                type="submit"
                                className="w-full border-2 font-semibold transition-all hover:scale-[1.02]"
                                style={{
                                    backgroundColor: "#00313C",
                                    borderColor: "#00313C",
                                    color: "#FFB81C"
                                }}
                                disabled={isSubmitting || (!isForgotPassword && turnstileSiteKey && !turnstileToken)}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : isForgotPassword ? (
                                    <KeyRound className="h-4 w-4 mr-2" />
                                ) : (
                                    <LogIn className="h-4 w-4 mr-2" />
                                )}
                                {isForgotPassword ? "Enviar link" : "Entrar"}
                            </Button>
                        </form>

                        {/* Forgot Password / Back to Login */}
                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPassword(!isForgotPassword);
                                    setErrors({});
                                    setPassword("");
                                    resetTurnstile();
                                }}
                                className="text-sm font-medium underline hover:no-underline flex items-center justify-center gap-1 mx-auto"
                                style={{ color: "#00313C" }}
                            >
                                {isForgotPassword ? (
                                    <>
                                        <ArrowLeft className="h-3 w-3" />
                                        Voltar ao login
                                    </>
                                ) : (
                                    "Esqueci minha senha"
                                )}
                            </button>
                        </div>

                        {/* Info */}
                        <div className="mt-4 text-center">
                            <p
                                className="text-xs"
                                style={{ color: "#00313C", opacity: 0.6 }}
                            >
                                {isForgotPassword
                                    ? "Um email será enviado com instruções para redefinir sua senha."
                                    : "Não possui acesso? Entre em contato com a Even Tecnologia."}
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
