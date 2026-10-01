import React, { useState, useRef, useEffect } from 'react';
import { Input } from '../../components/ui';

interface PatientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  patients?: any[];
  customers?: any[];
  onSelect: (customer: any) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function PatientAutocomplete({ 
  value, 
  onChange, 
  patients, 
  customers, 
  onSelect,
  id = "patient-name-input",
  placeholder = "Type patient name...",
  className = "",
  autoFocus = true
}: PatientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const patientList = patients || customers || [];

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = patientList.filter((c: any) => 
    (c?.name || '').toLowerCase().includes((search || '').toLowerCase()) ||
    (c?.phone && c.phone.includes(search || ''))
  );

  const focusNextField = () => {
    const billToEl = document.getElementById('bill-to-input') as HTMLInputElement | null;
    const phoneEl = document.getElementById('patient-phone-input') as HTMLInputElement | null;
    if (billToEl) {
      billToEl.focus();
      if (billToEl.select) billToEl.select();
    } else if (phoneEl) {
      phoneEl.focus();
      if (phoneEl.select) phoneEl.select();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen && filtered.length > 0) {
        setIsOpen(true);
        setHighlightedIdx(0);
        e.preventDefault();
        return;
      }
      if (isOpen) {
        e.preventDefault();
        setHighlightedIdx(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      if (isOpen) {
        e.preventDefault();
        setHighlightedIdx(prev => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === 'Enter') {
      // ENTER KEY WORKS FOR SELECTION
      if (isOpen && search.trim().length > 0 && filtered.length > 0 && filtered[highlightedIdx]) {
        e.preventDefault();
        const selected = filtered[highlightedIdx];
        setSearch(selected.name);
        setIsOpen(false);
        onChange(selected.name);
        onSelect(selected);
      } else {
        // When dropdown is not open or no match, Enter shifts to next field like Tab
        e.preventDefault();
        setIsOpen(false);
        focusNextField();
      }
    } else if (e.key === 'Tab') {
      // TAB KEY WORK FOR ONLY SHIFTING FIELD NOT SELECTED INFO FROM DROPDOWN
      setIsOpen(false);
      // Let Tab shift to the next field naturally without triggering onSelect
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        id={id}
        value={search}
        onFocus={(e) => {
          e.target.select();
          if (filtered.length > 0) {
            setIsOpen(true);
          }
        }}
        onChange={e => {
          const val = e.target.value;
          setSearch(val);
          onChange(val);
          setIsOpen(true);
          setHighlightedIdx(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className || "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 h-9 text-sm"}
        autoFocus={autoFocus}
      />
      {isOpen && search.trim().length > 0 && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((c: any, i: number) => (
            <li
              key={c.id || `${c.name}-${i}`}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === highlightedIdx ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              onMouseEnter={() => setHighlightedIdx(i)}
              onClick={() => {
                setSearch(c.name);
                setIsOpen(false);
                onChange(c.name);
                onSelect(c);
              }}
            >
              <div className="font-medium">{c.name}</div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {c.phone && <span>Ph: {c.phone}</span>}
                {c.address && <span className="truncate">• {c.address}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const CustomerAutocomplete = PatientAutocomplete;
