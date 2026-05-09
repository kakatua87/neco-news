"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(onesignal: any) => void>;
  }
}

export default function PushSubscribeButton() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check localStorage preference
    const saved = localStorage.getItem("push_subscribed");
    if (saved === "true") setSubscribed(true);

    // Wait for OneSignal to be ready
    const checkReady = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).OneSignal) {
        setReady(true);
        clearInterval(checkReady);

        // Sync real subscription state
        try {
          const isSubscribed = (window as any).OneSignal?.User?.PushSubscription?.optedIn;
          if (typeof isSubscribed === "boolean") {
            setSubscribed(isSubscribed);
            localStorage.setItem("push_subscribed", String(isSubscribed));
          }
        } catch (_) {}
      }
    }, 500);

    return () => clearInterval(checkReady);
  }, []);

  const handleClick = async () => {
    if (!ready || loading) return;
    setLoading(true);
    try {
      if (subscribed) {
        await (window as any).OneSignal?.User?.PushSubscription?.optOut();
        setSubscribed(false);
        localStorage.setItem("push_subscribed", "false");
      } else {
        await (window as any).OneSignal?.User?.PushSubscription?.optIn();
        setSubscribed(true);
        localStorage.setItem("push_subscribed", "true");
      }
    } catch (e) {
      console.error("Push subscription error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        subscribed
          ? "bg-accent/10 text-accent border border-accent/30 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
          : "bg-accent text-white hover:bg-accent-dark shadow-sm"
      } disabled:opacity-50`}
      title={subscribed ? "Desactivar notificaciones" : "Activar notificaciones push"}
    >
      {loading ? (
        <span className="animate-spin">⏳</span>
      ) : subscribed ? (
        <span>🔕</span>
      ) : (
        <span>🔔</span>
      )}
      <span>
        {loading ? "Procesando..." : subscribed ? "Alertas activas" : "Activar alertas de noticias"}
      </span>
    </button>
  );
}
