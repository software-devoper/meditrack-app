import React from 'react';
import { PatientDoctor } from '../../types';
import { Button } from '../../components/ui';
import { Stethoscope, Phone, Mail, MapPin, X, Check } from 'lucide-react';

interface PatientDoctorSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  doctors: PatientDoctor[];
  onSelectDoctor: (doctor: PatientDoctor) => void;
  onSelectNone?: () => void;
}

export function PatientDoctorSelectModal({
  isOpen,
  onClose,
  patientName,
  doctors,
  onSelectDoctor,
  onSelectNone,
}: PatientDoctorSelectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Choose Doctor for {patientName || 'Patient'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This patient is registered with multiple doctors ({doctors.length}). Select one for this bill:
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Doctor List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {doctors.map((doc, idx) => (
            <div
              key={doc.id || idx}
              onClick={() => onSelectDoctor(doc)}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {doc.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Dr. #{idx + 1}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {doc.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary-500" />
                      <span>{doc.phone}</span>
                    </div>
                  )}
                  {doc.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.email}</span>
                    </div>
                  )}
                  {doc.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>{doc.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                className="self-end sm:self-center shrink-0 flex items-center gap-1.5 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDoctor(doc);
                }}
              >
                <Check className="w-3.5 h-3.5" /> Select Doctor
              </Button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
          {onSelectNone ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSelectNone}
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              Skip / Self-Prescribed
            </Button>
          ) : <div />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Cancel
          </Button>
        </div>

      </div>
    </div>
  );
}
