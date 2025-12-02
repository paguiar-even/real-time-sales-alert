import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    email_domains: string[];
    is_active: boolean;
}

export const useTenant = () => {
    const { user } = useAuth();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        const fetchTenant = async () => {
            if (!user?.email) {
                setTenant(null);
                setLoading(false);
                return;
            }

            const emailDomain = user.email.split("@")[1];

            // First check direct assignment in user_tenants
            const { data: directAssignment } = await supabase
                .from("user_tenants")
                .select("tenant_id, is_blocked")
                .eq("user_id", user.id)
                .maybeSingle();

            if (directAssignment) {
                // Check if user is blocked
                if (directAssignment.is_blocked) {
                    setIsBlocked(true);
                    setTenant(null);
                    setLoading(false);
                    return;
                }

                if (directAssignment.tenant_id) {
                    const { data: tenantData } = await supabase
                        .from("tenants")
                        .select("*")
                        .eq("id", directAssignment.tenant_id)
                        .eq("is_active", true) // Only allow access to active tenants
                        .maybeSingle();

                    if (tenantData) {
                        setTenant(tenantData as Tenant);
                        setLoading(false);
                        return;
                    } else {
                        // Tenant exists but is inactive
                        setTenant(null);
                        setLoading(false);
                        return;
                    }
                }
            }

            // Then check by email domain (only for active tenants)
            const { data: tenants } = await supabase
                .from("tenants")
                .select("*")
                .eq("is_active", true);

            if (tenants) {
                const matchedTenant = tenants.find((t: any) =>
                    t.email_domains?.includes(emailDomain)
                );

                if (matchedTenant) {
                    setTenant(matchedTenant as Tenant);
                }
            }

            setLoading(false);
        };

        fetchTenant();
    }, [user]);

    return { tenant, loading, isBlocked };
};
