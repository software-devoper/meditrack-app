import React from 'react';
import { 
  Building2, 
  Settings as SettingsIcon, 
  Store
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean;
}

export function WorkspaceSwitcher({ isCollapsed = false }: WorkspaceSwitcherProps) {
  const { user, organization } = useAuthStore();
  const navigate = useNavigate();

  const currentOrgName = organization?.name || user?.organizationName || 'Pharmacy Workspace';
  const plan = (organization?.plan || user?.plan || 'Growth').toUpperCase();

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => navigate('/settings?tab=workspace')}
        title={`${currentOrgName} (${plan}) - Pharmacy Settings`}
        className="w-10 h-10 mx-auto rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/60 flex items-center justify-center text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors shadow-2xs cursor-pointer"
      >
        <Store className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-full p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-750 bg-slate-50/80 dark:bg-slate-850/60 flex items-center justify-between gap-2.5 transition-all">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold">
          <Store className="w-4 h-4" />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {currentOrgName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              {plan} PLAN
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/settings?tab=workspace')}
        title="Pharmacy Profile & Settings"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors shrink-0 cursor-pointer"
      >
        <SettingsIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
