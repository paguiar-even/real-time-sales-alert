import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        turnstile?: {
            render: (container: string | HTMLElement, options: TurnstileOptions) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        onTurnstileLoad?: () => void;
    }
}

interface TurnstileOptions {
    sitekey: string;
    callback?: (token: string) => void;
    "error-callback"?: () => void;
    "expired-callback"?: () => void;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact";
}

interface TurnstileProps {
    siteKey: string;
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    theme?: "light" | "dark" | "auto";
}

const TURNSTILE_SCRIPT_ID = "turnstile-script";

export const Turnstile = ({ siteKey, onVerify, onError, onExpire, theme = "light" }: TurnstileProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load the Turnstile script if not already loaded
        if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
            const script = document.createElement("script");
            script.id = TURNSTILE_SCRIPT_ID;
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
            script.async = true;

            window.onTurnstileLoad = () => {
                setIsLoaded(true);
            };

            document.head.appendChild(script);
        } else if (window.turnstile) {
            setIsLoaded(true);
        }

        return () => {
            // Clean up widget on unmount
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (isLoaded && containerRef.current && window.turnstile && !widgetIdRef.current) {
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: onVerify,
                "error-callback": onError,
                "expired-callback": onExpire,
                theme: theme,
                size: "normal",
            });
        }
    }, [isLoaded, siteKey, onVerify, onError, onExpire, theme]);

    const reset = () => {
        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
        }
    };

    return <div ref={containerRef} className="flex justify-center" />;
};

export const useTurnstileReset = () => {
    const reset = (widgetId: string) => {
        if (window.turnstile) {
            window.turnstile.reset(widgetId);
        }
    };

    return { reset };
};
