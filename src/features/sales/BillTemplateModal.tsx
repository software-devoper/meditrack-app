import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, Eye, ShieldCheck, Printer, CheckCircle } from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { usePremiumBillStore } from '../../store/usePremiumBillStore';
import { toast } from 'sonner';

interface BillTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPrint: (templateType: 'free' | 'premium') => void;
  isProcessing?: boolean;
}

export function BillTemplateModal({
  isOpen,
  onClose,
  onConfirmPrint,
  isProcessing = false,
}: BillTemplateModalProps) {
  const { selectedTemplate, setSelectedTemplate } = usePremiumBillStore();
  
  // Local template choice: 'free' or 'premium'
  const [templateChoice, setTemplateChoice] = useState<'free' | 'premium'>(selectedTemplate || 'free');

  if (!isOpen) return null;

  const handleSelectTemplate = (type: 'free' | 'premium') => {
    setTemplateChoice(type);
    setSelectedTemplate(type);
  };

  const handleConfirm = () => {
    onConfirmPrint(templateChoice);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Bill Template</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Format Switcher
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select between Free and Paid bill designs for printing and PDF/JPG generation.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* Direct Switch: Paid to Free & Free to Paid */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSelectTemplate('free')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                templateChoice === 'free'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Standard Bill (Free)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold uppercase">
                Free
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTemplate('premium')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                templateChoice === 'premium'
                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Premium GST Bill (Paid)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-600 text-amber-100 font-extrabold uppercase">
                Paid
              </span>
            </button>
          </div>

          {/* Testing Mode Notification Banner (Payment removed for inspection) */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Testing & Inspection Active:</strong> Payment checkout is currently bypassed so you can freely test and generate the Premium Bill.
              </span>
            </div>
            <span className="shrink-0 text-[10px] font-bold uppercase bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
              Unlocked
            </span>
          </div>

          {/* Two Visual Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Free Bill (Standard) */}
            <div 
              onClick={() => handleSelectTemplate('free')}
              className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between ${
                templateChoice === 'free'
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {templateChoice === 'free' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Standard Pharmacy Bill
                  </span>
                </div>

                {/* Bill mini preview simulation */}
                <div className="h-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 overflow-hidden flex flex-col justify-between shadow-2xs mb-3 font-serif">
                  <div className="text-center font-bold text-[9px] uppercase tracking-wide border-b border-black pb-1">
                    TAX INVOICE - MEDITRACK
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[7px] border-b border-slate-200 pb-1">
                    <div className="text-slate-500">Patient: John Doe</div>
                    <div className="text-center text-slate-500">Inv: HCP-10</div>
                    <div className="text-right text-slate-500">Date: Today</div>
                  </div>
                  <div className="space-y-1 text-[7px]">
                    <div className="flex justify-between font-semibold">
                      <span>1. Paracetamol 650mg (10 Tab)</span>
                      <span>₹30.00</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>2. Amoxicillin 500mg (10 Cap)</span>
                      <span>₹120.00</span>
                    </div>
                  </div>
                  <div className="border-t border-black pt-1 flex justify-between font-bold text-[8px]">
                    <span>TOTAL AMOUNT</span>
                    <span>₹150.00</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Clean, standard medical invoice with complete GST breakdown, doctor prescriber info, and bank details.
                </p>
              </div>

              {/* Under it writes: Free */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    Free
                  </span>
                  <span className="text-[11px] text-slate-500 ml-2">Unlimited forever</span>
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ₹0.00
                </span>
              </div>
            </div>

            {/* 2. Premium Bill (Paid - Extracted from attachment) */}
            <div 
              onClick={() => handleSelectTemplate('premium')}
              className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between ${
                templateChoice === 'premium'
                  ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {templateChoice === 'premium' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Premium GST Invoice
                  </span>
                </div>

                {/* Premium Bill mini preview simulation (Teal & Amber Header) */}
                <div className="h-28 rounded-lg border border-teal-700/60 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between shadow-2xs mb-3 font-sans">
                  {/* Teal Header */}
                  <div className="bg-[#0a3a40] text-white px-2 py-1 flex items-center justify-between text-[7.5px] font-bold">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full border border-white flex items-center justify-center text-[7px]">+</div>
                      <span>GST SALES INVOICE</span>
                    </div>
                    <span className="bg-[#f59e0b] text-slate-900 px-1 rounded-full text-[6px] font-extrabold uppercase">
                      ORIGINAL COPY
                    </span>
                  </div>
                  {/* Light mint row */}
                  <div className="bg-[#ebf6f5] dark:bg-teal-950/30 px-2 py-0.5 border-b border-teal-200 dark:border-teal-900 grid grid-cols-3 text-[6.5px]">
                    <div className="text-slate-600">Patient: Sukhendu Maity</div>
                    <div className="text-center font-bold text-[#00796b]">HEALTHBUDDY PHARMACY</div>
                    <div className="text-right text-[#00796b] font-bold">A/C: 38920192847</div>
                  </div>
                  {/* Items */}
                  <div className="px-2 space-y-0.5 text-[6.5px]">
                    <div className="flex justify-between font-bold text-[#0a3a40] dark:text-teal-300">
                      <span>OBIMET SR 1 GM TAB</span>
                      <span>₹65.15</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>PANTOP D SR 15 CAP</span>
                      <span>₹248.00</span>
                    </div>
                  </div>
                  {/* Received Pill + Get well soon */}
                  <div className="bg-[#ebf6f5] dark:bg-teal-950/40 px-2 py-1 border-t border-teal-200 dark:border-teal-900 flex justify-between items-center text-[7px]">
                    <span className="font-bold text-[#00796b]">AMOUNT: ₹313.15</span>
                    <span className="bg-[#0a3a40] text-white px-1.5 py-0.5 rounded-full text-[6.5px] font-bold">
                      RECEIVED
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Extracted from your attachment: Dark teal header bar with medical cross, amber buyer badge, mint info cards, received pill, and "Get Well Soon" banner.
                </p>
              </div>

              {/* Under it writes: Paid */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    Paid
                  </span>
                  <span className="text-[11px] text-slate-500 ml-2">₹2 per bill generator</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Test Mode (Free to generate)
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Details Comparison Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Active Selection:{' '}
              <strong className={templateChoice === 'premium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {templateChoice === 'premium' ? 'Paid (Premium GST Invoice)' : 'Free (Standard Pharmacy Bill)'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => handleSelectTemplate(templateChoice === 'free' ? 'premium' : 'free')}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Switch to {templateChoice === 'free' ? 'Paid' : 'Free'} <ArrowRight className="w-3 h-3" />
            </button>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`${
                templateChoice === 'premium'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
              } flex items-center gap-2 min-w-[200px] justify-center shadow-sm cursor-pointer`}
            >
              <Printer className="w-4 h-4" />
              {isProcessing
                ? 'Processing...'
                : templateChoice === 'premium'
                ? 'Confirm & Print (Paid - Premium)'
                : 'Confirm & Print (Free - Standard)'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
