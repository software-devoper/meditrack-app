import React, { useState, useRef, useEffect } from 'react';
import { Input } from '../../components/ui';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Package, Layers, Sparkles } from 'lucide-react';

interface ProductSuggestionInputProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  onSelectProduct: (product: Product) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  products: Product[];
  placeholder?: string;
  autoFocus?: boolean;
}

export function ProductSuggestionInput({
  id,
  value,
  onChange,
  onSelectProduct,
  onKeyDown,
  products,
  placeholder = 'Product Name',
  autoFocus = false,
}: ProductSuggestionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching products
  const query = (value || '').trim().toLowerCase();
  const matchingProducts = query.length > 0
    ? products.filter(p => 
        (p?.name || '').toLowerCase().includes(query) || 
        (p?.genericName && p.genericName.toLowerCase().includes(query)) ||
        (p?.category && p.category.toLowerCase().includes(query))
      )
    : [];

  // Limit to top 8 suggestions for performance and UI cleanliness
  const displaySuggestions = matchingProducts.slice(0, 8);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleInputFocus = () => {
    if (value.trim().length > 0 && matchingProducts.length > 0) {
      setIsOpen(true);
    }
  };

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setIsOpen(false);
    // Focus back and notify
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && displaySuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev < displaySuggestions.length - 1 ? prev + 1 : prev));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === 'Enter') {
        if (displaySuggestions[highlightedIndex]) {
          e.preventDefault();
          handleSelect(displaySuggestions[highlightedIndex]);
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

    // Pass standard onKeyDown to parent (e.g. Enter to jump between fields)
    onKeyDown(e);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={(e) => {
          handleInputFocus();
          e.target.select();
        }}
        onBlur={() => {
          // Delay to allow handleSelect (mousedown) to trigger
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleCustomKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="w-full h-10 font-medium"
      />

      {isOpen && query.length > 0 && displaySuggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-[380px] sm:w-[440px] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between border-b dark:border-slate-700">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              Inventory Suggestions ({matchingProducts.length})
            </span>
            <span className="text-[10px] lowercase font-normal text-slate-500 dark:text-slate-400">
              Press ↑/↓ to navigate, Enter to autofill
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {displaySuggestions.map((prod, idx) => {
              const isSelected = idx === highlightedIndex;
              // Check if there are other entries with the same name
              const duplicateCount = products.filter(
                p => (p?.name || '').trim().toLowerCase() === (prod?.name || '').trim().toLowerCase()
              ).length;

              return (
                <div
                  key={prod.id || idx}
                  className={`px-3.5 py-2.5 cursor-pointer text-left transition-colors flex items-start justify-between gap-2 ${
                    isSelected 
                      ? 'bg-primary-50 dark:bg-primary-900/40 border-l-4 border-primary-600' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSelect(prod);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {prod.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {prod.unit || 'Strip'}
                      </span>
                      {duplicateCount > 1 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5">
                          <Layers className="w-2.5 h-2.5" />
                          {duplicateCount} values recorded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      {prod.supplierName && (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          Vendor: <strong>{prod.supplierName}</strong>
                        </span>
                      )}
                      <span className="text-[11px] flex items-center gap-1">
                        <Package className="w-3 h-3 text-slate-400" />
                        In-stock: {prod.stockQty} {prod.unit}
                      </span>
                      {prod.gstPercent !== undefined && (
                        <span className="text-[11px]">GST: {prod.gstPercent}%</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right whitespace-nowrap pl-2 flex flex-col items-end">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Buy: <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(prod.purchasePrice || 0)}</strong>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      MRP: {formatCurrency(prod.mrp || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
