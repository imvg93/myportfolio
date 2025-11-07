"use client";

import React from "react";
import { X } from "lucide-react";

export function MobileNotice() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      if (typeof window === "undefined") return false;
      if (window.localStorage.getItem("mobile-notice-dismissed") === "true") {
        return false;
      }
      const width = window.innerWidth;
      const ua = navigator.userAgent || "";
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|BlackBerry/i.test(ua);
      return isMobileUA || width < 768;
    };

    if (checkMobile()) {
      setShow(true);
    }

    const handleResize = () => {
      setShow(checkMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-6 z-[200] sm:hidden">
      <div className="rounded-2xl bg-black text-white shadow-2xl px-4 py-3 flex items-start gap-3 border border-white/10">
        <div className="flex-1 text-sm leading-relaxed">
          <p className="font-semibold text-white">Best viewed on desktop</p>
          <p className="text-white/80 mt-1">
            For the full interactive experience, please open this portfolio on your PC or laptop.
          </p>
        </div>
        <button
          className="mt-1 rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.localStorage.setItem("mobile-notice-dismissed", "true");
            }
            setShow(false);
          }}
          aria-label="Dismiss mobile notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


