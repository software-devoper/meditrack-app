import React, { useState } from 'react';
import { DoctorPosture, DoctorState, ModelInspectionReport } from './DoctorBoyTypes';

interface DoctorBoyDebugPanelProps {
  report: ModelInspectionReport | null;
  currentState: DoctorState;
  currentActionName: string;
  currentPosture: DoctorPosture;
  mixerTime: number;
  onTriggerState: (state: DoctorState) => void;
  onTriggerPosture: (posture: DoctorPosture) => void;
}

export const DoctorBoyDebugPanel: React.FC<DoctorBoyDebugPanelProps> = ({
  report,
  currentState,
  currentActionName,
  currentPosture,
  mixerTime,
  onTriggerState,
  onTriggerPosture,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'states' | 'postures' | 'model'>('states');

  return (
    <div className="fixed bottom-4 left-4 z-50 text-xs font-sans select-none">
      {/* Toggle button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 text-white hover:bg-slate-800 shadow-xl backdrop-blur border border-slate-700/60 transition-all hover:scale-105 active:scale-95"
          title="Open Doctor Boy 3D Behavior Diagnostics"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wide">Doctor 3D System</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
            {currentState}
          </span>
        </button>
      )}

      {/* Expanded Diagnostics Card */}
      {isOpen && (
        <div className="w-80 max-h-[85vh] flex flex-col rounded-2xl bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md border border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">🩺</span>
              <div>
                <h4 className="font-bold text-xs text-white leading-tight">Doctor Boy 3D Controller</h4>
                <p className="text-[10px] text-slate-400">Biomechanics & Behavior Engine</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Quick Status Bar */}
          <div className="grid grid-cols-2 gap-1.5 p-3 bg-slate-900/40 border-b border-slate-800/80 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Current State</div>
              <div className="font-bold text-sky-400 truncate">{currentState}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Action Clip</div>
              <div className="font-bold text-emerald-400 truncate">{currentActionName || 'idle'}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Posture</div>
              <div className="font-bold text-amber-400 truncate">{currentPosture}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Mixer Time</div>
              <div className="font-bold text-purple-400">{mixerTime.toFixed(1)}s</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 px-2 pt-1 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('states')}
              className={`flex-1 py-1.5 font-medium border-b-2 transition-colors ${
                activeTab === 'states'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              States
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('postures')}
              className={`flex-1 py-1.5 font-medium border-b-2 transition-colors ${
                activeTab === 'postures'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Postures
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('model')}
              className={`flex-1 py-1.5 font-medium border-b-2 transition-colors ${
                activeTab === 'model'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Model Info
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-3 overflow-y-auto max-h-64 space-y-2 text-xs">
            {activeTab === 'states' && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Trigger Animation State:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['IDLE', '🧘 Idle'],
                      ['WAVING', '👋 Wave'],
                      ['TALKING', '🗣️ Talk'],
                      ['POINTING', '👉 Point'],
                      ['THINKING', '🤔 Think'],
                      ['HOLD_WRIST', '⌚ Hold Wrist'],
                      ['WELCOME', '👐 Welcome'],
                      ['GREETING', '🤝 Greeting'],
                      ['WALKING', '🚶 Walk'],
                      ['GOODBYE', '🙋 Goodbye'],
                      ['REACTION', '⚡ Reaction'],
                    ] as const
                  ).map(([st, label]) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onTriggerState(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-all ${
                        currentState === st
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'postures' && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Procedural Posture & Weight Shift:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['NEUTRAL', 'Neutral'],
                      ['RELAXED', 'Relaxed'],
                      ['PROFESSIONAL', 'Professional'],
                      ['LISTENING', 'Listening'],
                      ['THINKING', 'Thinking'],
                      ['EXPLAINING', 'Explaining'],
                      ['CURIOUS', 'Curious'],
                      ['HAPPY', 'Happy'],
                      ['CONCERNED', 'Concerned'],
                    ] as const
                  ).map(([pos, label]) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onTriggerPosture(pos)}
                      className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-all ${
                        currentPosture === pos
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'model' && report && (
              <div className="space-y-2 font-mono text-[10px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">Model:</div>
                  <div className="text-white font-bold">{report.modelName}</div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-slate-400">Detected Animations ({report.animations.length}):</div>
                  {report.animations.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300">
                      <span>• {a.name}</span>
                      <span className="text-slate-500">
                        {a.duration.toFixed(1)}s ({a.tracksCount} trk)
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                  <div className="text-slate-400">Skeleton:</div>
                  <div className="text-emerald-400 font-bold">
                    ✓ Armature ({report.skeleton.totalBones} bones)
                  </div>
                  <div className="text-slate-400">Head / Neck tracking: Active</div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-0.5">
                  <div className="text-slate-400">Facial Controls:</div>
                  <div className="text-slate-300">
                    Morphs: {report.facialMorphs.available ? 'Available' : 'Unavailable (GLB mesh has no morphs)'}
                  </div>
                  <div className="text-slate-300">
                    Eyes: Handled via natural head/neck gaze tracking
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
