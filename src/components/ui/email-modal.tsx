"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmailOption {
  id: number;
  label: string;
  email: string;
  type: "personal" | "official" | "other";
}

const emailOptions: EmailOption[] = [
  {
    id: 1,
    label: "Personal",
    email: "gireeshv03@gmail.com",
    type: "personal",
  },
  {
    id: 2,
    label: "Official",
    email: "girishveeranki3@gmail.com", // Replace with your official email
    type: "official",
  },
  {
    id: 3,
    label: "Work",
    email: "gireeshv@datavalley.ai", // Replace with your work email
    type: "other",
  },
  
];

export function EmailModal({ isOpen, onClose }: EmailModalProps) {
  const [copiedEmail, setCopiedEmail] = React.useState<string | null>(null);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle ESC key press
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  const handleEmailClick = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3 
              }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Contact Me
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Email Options */}
              <div className="p-6 space-y-3">
                {emailOptions.map((option, index) => (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                    }}
                    className="group"
                  >
                    <div
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer",
                        "bg-gradient-to-r from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-700",
                        "border-gray-200 dark:border-neutral-600",
                        "hover:border-red-400 dark:hover:border-red-500",
                        "hover:shadow-lg hover:shadow-red-500/20",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        "transform-gpu"
                      )}
                      onClick={() => handleEmailClick(option.email)}
                    >
                      {/* Hover effect background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {option.label}
                            </span>
                            {option.type === "personal" && (
                              <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                Personal
                              </span>
                            )}
                            {option.type === "official" && (
                              <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                Official
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                            {option.email}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyEmail(option.email);
                          }}
                          className={cn(
                            "ml-4 p-2 rounded-lg transition-all duration-200",
                            "hover:bg-white/80 dark:hover:bg-neutral-600/80",
                            "hover:scale-110 active:scale-95",
                            copiedEmail === option.email && "bg-green-100 dark:bg-green-900/30"
                          )}
                          aria-label="Copy email"
                        >
                          {copiedEmail === option.email ? (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 pt-0">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Click on any email to open your mail client
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

