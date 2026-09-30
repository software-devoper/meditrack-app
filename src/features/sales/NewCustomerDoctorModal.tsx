import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../components/ui';
import { Stethoscope, Phone, MapPin, X, Check, SkipForward } from 'lucide-react';

interface NewCustomerDoctorModalProps {
  isOpen: boolean;
  customerName: string;
  initialDoctorName?: string;
  initialDoctorPhone?: string;
  initialDoctorAddress?: string;
  onSave: (docData: { name: string; phone: string; address: string }) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function NewCustomerDoctorModal({
  isOpen,
  customerName,
  initialDoctorName = '',
  initialDoctorPhone = '',
  initialDoctorAddress = '',
  onSave,
  onSkip,
  onClose,
}: NewCustomerDoctorModalProps) {
  const [docName, setDocName] = useState(initialDoctorName);
  const [docPhone, setDocPhone] = useState(initialDoctorPhone);
  const [docAddress, setDocAddress] = useState(initialDoctorAddress);

  useEffect(() => {
    if (isOpen) {
      setDocName(initialDoctorName && initialDoctorName.toUpperCase() !== 'N/A' ? initialDoctorName : '');
      setDocPhone(initialDoctorPhone && initialDoctorPhone !== 'N/A' ? initialDoctorPhone : '');
      setDocAddress(initialDoctorAddress && initialDoctorAddress !== 'N/A' ? initialDoctorAddress : '');
      setTimeout(() => {
        const inputEl = document.getElementById('new-patient-doctor-name-input');
        if (inputEl) inputEl.focus();
      }, 100);
    }
  }, [isOpen, initialDoctorName, initialDoctorPhone, initialDoctorAddress]);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!docName.trim()) {
      // If skipped or empty, treat as skip / N/A
      onSkip();
      return;
    }
    onSave({
      name: docName.trim(),
      phone: docPhone.trim(),
      address: docAddress.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Prescribing Doctor Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New Patient: <strong className="text-primary-600 dark:text-primary-400">{customerName}</strong>
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            This customer is new. Enter their prescribing doctor details below. All info will be safely saved in the Patient Directory after sale:
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-primary-500" /> Doctor Name
            </label>
            <Input
              id="new-patient-doctor-name-input"
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="e.g. Dr. A. K. Banerjee"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" /> Doctor Phone No.
            </label>
            <Input
              value={docPhone}
              onChange={e => setDocPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              placeholder="10-digit mobile / clinic phone"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" /> Doctor / Chamber Address
            </label>
            <Input
              value={docAddress}
              onChange={e => setDocAddress(e.target.value)}
              placeholder="e.g. Apollo Clinic, Kolkata"
              className="h-9 text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t dark:border-slate-800 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSkip}
              className="text-xs text-slate-600 dark:text-slate-400 gap-1"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip / No Dr. (N/A)
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs gap-1.5 h-9 px-4"
              >
                <Check className="w-4 h-4" /> Save Doctor Details
              </Button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
