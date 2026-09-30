import React, { useEffect } from "react";
import { 
  AlertTriangle, 
  Trash2, 
  LogOut, 
  Info, 
  CheckCircle2, 
  ShieldAlert, 
  X, 
  Loader2 
} from "lucide-react";
import { Button } from "./button";

export type AlertVariant = "danger" | "warning" | "info" | "success" | "logout";

export interface PremiumAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message?: string;
  description?: string;
  problem?: string;
  detail?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertVariant;
  isLoading?: boolean;
  eyebrow?: string;
  singleButton?: boolean;
}

export const PremiumAlertDialog: React.FC<PremiumAlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  problem,
  detail,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
  eyebrow,
  singleButton = false,
}) => {
  // Close on Escape key and confirm on Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && !isLoading) {
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (onConfirm) {
            onConfirm();
          } else {
            onClose();
          }
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown, true);
    }
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, isLoading, onClose, onConfirm]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />,
          iconBg: "bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 shadow-lg shadow-red-500/10",
          glow: "bg-red-500/10 dark:bg-red-500/15",
          confirmBtn: "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-[0.98]",
          badgeBg: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900/50",
          defaultEyebrow: "SECURITY ACTION",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          iconBg: "bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 shadow-lg shadow-amber-500/10",
          glow: "bg-amber-500/10 dark:bg-amber-500/15",
          confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 active:scale-[0.98]",
          badgeBg: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
          defaultEyebrow: "CONFIRMATION REQUIRED",
        };
      case "logout":
        return {
          icon: <LogOut className="w-6 h-6 text-indigo-600 dark:text-indigo-400 ml-0.5" />,
          iconBg: "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 shadow-lg shadow-indigo-500/10",
          glow: "bg-indigo-500/10 dark:bg-indigo-500/15",
          confirmBtn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98]",
          badgeBg: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50",
          defaultEyebrow: "SESSION LOGOUT",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
          iconBg: "bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 shadow-lg shadow-emerald-500/10",
          glow: "bg-emerald-500/10 dark:bg-emerald-500/15",
          confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]",
          badgeBg: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
          defaultEyebrow: "SUCCESS",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
          iconBg: "bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 shadow-lg shadow-blue-500/10",
          glow: "bg-blue-500/10 dark:bg-blue-500/15",
          confirmBtn: "bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 active:scale-[0.98]",
          badgeBg: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
          defaultEyebrow: "SYSTEM NOTICE",
        };
    }
  };

  const style = getVariantStyles();
  const textContent = message || description;

  return (
    <div 
      id="premium-alert-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-alert-title"
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-950/20 overflow-hidden transform animate-in zoom-in-95 duration-200"
      >
        {/* Ambient Top Glow */}
        <div className={`absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-28 rounded-full blur-3xl pointer-events-none ${style.glow}`} />

        {/* Close Icon Button */}
        {!isLoading && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-6 sm:p-7 space-y-4">
          {/* Header with Icon and Badge */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${style.iconBg}`}>
              {style.icon}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 border ${style.badgeBg}`}>
                {eyebrow || style.defaultEyebrow}
              </span>
              <h3 
                id="premium-alert-title"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug"
              >
                {title}
              </h3>
            </div>
          </div>

          {/* Body Content */}
          {textContent && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
              {textContent}
            </p>
          )}

          {/* Specific Problem Highlight for Clarity */}
          {problem && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-0.5">Identified Problem</div>
                  <div className="text-xs font-semibold text-red-900 dark:text-red-200 leading-tight">
                    {problem}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional Detail highlight */}
          {detail && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-200 overflow-x-auto">
              {detail}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            {!singleButton && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="h-10 px-4 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                {cancelText}
              </Button>
            )}

            <Button
              type="button"
              onClick={async () => {
                if (onConfirm) {
                  await onConfirm();
                } else {
                  onClose();
                }
              }}
              disabled={isLoading}
              className={`h-10 px-5 rounded-xl font-semibold transition-all duration-150 ${style.confirmBtn}`}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </span>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
