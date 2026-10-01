import React, { useState, useRef, useEffect } from 'react';
import { Input } from '../../components/ui';
import { Doctor, PatientDoctor } from '../../types';
import { Stethoscope, Phone, MapPin, Star } from 'lucide-react';

interface DoctorAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  doctors: Doctor[];
  patientDoctors?: PatientDoctor[];
  onSelect: (doctor: Doctor | PatientDoctor) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export function DoctorAutocomplete({
  id,
  value,
  onChange,
  doctors,
  patientDoctors = [],
  onSelect,
  onFocus,
  placeholder = "Search or enter doctor name...",
  className = ""
}: DoctorAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Merge patient doctors and global doctors, marking patient doctors
  const mergedList: Array<{ item: Doctor | PatientDoctor; isPatientDoctor: boolean }> = [
    ...patientDoctors.map(pd => ({ item: pd, isPatientDoctor: true })),
    ...doctors
      .filter(d => !patientDoctors.some(pd => (pd?.name || '').toLowerCase() === (d?.name || '').toLowerCase()))
      .map(d => ({ item: d, isPatientDoctor: false }))
  ];

  const filtered = mergedList.filter(({ item }) => {
    const s = (search || '').toLowerCase();
    if (!s) return true;
    return (
      (item?.name || '').toLowerCase().includes(s) ||
      (item?.phone && item.phone.includes(s)) ||
      (item?.address && (item.address || '').toLowerCase().includes(s))
    );
  });

  const focusNextDoctorField = () => {
    const payEl = document.getElementById('payment-mode-select');
    if (payEl) payEl.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        const selected = filtered[highlightedIdx].item;
        setSearch(selected.name);
        setIsOpen(false);
        onChange(selected.name);
        onSelect(selected);
      } else {
        // Dropdown not open or no match: Enter acts like Tab to shift to Payment Mode!
        e.preventDefault();
        setIsOpen(false);
        focusNextDoctorField();
      }
    } else if (e.key === 'Tab') {
      // TAB KEY WORK FOR ONLY SHIFTING FIELD NOT SELECTED INFO FROM DROPDOWN
      setIsOpen(false);
      // Let Tab shift to Payment Mode naturally without selecting from dropdown
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
          setIsOpen(true);
          if (onFocus) onFocus(e);
        }}
        onChange={e => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIdx(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className || "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 h-9 text-sm"}
      />
      {isOpen && (filtered.length > 0 || ((search || '').trim().length > 0 && (search || '').toLowerCase() !== 'n/a')) && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y dark:divide-slate-700">
          {filtered.map(({ item: d, isPatientDoctor }, i) => (
            <li
              key={d.id || `${d?.name || 'doc'}-${i}`}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlightedIdx 
                  ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              onMouseEnter={() => setHighlightedIdx(i)}
              onClick={() => {
                setSearch(d.name);
                onChange(d.name);
                onSelect(d);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-primary-500" />
                  <span>{d.name}</span>
                  {isPatientDoctor && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                      <Star className="w-2.5 h-2.5 fill-teal-500 text-teal-500" /> Patient Dr
                    </span>
                  )}
                </div>
                {d.phone && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-500" /> {d.phone}
                  </span>
                )}
              </div>
              {d.address && (
                <div className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{d.address}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
