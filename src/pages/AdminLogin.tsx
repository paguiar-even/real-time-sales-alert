import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, Shield, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

import evenLogo from "@/assets/even-logo.png";

const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const AdminLogin = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    useEffect(() => {
        const checkAdminAndMfa = async () => {
            if (!user) return;

            // Check if user is admin
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .eq("role", "admin")
                .maybeSingle();

            if (!roleData) {
                toast({
                    title: "Acesso negado",
                    description: "Você não tem permissão de administrador.",
                    variant: "destructive",
                });
                await supabase.auth.signOut();
                return;
            }

            // Check MFA status
            const { data: factorsData } = await supabase.auth.mfa.listFactors();
            const totpFactor = factorsData?.totp?.find(f => f.status === "verified");

            if (!totpFactor) {
                // Need to enroll MFA
                navigate("/mfa/enroll?redirect=/admin");
            } else {
                // Check if MFA is verified for this session
                const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (aalData?.currentLevel !== "aal2") {
                    navigate("/mfa/verify?redirect=/admin");
                } else {
                    navigate("/admin");
                }
            }
        };

        if (!authLoading && user) {
            checkAdminAndMfa();
        }
    }, [user, authLoading, navigate]);

    const validateForm = (): boolean => {
        setErrors({});

        const result = loginSchema.safeParse({ email, password });

        if (!result.success) {
            const fieldErrors: { email?: string; password?: string } = {};

            result.error.errors.forEach((err) => {
                if (err.path[0] === "email") {
                    fieldErrors.email = err.message;
                }

                if (err.path[0] === "password") {
                    fieldErrors.password = err.message;
                }
            });
            setErrors(fieldErrors);
            return false;
        }

        return true;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            toast({
                title: "Erro no login",
                description: error.message,
                variant: "destructive",
            });
            setLoading(false);
        }
        // Navigation will be handled by the useEffect above
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#00313C" }}>
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#00313C" }}>
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <img src={evenLogo} alt="Even" className="h-12" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
                    </div>
                    <CardDescription>
                        Acesso restrito a administradores Even
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@even7.com.br"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                                }}
                                disabled={loading}
                                className={errors.email ? "border-destructive" : ""}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                                }}
                                disabled={loading}
                                className={errors.password ? "border-destructive" : ""}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Lock className="h-4 w-4 mr-2" />
                            )}
                            Entrar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminLogin;
