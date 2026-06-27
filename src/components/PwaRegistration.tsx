"use client";

import { useEffect, useState } from "react";

export default function PwaRegistration() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setShowUpdate(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log("SW registration failed:", error);
        });
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
    setShowUpdate(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
      const { outcome } = await (deferredPrompt as { prompt: () => Promise<{ outcome: string }> }).prompt();
      if (outcome === "accepted") {
        setShowInstall(false);
      }
    }
  };

  if (!showUpdate && !showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80">
      {showUpdate && (
        <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-navy">
          <p className="text-sm font-semibold text-navy">มีเวอร์ชันใหม่</p>
          <p className="mt-1 text-xs text-navy/60">กดอัพเดทเพื่อรับเวอร์ชันล่าสุด</p>
          <button
            onClick={handleUpdate}
            className="mt-3 w-full rounded-lg gradient-navy px-4 py-2 text-xs font-semibold text-white"
          >
            อัพเดทตอนนี้
          </button>
        </div>
      )}
      {showInstall && (
        <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-navy">
          <p className="text-sm font-semibold text-navy">ติดตั้งแอป</p>
          <p className="mt-1 text-xs text-navy/60">เพิ่มลงหน้าจอหลักเพื่อเข้าถึงได้สะดวก</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 rounded-lg gradient-navy px-4 py-2 text-xs font-semibold text-white"
            >
              ติดตั้ง
            </button>
            <button
              onClick={() => setShowInstall(false)}
              className="flex-1 rounded-lg border border-cream-dark px-4 py-2 text-xs font-medium text-navy/70"
            >
              ภายหลัง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
