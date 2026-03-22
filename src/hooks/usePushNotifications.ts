import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (e) {
      console.error('Erro ao verificar subscription:', e);
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      console.warn('Push não suportado ou VAPID_PUBLIC_KEY não configurada');
      return false;
    }

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setIsLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      await supabase.from('push_subscriptions' as any).upsert({
        user_id: user?.id,
        endpoint: subJson.endpoint,
        p256dh: (subJson.keys as any)?.p256dh,
        auth: (subJson.keys as any)?.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' });

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('Erro ao ativar push:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from('push_subscriptions' as any).delete().eq('endpoint', endpoint);
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error('Erro ao desativar push:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe };
};
