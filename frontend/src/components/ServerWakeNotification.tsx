import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, X, Server } from 'lucide-react';
import { subscribeServerWake, checkSystemHealth } from '../services/api';
import type { ServerWakeStage } from '../services/api';

export const ServerWakeNotification: React.FC = () => {
  const [stage, setStage] = useState<ServerWakeStage>('idle');
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);
  const [secondsWaking, setSecondsWaking] = useState<number>(0);

  useEffect(() => {
    // 1. Subscribe to long-running request interceptors
    const unsubscribe = subscribeServerWake((newStage, customMsg) => {
      setStage(newStage);
      if (customMsg) setMessage(customMsg);

      if (newStage === 'waking') {
        setVisible(true);
      } else if (newStage === 'ready') {
        // Show success briefly, then auto-fade
        setVisible(true);
        const timer = setTimeout(() => {
          setVisible(false);
          setStage('idle');
        }, 2800);
        return () => clearTimeout(timer);
      } else if (newStage === 'error') {
        setVisible(true);
      }
    });

    // 2. Preemptive warm-up ping on mount if using cloud backend
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    if (apiBase && !apiBase.includes('localhost') && !apiBase.includes('127.0.0.1')) {
      checkSystemHealth().catch(() => {
        // Silently handled by interceptor if cold
      });
    }

    return () => unsubscribe();
  }, []);

  // Timer counter during waking state
  useEffect(() => {
    let interval: any = null;
    if (stage === 'waking' && visible) {
      setSecondsWaking(1);
      interval = setInterval(() => {
        setSecondsWaking((prev) => prev + 1);
      }, 1000);
    } else {
      setSecondsWaking(0);
    }
    return () => clearInterval(interval);
  }, [stage, visible]);

  if (!visible || stage === 'idle') return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs ${
          stage === 'waking'
            ? 'bg-slate-900/95 border-amber-500/40 text-amber-200 shadow-amber-500/10'
            : stage === 'ready'
            ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
            : 'bg-slate-900/95 border-rose-500/40 text-rose-200 shadow-rose-500/10'
        }`}
      >
        <div className="flex items-center gap-3">
          {stage === 'waking' ? (
            <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
          ) : stage === 'ready' ? (
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                {stage === 'waking'
                  ? `Waking up Cloud Web Service (${secondsWaking}s)`
                  : stage === 'ready'
                  ? 'Cloud Web Service Active'
                  : 'Cloud Connection Issue'}
              </span>
              {stage === 'waking' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Render Free Tier (~30s)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
              {stage === 'waking'
                ? 'Render instances sleep when idle. First request takes ~30–45s to boot. Please wait...'
                : stage === 'ready'
                ? 'FastAPI engine is awake and responding.'
                : message || 'Failed to wake backend. Please check network and refresh.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition ml-2 flex-shrink-0"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
