import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, X, ChevronUp, ArrowRight } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';

export function UpdateNotificationCard() {
  const { hasUpdate, newVersionInfo, isDismissed, refreshApp, dismissNotification } = useAppUpdate();
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[99999] max-w-sm w-[calc(100vw-2.5rem)] font-sans pointer-events-auto">
      <AnimatePresence mode="wait">
        {!isDismissed && !isMinimized && (
          <motion.div
            key="expanded-card"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white dark:bg-slate-900 border border-primary-500/30 dark:border-primary-500/40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md"
          >
            {/* Top Accent Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 animate-pulse" />

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800/40 flex-shrink-0">
                    <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
                        New Version Ready
                      </h4>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40">
                        Live
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      New updates have been deployed.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissNotification}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/50">
                <p>
                  To apply the latest changes and improvements, please refresh your browser.
                </p>
                {newVersionInfo?.builtAt && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Deployed at: {new Date(newVersionInfo.builtAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={refreshApp}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {(isMinimized || isDismissed) && (
          <motion.div
            key="minimized-pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex justify-end"
          >
            <button
              type="button"
              onClick={refreshApp}
              className="group flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg border border-white/20 transition-all text-xs font-semibold"
              title="Click to refresh and apply update"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>Update Ready • Refresh</span>
              <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
