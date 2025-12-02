import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import { Loader2, KeyRound, CheckCircle, XCircle } from "lucide-react";

import evenLogo from "@/assets/even-logo.png";
import evenIcon from "@/assets/even-icon.png";
import rowPattern from "@/assets/row-pattern.png";

const passwordSchema = z.object({
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "A confirmação deve ter pelo menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

    const navigate = useNavigate();
    const { toast } = useToast();

    // Check if user has a valid recovery session
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            // Check if this is a recovery session (user clicked the reset link)
            if (session) {
                setIsValidSession(true);
            } else {
                // Listen for auth state changes (when user arrives via recovery link)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (event === "PASSWORD_RECOVERY") {
                        setIsValidSession(true);
                    } else if (event === "SIGNED_IN" && session) {
                        setIsValidSession(true);
                    }
                });

                // Give it a moment to process the URL hash
                setTimeout(() => {
                    if (isValidSession === null) {
                        setIsValidSession(false);
                    }
                }, 2000);

                return () => subscription.unsubscribe();
            }
        };

        checkSession();
    }, []);

    const validateForm = () => {
        const result = passwordSchema.safeParse({ password, confirmPassword });

        if (!result.success) {
            const fieldErrors: typeof errors = {};

            result.error.errors.forEach((err) => {
                const field = err.path[0] as keyof typeof errors;
                fieldErrors[field] = err.message;
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
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: error.message,
                });
            } else {
                setIsSuccess(true);
                toast({
                    title: "Senha alterada!",
                    description: "Sua senha foi redefinida com sucesso.",
                });

                // Sign out and redirect to login after a short delay
                setTimeout(async () => {
                    await supabase.auth.signOut();
                    navigate("/auth");
                }, 3000);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state while checking session
    if (isValidSession === null) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#00313C" }}
            >
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: "#FFB81C" }} />
                    <p className="text-white/70">Verificando link de recuperação...</p>
                </div>
            </div>
        );
    }

    // Invalid or expired link
    if (isValidSession === false) {
        return (
            <>
                <Helmet>
                    <title>Link Inválido | Monitor de Vendas - Even Tecnologia</title>
                </Helmet>

                <div
                    className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
                    style={{ backgroundColor: "#00313C" }}
                >
                    <div
                        className="absolute inset-0 opacity-5 pointer-events-none"
                        style={{
                            backgroundImage: `url(${rowPattern})`,
                            backgroundRepeat: "repeat",
                            backgroundSize: "auto"
                        }}
                    />

                    <div className="w-full max-w-md relative z-10">
                        <div
                            className="rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700"
                            style={{ backgroundColor: "#FFB81C" }}
                        >
                            <div className="flex justify-center mb-6">
                                <img src={evenLogo} alt="Even Tecnologia" className="h-12" />
                            </div>

                            <div className="text-center">
                                <XCircle
                                    className="h-16 w-16 mx-auto mb-4"
                                    style={{ color: "#dc2626" }}
                                />
                                <h1
                                    className="text-2xl font-bold mb-2 font-mono"
                                    style={{ color: "#00313C" }}
                                >
                                    Link Inválido
                                </h1>
                                <p
                                    className="text-sm mb-6"
                                    style={{ color: "#00313C", opacity: 0.7 }}
                                >
                                    Este link de recuperação expirou ou é inválido.
                                    Solicite um novo link na página de login.
                                </p>

                                <Button
                                    onClick={() => navigate("/auth")}
                                    className="w-full border-2 font-semibold transition-all hover:scale-[1.02]"
                                    style={{
                                        backgroundColor: "#00313C",
                                        borderColor: "#00313C",
                                        color: "#FFB81C"
                                    }}
                                >
                                    Voltar ao Login
                                </Button>
                            </div>
                        </div>

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
    }

    // Success state
    if (isSuccess) {
        return (
            <>
                <Helmet>
                    <title>Senha Alterada | Monitor de Vendas - Even Tecnologia</title>
                </Helmet>

                <div
                    className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
                    style={{ backgroundColor: "#00313C" }}
                >
                    <div
                        className="absolute inset-0 opacity-5 pointer-events-none"
                        style={{
                            backgroundImage: `url(${rowPattern})`,
                            backgroundRepeat: "repeat",
                            backgroundSize: "auto"
                        }}
                    />

                    <div className="w-full max-w-md relative z-10">
                        <div
                            className="rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700"
                            style={{ backgroundColor: "#FFB81C" }}
                        >
                            <div className="flex justify-center mb-6">
                                <img src={evenLogo} alt="Even Tecnologia" className="h-12" />
                            </div>

                            <div className="text-center">
                                <CheckCircle
                                    className="h-16 w-16 mx-auto mb-4"
                                    style={{ color: "#16a34a" }}
                                />
                                <h1
                                    className="text-2xl font-bold mb-2 font-mono"
                                    style={{ color: "#00313C" }}
                                >
                                    Senha Alterada!
                                </h1>
                                <p
                                    className="text-sm mb-6"
                                    style={{ color: "#00313C", opacity: 0.7 }}
                                >
                                    Sua senha foi redefinida com sucesso.
                                    Você será redirecionado para o login em instantes.
                                </p>

                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#00313C" }} />
                                    <span className="text-sm" style={{ color: "#00313C" }}>Redirecionando...</span>
                                </div>
                            </div>
                        </div>

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
    }

    return (
        <>
            <Helmet>
                <title>Redefinir Senha | Monitor de Vendas - Even Tecnologia</title>
                <meta name="description" content="Redefina sua senha de acesso" />
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
                            Redefinir Senha
                        </h1>
                        <p
                            className="text-center mb-6 text-sm"
                            style={{ color: "#00313C", opacity: 0.7 }}
                        >
                            Digite sua nova senha
                        </p>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="password"
                                    className="font-medium"
                                    style={{ color: "#00313C" }}
                                >
                                    Nova senha
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

                            <div className="space-y-2">
                                <Label
                                    htmlFor="confirmPassword"
                                    className="font-medium"
                                    style={{ color: "#00313C" }}
                                >
                                    Confirmar nova senha
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="border-2 focus:ring-2 focus:ring-offset-2"
                                    style={{
                                        backgroundColor: "white",
                                        borderColor: "#00313C",
                                        color: "#00313C"
                                    }}
                                    disabled={isSubmitting}
                                />

                                {errors.confirmPassword && (
                                    <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{errors.confirmPassword}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full border-2 font-semibold transition-all hover:scale-[1.02]"
                                style={{
                                    backgroundColor: "#00313C",
                                    borderColor: "#00313C",
                                    color: "#FFB81C"
                                }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <KeyRound className="h-4 w-4 mr-2" />
                                )}
                                Redefinir senha
                            </Button>
                        </form>

                        {/* Info */}
                        <div className="mt-6 text-center">
                            <p
                                className="text-xs"
                                style={{ color: "#00313C", opacity: 0.6 }}
                            >
                                A senha deve ter pelo menos 6 caracteres.
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

export default ResetPassword;
