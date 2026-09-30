import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Sparkles, Plus } from 'lucide-react';
import { Input } from '../../components/ui';

export function ProductAutocomplete({ 
  value, 
  onChange, 
  onSelectCustom,
  products, 
  id, 
  onKeyDown, 
  autoFocus, 
  selectedProductIds = [] 
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectCustom?: (customName: string) => void;
  products: any[];
  id: string;
  onKeyDown?: (e: any) => void;
  autoFocus?: boolean;
  selectedProductIds?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // The displayed value in the table cell
  const displayValue = value ? (products.find((p: any) => p.id === value)?.name || '') : '';

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIdx] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIdx, isOpen]);

  const filtered = products
    .filter((p: any) => {
      const s = search.toLowerCase();
      if (!s) return true;
      return p.name.toLowerCase().includes(s) || (p.genericName && p.genericName.toLowerCase().includes(s));
    })
    .sort((a: any, b: any) => {
      const s = search.toLowerCase();
      if (!s) return 0;
      // Closest match logic: exact start gets highest priority
      const aStarts = a.name.toLowerCase().startsWith(s) ? 1 : 0;
      const bStarts = b.name.toLowerCase().startsWith(s) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      
      // Then shortest string (closest to exact match)
      return a.name.length - b.name.length;
    });

  const handleOpen = () => {
    setIsOpen(true);
    setSearch('');
    setHighlightedIdx(0);
  };

  const focusNextQtyCell = () => {
    const parts = id.split('-');
    let nextEl: HTMLInputElement | null = null;
    if (id.startsWith('grid-input-')) {
      const rowIdx = parseInt(parts[2]);
      nextEl = document.getElementById(`grid-input-${rowIdx}-1`) as HTMLInputElement | null;
    } else if (id.startsWith('edit-grid-')) {
      const rowIdx = parseInt(parts[2]);
      nextEl = document.getElementById(`edit-qty-${rowIdx}`) as HTMLInputElement | null;
    }
    if (nextEl) {
      setTimeout(() => {
        nextEl?.focus();
        if (nextEl?.select) nextEl.select();
      }, 50);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Strictly do NOT open dialog box on Tab or Enter key navigation
    if (e.key === 'Tab' || e.key === 'Enter') {
      if (onKeyDown) {
        onKeyDown(e);
      }
      return;
    }

    // Open search dialog ONLY when client types something on this field (character key)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      handleOpen();
      setSearch(e.key);
      return;
    }

    if (onKeyDown) onKeyDown(e);
  };

  const handleChooseCustom = (nameToUse: string) => {
    if (!nameToUse.trim()) return;
    if (onSelectCustom) {
      onSelectCustom(nameToUse.trim());
    } else {
      onChange(`custom_${encodeURIComponent(nameToUse.trim())}`);
    }
    setIsOpen(false);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (filtered[highlightedIdx]) {
        const p = filtered[highlightedIdx];
        if (p.stockQty > 0 && !selectedProductIds.includes(p.id)) {
          e.preventDefault();
          onChange(p.id);
          setIsOpen(false);
          focusNextQtyCell();
        }
      } else if (filtered.length === 0 && search.trim() && onSelectCustom) {
        e.preventDefault();
        handleChooseCustom(search);
      }
    } else if (e.key === 'Tab') {
      // Tab key shifts field without selecting from dropdown
      e.preventDefault();
      setIsOpen(false);
      focusNextQtyCell();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      // Return focus to cell
      const el = document.getElementById(id);
      if (el) el.focus();
    }
  };

  return (
    <>
      <input
        id={id}
        autoFocus={autoFocus}
        type="text"
        value={displayValue}
        readOnly
        onClick={handleOpen}
        onFocus={() => {
          // No auto-open on focus to prevent annoying pops
        }}
        onKeyDown={handleCellKeyDown}
        placeholder="Search product..."
        className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
      />

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50">
              <Search className="w-5 h-5 text-slate-400" />
              <Input
                ref={searchInputRef}
                type="text"
                value={search}
                onFocus={(e) => e.target.select()}
                onChange={e => {
                  setSearch(e.target.value);
                  setHighlightedIdx(0);
                }}
                onKeyDown={handleModalKeyDown}
                placeholder="Search products by name or generic name..."
                className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-lg shadow-none focus-visible:ring-0"
              />
              <button 
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  const el = document.getElementById(id);
                  if (el) el.focus();
                }} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom sales product banner if client typed something */}
            {search.trim().length > 0 && onSelectCustom && (
              <div className="p-2.5 px-4 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <p className="text-xs text-purple-900 dark:text-purple-200 truncate">
                    Product not in inventory? Use <strong className="font-semibold text-purple-700 dark:text-purple-300">"{search.trim()}"</strong> as a sales-only custom item.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChooseCustom(search)}
                  className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Use as Custom Item
                </button>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-900/20">
              {filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
                    {search.trim() ? `No inventory products match "${search}".` : 'Type to search products or add a custom sales item.'}
                  </p>
                  {search.trim() && onSelectCustom && (
                    <button
                      type="button"
                      onClick={() => handleChooseCustom(search)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Add "{search.trim()}" as Custom Sales Product
                    </button>
                  )}
                </div>
              ) : (
                <ul ref={listRef} className="space-y-1">
                  {filtered.map((p: any, i: number) => {
                    const isAlreadySelected = selectedProductIds.includes(p.id);
                    const isDisabled = p.stockQty <= 0 || isAlreadySelected;

                    return (
                      <li
                        key={p.id}
                        onMouseEnter={() => setHighlightedIdx(i)}
                        onClick={() => {
                          if (!isDisabled) {
                            onChange(p.id);
                            setIsOpen(false);
                            focusNextQtyCell();
                          }
                        }}
                        className={`p-3 rounded-lg border transition-colors flex items-center justify-between ${
                          isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          i === highlightedIdx && !isDisabled
                            ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/30 dark:border-primary-800' 
                            : 'bg-white border-transparent hover:border-slate-200 dark:bg-slate-800 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className={`font-semibold text-base ${i === highlightedIdx && !isDisabled ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {p.name} {isAlreadySelected && <span className="ml-2 text-xs text-red-500 font-normal">(Already Added)</span>}
                          </div>
                          {p.genericName && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {p.genericName}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            ₹{p.mrp.toFixed(2)}
                          </div>
                          <div className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${
                            p.stockQty <= 0 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            Stock: {p.stockQty} {p.unit}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
