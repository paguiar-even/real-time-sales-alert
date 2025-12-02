import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";

const STAFF_TOKEN_KEY = "even_staff_token";
const STAFF_TOKEN_VALIDATED_KEY = "even_staff_token_validated";

interface UseStaffTokenReturn {
    token: string | null;
    isValidated: boolean;
    clearToken: () => void;
    setValidated: () => void;
}

/**
 * Hook to securely manage staff tokens.
 * - Reads token from URL on first visit
 * - Stores in sessionStorage after validation
 * - Removes token from URL to prevent exposure in logs/history
 */
export function useStaffToken(): UseStaffTokenReturn {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [token, setToken] = useState<string | null>(() => {
        // First check URL for token
        const urlToken = new URLSearchParams(window.location.search).get("token");

        if (urlToken) {
            return urlToken;
        }

        // Fallback to sessionStorage
        return sessionStorage.getItem(STAFF_TOKEN_KEY);
    });

    const [isValidated, setIsValidated] = useState(() => {
        return sessionStorage.getItem(STAFF_TOKEN_VALIDATED_KEY) === "true";
    });

    // Store token and clean URL after validation
    const setValidated = useCallback(() => {
        if (token) {
            // Store token in sessionStorage
            sessionStorage.setItem(STAFF_TOKEN_KEY, token);
            sessionStorage.setItem(STAFF_TOKEN_VALIDATED_KEY, "true");
            setIsValidated(true);

            // Remove token from URL to prevent exposure
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete("token");

            const newSearch = newSearchParams.toString();
            const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ""}`;

            // Use replace to avoid adding to history
            navigate(newUrl, { replace: true });
        }
    }, [token, searchParams, location.pathname, navigate]);

    const clearToken = useCallback(() => {
        sessionStorage.removeItem(STAFF_TOKEN_KEY);
        sessionStorage.removeItem(STAFF_TOKEN_VALIDATED_KEY);
        setToken(null);
        setIsValidated(false);
    }, []);

    // Sync token from URL if it changes
    useEffect(() => {
        const urlToken = searchParams.get("token");

        if (urlToken && urlToken !== token) {
            setToken(urlToken);
            setIsValidated(false);
            sessionStorage.removeItem(STAFF_TOKEN_VALIDATED_KEY);
        }
    }, [searchParams, token]);

    return { token, isValidated, clearToken, setValidated };
}
