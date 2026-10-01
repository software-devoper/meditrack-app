import React, { useState, useRef, useEffect } from 'react';
import { Input } from '../../components/ui';
import { Customer } from '../../types';
import { Building2, Phone, Sparkles } from 'lucide-react';

interface SupplierSuggestionInputProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  onSelectSupplier?: (supplier: Customer) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  suppliers: Customer[];
  placeholder?: string;
  className?: string;
}

export function SupplierSuggestionInput({
  id,
  value,
  onChange,
  onSelectSupplier,
  onKeyDown,
  suppliers,
  placeholder = 'Select or type supplier name...',
  className = '',
}: SupplierSuggestionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = (value || '').trim().toLowerCase();
  const matching = suppliers.filter(s => 
    (s?.name || '').toLowerCase().includes(query) || (s?.phone && s.phone.includes(query))
  );

  const displayList = matching.slice(0, 6);

  const handleSelect = (sup: Customer) => {
    onChange(sup.name);
    if (onSelectSupplier) {
      onSelectSupplier(sup);
    }
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (value.trim().length > 0) {
      setIsOpen(true);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && displayList.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev < displayList.length - 1 ? prev + 1 : prev));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === 'Enter') {
        if (displayList[highlightedIndex]) {
          e.preventDefault();
          handleSelect(displayList[highlightedIndex]);
          return;
        } else {
          // Close even if no selection if Enter is pressed
          setIsOpen(false);
        }
      }
      if (e.key === 'Tab') {
        // Close on Tab to prevent it sticking around
        setIsOpen(false);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          if (e.target.value.trim().length > 0) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
          setHighlightedIndex(0);
        }}
        onFocus={(e) => {
          e.target.select();
          handleInputFocus();
        }}
        onBlur={() => {
          // Delay to allow handleSelect (mousedown) to trigger
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleCustomKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />

      {isOpen && query.length > 0 && (matching.length > 0 || query.length > 0) && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[260px] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between border-b dark:border-slate-700">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary-500" />
              Suppliers / Vendors
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {displayList.map((sup, idx) => {
              const isSelected = idx === highlightedIndex;
              const nameKey = sup.name ? sup.name.trim().toLowerCase() : '';
              const localDisc = nameKey ? localStorage.getItem(`meditrack_supplier_discount_${nameKey}`) : null;
              const effectiveDiscount = sup.defaultDiscount !== undefined && sup.defaultDiscount !== null && !isNaN(Number(sup.defaultDiscount))
                ? Number(sup.defaultDiscount)
                : (localDisc !== null && !isNaN(Number(localDisc)) ? Number(localDisc) : null);

              return (
                <div
                  key={sup.id || idx}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    isSelected ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(sup);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                        {sup.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {effectiveDiscount !== null && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {effectiveDiscount}% Disc
                      </span>
                    )}
                    {sup.phone && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {sup.phone}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {displayList.length === 0 && (
              <div className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                Press Enter to use "<strong>{value}</strong>" as supplier name.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
