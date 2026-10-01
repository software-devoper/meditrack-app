import React, { useState, useEffect } from 'react';
import { doc, setDoc, addDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product, Customer } from '../../types';
import { Button, Input } from '../../components/ui';
import { toast } from 'sonner';
import { X, Plus, Trash2, CheckCircle2, Layers, RefreshCw } from 'lucide-react';
import { ProductSuggestionInput } from './ProductSuggestionInput';
import { SupplierSuggestionInput } from './SupplierSuggestionInput';
import { ProductValuesModal } from './ProductValuesModal';

interface ProductRow {
  name: string;
  unit: string;
  stockQty: number;
  mrp: number;
  discount: number;
  purchasePrice: number;
  gstPercent: number;
  supplierName: string;
  supplierPhone: string;
}

export const GLOBAL_STANDARD_DISCOUNT = 20;

// Read the system/global default fallback discount
export const getGlobalDefaultDiscount = (): number => {
  const saved = localStorage.getItem('meditrack_purchase_global_default_discount');
  if (saved !== null && !isNaN(Number(saved))) return Number(saved);
  const legacy = localStorage.getItem('meditrack_purchase_default_discount');
  if (legacy !== null && !isNaN(Number(legacy))) return Number(legacy);
  return GLOBAL_STANDARD_DISCOUNT;
};

// Check and retrieve discount specifically for a given supplier
export const getSupplierDiscount = (
  supplierName: string, 
  suppliersList: Customer[] = []
): { discount: number; isSupplierSpecific: boolean } => {
  const nameTrimmed = (supplierName || '').trim().toLowerCase();
  if (!nameTrimmed) {
    return { discount: getGlobalDefaultDiscount(), isSupplierSpecific: false };
  }

  // 1. Check in suppliers list (loaded from Firestore)
  const match = suppliersList.find(s => s.name && s.name.trim().toLowerCase() === nameTrimmed);
  if (match && match.defaultDiscount !== undefined && match.defaultDiscount !== null && !isNaN(Number(match.defaultDiscount))) {
    return { discount: Number(match.defaultDiscount), isSupplierSpecific: true };
  }

  // 2. Check in localStorage per-supplier cache
  const localSup = localStorage.getItem(`meditrack_supplier_discount_${nameTrimmed}`);
  if (localSup !== null && localSup !== '' && !isNaN(Number(localSup))) {
    return { discount: Number(localSup), isSupplierSpecific: true };
  }

  // 3. Not set for this supplier -> use global fallback
  return { discount: getGlobalDefaultDiscount(), isSupplierSpecific: false };
};

// Save discount specifically for a given supplier
export const saveSupplierDiscount = (supplierName: string, discount: number) => {
  const nameTrimmed = (supplierName || '').trim().toLowerCase();
  if (nameTrimmed) {
    // Save only for this specific supplier
    localStorage.setItem(`meditrack_supplier_discount_${nameTrimmed}`, discount.toString());
  } else {
    // Only if no supplier name is active, update the general global default
    localStorage.setItem('meditrack_purchase_global_default_discount', discount.toString());
  }
};

export function ProductFormModal({ 
  product, 
  initialSupplier,
  onClose 
}: { 
  product?: Product;
  initialSupplier?: any;
  onClose: () => void;
}) {
  const isEdit = !!product;

  // Single edit state
  const [editName, setEditName] = useState(product?.name || '');
  const [editUnit, setEditUnit] = useState(product?.unit || 'Strip');
  const [editMrp, setEditMrp] = useState(product?.mrp ?? 0);
  const [editDiscount, setEditDiscount] = useState(() => {
    if (product?.discount !== undefined) return product.discount;
    if (product?.mrp && product?.purchasePrice && product.mrp > 0 && product.mrp >= product.purchasePrice) {
      return Number((((product.mrp - product.purchasePrice) / product.mrp) * 100).toFixed(2));
    }
    return 20;
  });
  const [editPurchasePrice, setEditPurchasePrice] = useState(product?.purchasePrice ?? 0);
  const [editGstPercent, setEditGstPercent] = useState(product?.gstPercent ?? 12);
  const [editStockQty, setEditStockQty] = useState(product?.stockQty ?? 0);
  const [editSupplierName, setEditSupplierName] = useState(product?.supplierName || '');
  const [editSupplierPhone, setEditSupplierPhone] = useState('');

  // Multi-row add state
  const [commonSupplier, setCommonSupplier] = useState('');
  const [commonSupplierPhone, setCommonSupplierPhone] = useState('');
  const [defaultDiscount, setDefaultDiscount] = useState(() => {
    return getGlobalDefaultDiscount();
  });
  const [defaultGst, setDefaultGst] = useState(() => {
    const saved = localStorage.getItem('meditrack_purchase_default_gst');
    return saved ? Number(saved) : 12;
  });
  const [hasDraft, setHasDraft] = useState(false);
  const [rows, setRows] = useState<ProductRow[]>([
    { name: '', unit: 'Strip', stockQty: 0, mrp: 0, discount: 20, purchasePrice: 0, gstPercent: 12, supplierName: '', supplierPhone: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [valuesModalProduct, setValuesModalProduct] = useState<string | null>(null);

  // Sync defaultGst & defaultDiscount to first row if it's new
  useEffect(() => {
    if (!isEdit && rows.length === 1 && rows[0].name === '' && (rows[0].gstPercent !== defaultGst || rows[0].discount !== defaultDiscount)) {
      setRows([{ ...rows[0], gstPercent: defaultGst, discount: defaultDiscount }]);
    }
  }, [defaultGst, defaultDiscount, isEdit]);

  // Auto-restore draft on mount
  useEffect(() => {
    if (!isEdit) {
      const draft = localStorage.getItem('meditrack_purchase_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.commonSupplier !== undefined) setCommonSupplier(parsed.commonSupplier);
          if (parsed.commonSupplierPhone !== undefined) setCommonSupplierPhone(parsed.commonSupplierPhone);
          
          let initialDisc = getGlobalDefaultDiscount();
          if (parsed.commonSupplier) {
            initialDisc = getSupplierDiscount(parsed.commonSupplier, suppliers).discount;
          } else if (parsed.defaultDiscount !== undefined && !isNaN(Number(parsed.defaultDiscount))) {
            initialDisc = Number(parsed.defaultDiscount);
          }
          setDefaultDiscount(initialDisc);

          if (parsed.defaultGst !== undefined && !isNaN(Number(parsed.defaultGst))) {
            setDefaultGst(Number(parsed.defaultGst));
          }
          if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
            setRows(parsed.rows.map((r: any) => ({
              ...r,
              discount: r.discount !== undefined ? Number(r.discount) : initialDisc,
              supplierPhone: r.supplierPhone || ''
            })));
            setHasDraft(true);
          }
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      }
    }
  }, [isEdit]);

  // Auto-save draft on every change
  useEffect(() => {
    if (isEdit) return;
    const hasContent = rows.some(r => r.name.trim() || Number(r.stockQty) > 0 || Number(r.purchasePrice) > 0 || Number(r.mrp) > 0) || commonSupplier.trim() || commonSupplierPhone.trim();
    if (hasContent) {
      const draft = {
        commonSupplier,
        commonSupplierPhone,
        defaultDiscount,
        defaultGst,
        rows,
        savedAt: Date.now()
      };
      localStorage.setItem('meditrack_purchase_draft', JSON.stringify(draft));
      setHasDraft(true);
    }
  }, [rows, commonSupplier, commonSupplierPhone, defaultDiscount, defaultGst, isEdit]);

  // Load suppliers
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'customers'));
    const unsub = onSnapshot(q, (snapshot) => {
      const records: Customer[] = [];
      snapshot.forEach(d => records.push({ id: d.id, ...d.data() } as Customer));
      const purchaseSuppliers = records.filter(r => r.type === 'purchase');
      const loadedSuppliers = purchaseSuppliers.length > 0 ? purchaseSuppliers : records;
      setSuppliers(loadedSuppliers);

      // If a supplier is currently selected, sync its discount from loaded supplier records
      if (commonSupplier.trim()) {
        const { discount: supDisc, isSupplierSpecific } = getSupplierDiscount(commonSupplier, loadedSuppliers);
        if (isSupplierSpecific) {
          setDefaultDiscount(supDisc);
          setRows(prev => prev.map(r => {
            const newPrice = r.mrp > 0 ? Number((r.mrp * (1 - supDisc / 100)).toFixed(2)) : r.purchasePrice;
            return {
              ...r,
              discount: supDisc,
              purchasePrice: newPrice
            };
          }));
        }
      }
    });
    return () => unsub();
  }, [commonSupplier]);

  // In edit mode, auto-fetch supplier phone if supplier exists
  useEffect(() => {
    if (isEdit && editSupplierName.trim() && !editSupplierPhone) {
      const matched = suppliers.find(s => (s?.name || '').trim().toLowerCase() === editSupplierName.trim().toLowerCase());
      if (matched && matched.phone) {
        setEditSupplierPhone(matched.phone);
      }
    }
  }, [isEdit, editSupplierName, suppliers]);

  // Load products
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(d => prods.push({ id: d.id, ...d.data() } as Product));
      setExistingProducts(prods);
    });
    return () => unsub();
  }, []);

  // Helper to save a new supplier to customers collection or update phone & discount (invoked only on Save)
  const autoSaveSupplier = async (nameInput: string, phoneInput?: string, discountInput?: number, silent = false) => {
    const name = nameInput.trim();
    const phone = (phoneInput || '').trim().replace(/\D/g, '').slice(0, 10);
    if (!name || !db) return;

    const discountToSave = discountInput !== undefined ? discountInput : defaultDiscount;
    saveSupplierDiscount(name, discountToSave);

    const existing = suppliers.find(
      s => (s?.name || '').trim().toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      const updates: Partial<Customer> = {};
      if (!existing.phone && phone && phone.length === 10) {
        updates.phone = phone;
      }
      if (discountToSave !== undefined && existing.defaultDiscount !== discountToSave) {
        updates.defaultDiscount = discountToSave;
      }
      if (Object.keys(updates).length > 0 && existing.id) {
        try {
          await setDoc(doc(db, 'customers', existing.id), updates, { merge: true });
        } catch (e) {
          console.error('Failed to update existing supplier phone/discount:', e);
        }
      }
      return;
    }

    // It's a new supplier! Save to supplier section
    try {
      const newDoc = await addDoc(collection(db, 'customers'), {
        name,
        phone: phone || '',
        email: '',
        address: '',
        type: 'purchase',
        outstandingBalance: 0,
        defaultDiscount: discountToSave,
        doctors: [],
        createdAt: Date.now(),
        createdBy: 'system'
      });

      const newSup: Customer = {
        id: newDoc.id,
        name,
        phone: phone || '',
        email: '',
        address: '',
        type: 'purchase',
        outstandingBalance: 0,
        defaultDiscount: discountToSave,
        doctors: [],
        createdAt: Date.now(),
        createdBy: 'system'
      };

      setSuppliers(prev => [...prev, newSup]);
      if (!silent) {
        toast.success(`Saved new supplier "${name}" with ${discountToSave}% default discount!`);
      }
    } catch (e) {
      console.error('Failed to save new supplier:', e);
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('meditrack_purchase_draft');
    setCommonSupplier('');
    setCommonSupplierPhone('');
    const globalDisc = getGlobalDefaultDiscount();
    setDefaultDiscount(globalDisc);
    setRows([{ name: '', unit: 'Strip', stockQty: 0, mrp: 0, discount: globalDisc, purchasePrice: 0, gstPercent: defaultGst, supplierName: '', supplierPhone: '' }]);
    setHasDraft(false);
    toast.info("Cleared draft and reset form");
  };

  const handleDefaultGstChange = (val: number) => {
    const clamped = Math.min(Math.max(0, val), 28);
    setDefaultGst(clamped);
    localStorage.setItem('meditrack_purchase_default_gst', clamped.toString());
    setRows(prev => prev.map(r => ({ ...r, gstPercent: clamped })));
  };

  const handleDefaultDiscountChange = (val: number) => {
    const clamped = Math.min(Math.max(0, val), 100);
    setDefaultDiscount(clamped);
    if (commonSupplier.trim()) {
      saveSupplierDiscount(commonSupplier, clamped);
      const nameTrimmed = commonSupplier.trim().toLowerCase();
      // Update in-memory suppliers state so any dropdown and check gets latest discount immediately
      setSuppliers(prev => prev.map(s => 
        (s?.name || '').trim().toLowerCase() === nameTrimmed ? { ...s, defaultDiscount: clamped } : s
      ));
      const matched = suppliers.find(s => (s?.name || '').trim().toLowerCase() === nameTrimmed);
      if (matched && matched.id && db) {
        setDoc(doc(db, 'customers', matched.id), { defaultDiscount: clamped }, { merge: true }).catch(() => {});
      }
    } else {
      saveSupplierDiscount('', clamped);
    }

    // Automatically recalculate purchase price on rows where MRP is present
    setRows(prev => prev.map(r => {
      const newPrice = r.mrp > 0 ? Number((r.mrp * (1 - clamped / 100)).toFixed(2)) : r.purchasePrice;
      return {
        ...r,
        discount: clamped,
        purchasePrice: newPrice
      };
    }));
  };

  const handleCommonSupplierChange = (val: string) => {
    setCommonSupplier(val);
    const nameTrimmed = (val || '').trim().toLowerCase();
    const matched = suppliers.find(s => (s?.name || '').trim().toLowerCase() === nameTrimmed);
    const phone = matched?.phone || '';
    if (matched && phone) {
      setCommonSupplierPhone(phone);
    }

    // Retrieve discount specifically for this supplier (or global fallback if none)
    const { discount: supDiscount } = getSupplierDiscount(val, suppliers);
    setDefaultDiscount(supDiscount);

    setRows(prev => prev.map(r => {
      const newPrice = r.mrp > 0 ? Number((r.mrp * (1 - supDiscount / 100)).toFixed(2)) : r.purchasePrice;
      return { 
        ...r, 
        supplierName: val,
        supplierPhone: matched && phone ? phone : (r.supplierPhone || ''),
        discount: supDiscount,
        purchasePrice: newPrice
      };
    }));
  };

  const handleSelectCommonSupplier = (sup: Customer) => {
    setCommonSupplier(sup.name);
    const phone = sup.phone || '';
    setCommonSupplierPhone(phone);

    const { discount: supDiscount } = getSupplierDiscount(sup.name, suppliers);
    setDefaultDiscount(supDiscount);

    setRows(prev => prev.map(r => {
      const newPrice = r.mrp > 0 ? Number((r.mrp * (1 - supDiscount / 100)).toFixed(2)) : r.purchasePrice;
      return {
        ...r,
        supplierName: sup.name,
        supplierPhone: phone || r.supplierPhone || '',
        discount: supDiscount,
        purchasePrice: newPrice
      };
    }));
  };

  const handleCommonSupplierPhoneChange = (val: string) => {
    const cleanPhone = val.replace(/\D/g, '').slice(0, 10);
    setCommonSupplierPhone(cleanPhone);
    setRows(prev => prev.map(r => ({ ...r, supplierPhone: cleanPhone })));
    // Note: Supplier is NOT saved here; it will be saved only when user clicks the Save button
  };

  const handleRowSupplierChange = (index: number, val: string) => {
    const matched = suppliers.find(s => (s?.name || '').trim().toLowerCase() === (val || '').trim().toLowerCase());
    const phone = matched?.phone || '';
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      supplierName: val,
      supplierPhone: matched && phone ? phone : (updated[index].supplierPhone || '')
    };
    setRows(updated);
  };

  const handleSelectRowSupplier = (index: number, sup: Customer) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      supplierName: sup.name,
      supplierPhone: sup.phone || ''
    };
    setRows(updated);
  };

  const handleRowSupplierPhoneChange = (index: number, val: string) => {
    const cleanPhone = val.replace(/\D/g, '').slice(0, 10);
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      supplierPhone: cleanPhone
    };
    setRows(updated);
    // Note: Supplier is NOT saved here; it will be saved only when user clicks the Save button
  };

  const handleRowSupplierPhoneBlur = (_index: number) => {
    // Note: Supplier is NOT saved on blur; it will be saved only when user clicks the Save button
  };

  const findMatchingProduct = (row: ProductRow, productsList: Product[]): Product | null => {
    if (!row.name || !row.name.trim()) return null;
    const buyVal = Number(row.purchasePrice);
    const mrpVal = Number(row.mrp);
    if (buyVal <= 0 || mrpVal <= 0) return null;

    const nameTrimmed = row.name.trim().toLowerCase();
    const unitTrimmed = (row.unit || 'Strip').trim().toLowerCase();
    const gstVal = Number(row.gstPercent !== undefined ? row.gstPercent : defaultGst);

    return productsList.find(p => {
      if (!p || !p.id) return false;
      const pName = (p.name || '').trim().toLowerCase();
      if (pName !== nameTrimmed) return false;

      const pUnit = (p.unit || 'Strip').trim().toLowerCase();
      if (pUnit !== unitTrimmed) return false;

      const pMrp = Number(p.mrp || 0);
      if (Math.abs(pMrp - mrpVal) >= 0.01) return false;

      const pBuy = Number(p.purchasePrice || 0);
      if (Math.abs(pBuy - buyVal) >= 0.01) return false;

      const pGst = Number(p.gstPercent !== undefined ? p.gstPercent : 12);
      if (Math.abs(pGst - gstVal) >= 0.01) return false;

      return true;
    }) || null;
  };

  const hasSameNameDifferentValues = (row: ProductRow, productsList: Product[]): boolean => {
    if (!row.name || !row.name.trim() || Number(row.purchasePrice) <= 0 || Number(row.mrp) <= 0) return false;
    const nameTrimmed = row.name.trim().toLowerCase();
    const exactMatch = findMatchingProduct(row, productsList);
    if (exactMatch) return false;
    return productsList.some(p => (p.name || '').trim().toLowerCase() === nameTrimmed);
  };

  const handleSelectProductSuggestion = (index: number, selectedProduct: Product) => {
    const updated = [...rows];
    const sName = updated[index].supplierName || selectedProduct.supplierName || commonSupplier || '';
    let sPhone = updated[index].supplierPhone || '';
    if (sName && !sPhone) {
      const matchSup = suppliers.find(s => (s?.name || '').trim().toLowerCase() === (sName || '').trim().toLowerCase());
      if (matchSup && matchSup.phone) {
        sPhone = matchSup.phone;
      }
    }
    const prodMrp = selectedProduct.mrp || 0;
    const prodBuy = selectedProduct.purchasePrice || 0;
    let calcDisc = updated[index].discount !== undefined ? updated[index].discount : defaultDiscount;
    if (prodMrp > 0 && prodBuy > 0 && prodMrp >= prodBuy) {
      calcDisc = Number((((prodMrp - prodBuy) / prodMrp) * 100).toFixed(2));
    } else if (selectedProduct.discount !== undefined) {
      calcDisc = Number(selectedProduct.discount);
    }

    updated[index] = {
      ...updated[index],
      name: selectedProduct.name,
      unit: selectedProduct.unit || 'Strip',
      stockQty: updated[index].stockQty || 0,
      mrp: prodMrp,
      discount: calcDisc,
      purchasePrice: prodBuy,
      gstPercent: selectedProduct.gstPercent !== undefined ? selectedProduct.gstPercent : 12,
      supplierName: sName,
      supplierPhone: sPhone,
    };
    setRows(updated);
    toast.success(`Loaded details for "${selectedProduct.name}"`);

    // Auto focus on Stock Qty input
    setTimeout(() => {
      const stockEl = document.getElementById(`product-stockQty-${index}`);
      if (stockEl) {
        stockEl.focus();
        if ((stockEl as HTMLInputElement).select) {
          (stockEl as HTMLInputElement).select();
        }
      }
    }, 50);
  };

  const focusProductName = (idx: number) => {
    setTimeout(() => {
      const el = document.getElementById(`product-name-${idx}`);
      if (el) {
        el.focus();
        if ((el as HTMLInputElement).select) {
          (el as HTMLInputElement).select();
        }
      }
    }, 60);
  };

  useEffect(() => {
    // Focus the last row's name input when modal opens or new row is added
    if (!isEdit && rows.length > 0) {
      focusProductName(rows.length - 1);
    }
  }, [rows.length, isEdit]);

  useEffect(() => {
    if (isEdit) {
      const el = document.getElementById('edit-product-name');
      if (el) el.focus();
    }
  }, [isEdit]);

  const handleRowKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    const fieldOrder = ['name', 'unit', 'stockQty', 'mrp', 'discount', 'purchasePrice', 'gstPercent'];
    const currentIdx = fieldOrder.indexOf(field);

    // Handle Arrows
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const isSelect = (e.target as HTMLElement).tagName === 'SELECT';
      // If it's a select, ArrowUp/Down should change the value, not move rows, 
      // unless we want to override it. Let's allow native behavior for selects for Up/Down.
      if (isSelect && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return; 
      }

      let nextRow = index;
      let nextColIdx = currentIdx;

      if (e.key === 'ArrowUp') {
        nextRow = Math.max(0, index - 1);
      } else if (e.key === 'ArrowDown') {
        if (index < rows.length - 1) {
          nextRow = index + 1;
        }
      } else if (e.key === 'ArrowLeft') {
        nextColIdx = Math.max(0, currentIdx - 1);
      } else if (e.key === 'ArrowRight') {
        nextColIdx = Math.min(fieldOrder.length - 1, currentIdx + 1);
      }

      if (nextRow !== index || nextColIdx !== currentIdx) {
        e.preventDefault();
        const nextField = fieldOrder[nextColIdx];
        const nextEl = document.getElementById(`product-${nextField}-${nextRow}`);
        if (nextEl) {
          nextEl.focus();
          if ((nextEl as HTMLInputElement).select) {
            (nextEl as HTMLInputElement).select();
          }
        }
        return;
      }
    }

    const isEnter = e.key === 'Enter';
    const isTab = e.key === 'Tab' && !e.shiftKey;

    if (isEnter || (isTab && field === 'gstPercent')) {
      e.preventDefault();
      
      const row = rows[index];
      const isFilled = row.name.trim() !== '' && 
                       row.unit.trim() !== '' &&
                       Number(row.purchasePrice) > 0 &&
                       Number(row.mrp) > 0 &&
                       Number(row.stockQty) > 0 &&
                       Number(row.gstPercent) >= 0;

      if (isEnter && currentIdx < fieldOrder.length - 1) {
        // Move to next field in the same row
        const nextField = fieldOrder[currentIdx + 1];
        const nextEl = document.getElementById(`product-${nextField}-${index}`);
        if (nextEl) {
          nextEl.focus();
          if ((nextEl as HTMLInputElement).select) {
            (nextEl as HTMLInputElement).select();
          }
        }
      } else {
        // Last field (gstPercent) on Enter or Tab: move to product name field of next row
        if (!isFilled) {
          toast.error("Please fill all fields with valid values before moving to the next row");
          return;
        }

        if (index === rows.length - 1) {
          const newIdx = rows.length;
          setRows(prev => [
            ...prev,
            { name: '', unit: 'Strip', stockQty: 0, mrp: 0, discount: defaultDiscount, purchasePrice: 0, gstPercent: defaultGst, supplierName: commonSupplier, supplierPhone: commonSupplierPhone }
          ]);
          focusProductName(newIdx);
        } else {
          focusProductName(index + 1);
        }
      }
    }
  };

  const handleAddRow = () => {
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const isFilled = lastRow.name.trim() !== '' && 
                       lastRow.unit.trim() !== '' &&
                       Number(lastRow.purchasePrice) > 0 &&
                       Number(lastRow.mrp) > 0 &&
                       Number(lastRow.stockQty) > 0 &&
                       Number(lastRow.gstPercent) >= 0;
      if (!isFilled) {
        toast.error("Please fill all fields with valid values before creating a new row");
        return;
      }
    }
    const newIdx = rows.length;
    setRows(prev => [...prev, { name: '', unit: 'Strip', stockQty: 0, mrp: 0, discount: defaultDiscount, purchasePrice: 0, gstPercent: defaultGst, supplierName: commonSupplier, supplierPhone: commonSupplierPhone }]);
    focusProductName(newIdx);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof ProductRow, value: any) => {
    const updated = [...rows];
    const currentRow = { ...updated[index] };

    if (field === 'name' || field === 'unit' || field === 'supplierName' || field === 'supplierPhone') {
      currentRow[field] = value;
    } else if (field === 'mrp') {
      const mrpVal = Math.max(0, Number(value));
      currentRow.mrp = mrpVal;
      // The discount calculated on MRP and the value shows on purchase price
      const disc = currentRow.discount !== undefined ? Number(currentRow.discount) : defaultDiscount;
      currentRow.purchasePrice = mrpVal > 0 ? Number((mrpVal * (1 - disc / 100)).toFixed(2)) : 0;
    } else if (field === 'discount') {
      const discVal = Math.min(Math.max(0, Number(value)), 100);
      currentRow.discount = discVal;
      // Recalculate purchase price based on new discount and current MRP
      if (currentRow.mrp > 0) {
        currentRow.purchasePrice = Number((currentRow.mrp * (1 - discVal / 100)).toFixed(2));
      }
    } else if (field === 'purchasePrice') {
      const buyVal = Math.max(0, Number(value));
      currentRow.purchasePrice = buyVal;
      // If purchase price is manually entered and MRP is present, adjust the discount % to reflect it
      if (currentRow.mrp > 0 && buyVal <= currentRow.mrp) {
        currentRow.discount = Number((((currentRow.mrp - buyVal) / currentRow.mrp) * 100).toFixed(2));
      }
    } else if (field === 'gstPercent') {
      currentRow.gstPercent = Math.min(Math.max(0, Number(value)), 28);
    } else if (field === 'stockQty') {
      currentRow.stockQty = Math.max(0, Number(value));
    }

    updated[index] = currentRow;
    setRows(updated);
  };

  useEffect(() => {
    if (!isEdit) {
      if (initialSupplier) {
        if (initialSupplier.name) setCommonSupplier(initialSupplier.name);
        if (initialSupplier.phone) setCommonSupplierPhone(initialSupplier.phone);
        const { discount: supDiscount } = getSupplierDiscount(initialSupplier.name, suppliers);
        setDefaultDiscount(supDiscount);
        setRows(prev => prev.map(r => {
          const newPrice = r.mrp > 0 ? Number((r.mrp * (1 - supDiscount / 100)).toFixed(2)) : r.purchasePrice;
          return {
            ...r,
            supplierName: initialSupplier.name || r.supplierName,
            supplierPhone: initialSupplier.phone || r.supplierPhone,
            discount: supDiscount,
            purchasePrice: newPrice
          };
        }));
        // Automatically point cursor to Default Discount or GST input
        setTimeout(() => {
          const discEl = document.getElementById('common-supplier-discount-input');
          if (discEl) {
            discEl.focus();
            if ((discEl as HTMLInputElement).select) (discEl as HTMLInputElement).select();
          } else {
            focusProductName(0);
          }
        }, 200);
      } else {
        setTimeout(() => {
          const el = document.getElementById('common-supplier-input');
          if (el) el.focus();
        }, 200);
      }
    }
  }, [isEdit, initialSupplier]);

  const handleSupplierKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const discEl = document.getElementById('common-supplier-discount-input');
      if (discEl) {
        discEl.focus();
        if ((discEl as HTMLInputElement).select) (discEl as HTMLInputElement).select();
      }
    }
  };

  const handleDefaultDiscountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const gstEl = document.getElementById('default-gst-input');
      if (gstEl) {
        gstEl.focus();
        if ((gstEl as HTMLInputElement).select) (gstEl as HTMLInputElement).select();
      }
    }
  };

  const handleDefaultGstKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusProductName(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      toast.error("Database connection not available");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && product?.id) {
        if (!editName.trim() || !editUnit.trim()) {
          toast.error("Product name and unit are required");
          setIsSubmitting(false);
          return;
        }
        if (Number(editPurchasePrice) <= 0 || Number(editMrp) <= 0 || Number(editStockQty) <= 0) {
          toast.error("Purchase Price, MRP, and Stock Qty must be greater than zero");
          setIsSubmitting(false);
          return;
        }
        if (Number(editGstPercent) < 0) {
          toast.error("GST cannot be negative");
          setIsSubmitting(false);
          return;
        }
        if (editSupplierName.trim()) {
          await autoSaveSupplier(editSupplierName, editSupplierPhone, editDiscount);
        }

        const finalMrp = Math.max(Number(editMrp), Number(editPurchasePrice));
        const payload = {
          name: editName,
          unit: editUnit,
          purchasePrice: Number(editPurchasePrice),
          mrp: finalMrp,
          discount: Number(editDiscount || 0),
          gstPercent: Number(editGstPercent),
          stockQty: Number(editStockQty),
          supplierName: editSupplierName,
          genericName: product.genericName || '',
          category: product.category || '',
          manufacturer: product.manufacturer || '',
          hsnCode: product.hsnCode || '',
          reorderLevel: product.reorderLevel || 10,
          rackLocation: product.rackLocation || '',
          updatedAt: Date.now(),
        };
        await setDoc(doc(db, 'products', product.id), payload, { merge: true });
        toast.success('Product updated successfully');
      } else {
        // Validate rows
        for (let i = 0; i < rows.length; i++) {
          if (!rows[i].name.trim() || !rows[i].unit.trim()) {
            toast.error(`Row #${i + 1}: Product Name and Unit are required`);
            setIsSubmitting(false);
            return;
          }
          if (Number(rows[i].purchasePrice) <= 0 || Number(rows[i].mrp) <= 0 || Number(rows[i].stockQty) <= 0) {
            toast.error(`Row #${i + 1}: Purchase Price, MRP, and Stock Qty must be greater than zero`);
            setIsSubmitting(false);
            return;
          }
          if (Number(rows[i].gstPercent) < 0) {
            toast.error(`Row #${i + 1}: GST cannot be negative`);
            setIsSubmitting(false);
            return;
          }
          if (Number(rows[i].mrp) < Number(rows[i].purchasePrice)) {
            rows[i].mrp = rows[i].purchasePrice;
          }
        }

        // Auto-save any new suppliers entered in dialog (common supplier or rows)
        const suppliersMap = new Map<string, string>();
        if (commonSupplier.trim()) {
          suppliersMap.set(commonSupplier.trim(), commonSupplierPhone.trim());
        }
        for (const r of rows) {
          if (r.supplierName && r.supplierName.trim()) {
            const sName = r.supplierName.trim();
            const sPhone = (r.supplierPhone || '').trim();
            if (!suppliersMap.has(sName) || (!suppliersMap.get(sName) && sPhone)) {
              suppliersMap.set(sName, sPhone);
            }
          }
        }

        for (const [sName, sPhone] of suppliersMap.entries()) {
          const supDisc = (sName || '').trim().toLowerCase() === (commonSupplier || '').trim().toLowerCase()
            ? defaultDiscount
            : getSupplierDiscount(sName, suppliers).discount;
          await autoSaveSupplier(sName, sPhone, supDisc, true);
        }

        // Save all rows in loop and track overall purchase
        let totalPurchaseAmount = 0;
        const purchaseItems = [];
        let updatedCount = 0;
        let createdCount = 0;

        // Keep a local pool so if multiple rows reference the same product in this batch,
        // stock additions accumulate correctly
        const currentProductsPool = [...existingProducts];

        for (const row of rows) {
          const itemTotal = Number(row.purchasePrice) * Number(row.stockQty);
          // Calculate item total including GST for authentic financial recording
          const gstAmount = (itemTotal * Number(row.gstPercent)) / 100;
          const itemTotalWithGst = itemTotal + gstAmount;
          
          totalPurchaseAmount += itemTotalWithGst;

          // Check if same product with same values already exists
          const existingMatch = findMatchingProduct(row, currentProductsPool);

          if (existingMatch && existingMatch.id) {
            // Product already exists with the same values: don't make it multiple, update existing
            const addedQty = Number(row.stockQty);
            const currentStock = Number(existingMatch.stockQty || 0);
            const updatedStock = currentStock + addedQty;

            const updatePayload: Partial<Product> = {
              stockQty: updatedStock,
              discount: Number(row.discount !== undefined ? row.discount : defaultDiscount),
              updatedAt: Date.now(),
            };
            if (row.supplierName || commonSupplier) {
              updatePayload.supplierName = row.supplierName || commonSupplier || existingMatch.supplierName;
            }

            await setDoc(doc(db, 'products', existingMatch.id), updatePayload, { merge: true });

            // Update in local pool
            const poolIdx = currentProductsPool.findIndex(p => p.id === existingMatch.id);
            if (poolIdx !== -1) {
              currentProductsPool[poolIdx] = {
                ...currentProductsPool[poolIdx],
                stockQty: updatedStock,
                discount: updatePayload.discount,
                updatedAt: Date.now(),
                supplierName: updatePayload.supplierName || currentProductsPool[poolIdx].supplierName,
              };
            }

            purchaseItems.push({
              productId: existingMatch.id,
              name: existingMatch.name,
              qty: addedQty,
              rate: Number(row.purchasePrice),
              mrp: Number(row.mrp),
              discount: Number(row.discount || 0),
              gstPercent: Number(row.gstPercent)
            });

            updatedCount++;
          } else {
            // New product or same product with different values/pricing variant
            const payload = {
              name: row.name.trim(),
              unit: row.unit || 'Strip',
              purchasePrice: Number(row.purchasePrice),
              mrp: Number(row.mrp),
              discount: Number(row.discount !== undefined ? row.discount : defaultDiscount),
              gstPercent: Number(row.gstPercent),
              stockQty: Number(row.stockQty),
              supplierName: row.supplierName || commonSupplier || '',
              genericName: '',
              category: '',
              manufacturer: '',
              hsnCode: '',
              reorderLevel: 10,
              rackLocation: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            const productRef = await addDoc(collection(db, 'products'), payload);

            currentProductsPool.push({
              id: productRef.id,
              ...payload,
            });

            purchaseItems.push({
              productId: productRef.id,
              name: row.name.trim(),
              qty: Number(row.stockQty),
              rate: Number(row.purchasePrice),
              mrp: Number(row.mrp),
              discount: Number(row.discount || 0),
              gstPercent: Number(row.gstPercent)
            });

            createdCount++;
          }
        }

        // Record the overall purchase in the 'purchases' collection for dashboard stats
        const purchaseRecord = {
          supplierName: commonSupplier || (rows.length > 0 && rows[0].supplierName ? rows[0].supplierName : 'Unknown'),
          items: purchaseItems,
          grandTotal: totalPurchaseAmount,
          date: Date.now(),
          createdBy: 'Staff' 
        };
        await addDoc(collection(db, 'purchases'), purchaseRecord);

        localStorage.removeItem('meditrack_purchase_draft');
        setHasDraft(false);

        if (updatedCount > 0 && createdCount === 0) {
          toast.success(`Updated stock for ${updatedCount} existing product(s) (no duplicates created) & recorded purchase!`);
        } else if (updatedCount > 0 && createdCount > 0) {
          toast.success(`Updated stock for ${updatedCount} existing product(s), added ${createdCount} new product(s), & recorded purchase!`);
        } else {
          toast.success(`Successfully added ${createdCount} product(s) and recorded purchase!`);
        }
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save product(s)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-purchase-btn');
      if (submitBtn) {
        (submitBtn as HTMLButtonElement).click();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className={`bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl w-full ${isEdit ? 'max-w-lg' : 'max-w-[96vw] xl:max-w-7xl max-h-[92vh]'} overflow-hidden flex flex-col border dark:border-slate-700 my-4`}>
        <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit Product' : 'Add Multiple Products (Row-wise)'}</h2>
            {!isEdit && hasDraft && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Draft automatically saved
              </span>
            )}
            {!isEdit && (
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                Press <kbd className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/50 rounded font-mono">Ctrl + Enter</kbd> to save purchase
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEdit && hasDraft && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft} className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400">
                Reset Form
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="p-6 space-y-5 overflow-y-auto flex-1">
          {isEdit ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Product Name</label>
                <Input 
                  id="edit-product-name" 
                  value={editName} 
                  onFocus={(e) => e.target.select()}
                  onChange={e => setEditName(e.target.value)} 
                  placeholder="e.g. Paracetamol 500mg" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Supplier / Vendor</label>
                  <SupplierSuggestionInput
                    id="edit-supplier-name"
                    value={editSupplierName}
                    onChange={val => {
                      setEditSupplierName(val);
                      const matched = suppliers.find(s => (s?.name || '').trim().toLowerCase() === (val || '').trim().toLowerCase());
                      if (matched && matched.phone) setEditSupplierPhone(matched.phone);
                    }}
                    onSelectSupplier={sup => {
                      setEditSupplierName(sup.name);
                      if (sup.phone) setEditSupplierPhone(sup.phone);
                    }}
                    suppliers={suppliers}
                    placeholder="Select or type supplier name..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Supplier Phone</label>
                  <Input 
                    id="edit-supplier-phone" 
                    type="text" 
                    maxLength={10} 
                    value={editSupplierPhone} 
                    onChange={e => setEditSupplierPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    placeholder="10-digit mobile number" 
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Unit</label>
                  <select 
                    value={editUnit} 
                    onChange={e => setEditUnit(e.target.value)} 
                    className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Pics">Pics</option>
                    <option value="Strip">Strip</option>
                    <option value="Box">Box</option>
                    <option value="Bottle">Bottle</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Initial Stock Qty</label>
                  <Input 
                    type="number" 
                    min="0" 
                    value={editStockQty} 
                    onFocus={(e) => e.target.select()}
                    onChange={e => setEditStockQty(Math.max(0, Number(e.target.value)))} 
                    placeholder="0" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">MRP (Selling)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={editMrp} 
                    onFocus={(e) => e.target.select()}
                    onChange={e => {
                      const newMrp = Math.max(0, Number(e.target.value));
                      setEditMrp(newMrp);
                      if (newMrp > 0) {
                        setEditPurchasePrice(Number((newMrp * (1 - editDiscount / 100)).toFixed(2)));
                      }
                    }} 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Discount %</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      value={editDiscount} 
                      onFocus={(e) => e.target.select()}
                      onChange={e => {
                        const newDisc = Math.min(Math.max(0, Number(e.target.value)), 100);
                        setEditDiscount(newDisc);
                        if (editMrp > 0) {
                          setEditPurchasePrice(Number((editMrp * (1 - newDisc / 100)).toFixed(2)));
                        }
                      }} 
                      placeholder="20" 
                      className="pr-6"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Purchase Price</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={editPurchasePrice} 
                    onFocus={(e) => e.target.select()}
                    onChange={e => {
                      const newBuy = Math.max(0, Number(e.target.value));
                      setEditPurchasePrice(newBuy);
                      if (editMrp > 0 && newBuy <= editMrp) {
                        setEditDiscount(Number((((editMrp - newBuy) / editMrp) * 100).toFixed(2)));
                      }
                    }} 
                    placeholder="0.00" 
                    className="bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">GST %</label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="28" 
                    value={editGstPercent} 
                    onFocus={(e) => e.target.select()}
                    onChange={e => setEditGstPercent(Math.min(Math.max(0, Number(e.target.value)), 28))} 
                    placeholder="12" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Common Supplier & Default GST header section */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Supplier Name:
                    </label>
                    <div className="w-52">
                      <SupplierSuggestionInput
                        id="common-supplier-input"
                        value={commonSupplier}
                        onChange={handleCommonSupplierChange}
                        onSelectSupplier={handleSelectCommonSupplier}
                        onKeyDown={handleSupplierKeyDown}
                        suppliers={suppliers}
                        placeholder="Select or type supplier..."
                        className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Supplier Phone:
                    </label>
                    <div className="w-36">
                      <Input
                        id="common-supplier-phone-input"
                        type="text"
                        maxLength={10}
                        value={commonSupplierPhone}
                        onChange={e => handleCommonSupplierPhoneChange(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const discEl = document.getElementById('common-supplier-discount-input');
                            if (discEl) {
                              discEl.focus();
                              if ((discEl as HTMLInputElement).select) (discEl as HTMLInputElement).select();
                            }
                          }
                        }}
                        placeholder="10-digit mobile"
                        className="h-9 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1">
                      <span>Default Discount:</span>
                    </label>
                    <div className="relative w-24">
                      <Input
                        id="common-supplier-discount-input"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={defaultDiscount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleDefaultDiscountChange(Number(e.target.value))}
                        onKeyDown={handleDefaultDiscountKeyDown}
                        className="h-9 text-sm pr-6 font-semibold"
                        placeholder="20"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                    </div>
                    {commonSupplier.trim() ? (
                      <span 
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                          getSupplierDiscount(commonSupplier, suppliers).isSupplierSpecific
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 shadow-2xs'
                            : 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800'
                        }`}
                        title={getSupplierDiscount(commonSupplier, suppliers).isSupplierSpecific
                          ? `Saved default discount for ${commonSupplier} only`
                          : `Edit this value to set the permanent default discount for ${commonSupplier} only`}
                      >
                        {getSupplierDiscount(commonSupplier, suppliers).isSupplierSpecific ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Default for <strong>{commonSupplier}</strong>: {defaultDiscount}%</span>
                          </>
                        ) : (
                          <span>Sets default for <strong>{commonSupplier}</strong></span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        Global default ({defaultDiscount}%)
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500 dark:text-slate-400 hidden lg:inline">
                    {commonSupplier ? `(Saved per supplier; auto-fills rows)` : '(Optional quick auto-fill)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Default GST %:</label>
                  <Input
                    id="default-gst-input"
                    type="number"
                    min="0"
                    max="28"
                    value={defaultGst}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleDefaultGstChange(Number(e.target.value))}
                    onKeyDown={handleDefaultGstKeyDown}
                    className="w-20 h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Fill in product details. Discount is calculated on MRP to automatically set Purchase Price. Custom discounts are remembered per supplier. Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">Enter</kbd> to advance fields.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddRow} className="flex items-center gap-1.5 shrink-0">
                  <Plus className="w-4 h-4" /> Add Row
                </Button>
              </div>

              <div className="border dark:border-slate-700 rounded-lg overflow-x-auto min-h-[350px] pb-64">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide border-b-2 border-slate-300 dark:border-slate-700 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="p-3 min-w-[200px] text-center">Product Name *</th>
                      <th className="p-3 w-[100px] text-center">Unit</th>
                      <th className="p-3 w-[90px] text-center">Stock Qty</th>
                      <th className="p-3 w-[110px] text-center">MRP</th>
                      <th className="p-3 w-[100px] text-center">Discount %</th>
                      <th className="p-3 w-[115px] text-center">Purchase Price</th>
                      <th className="p-3 w-[85px] text-center">GST %</th>
                      <th className="p-3 w-[110px] text-center">Amount</th>
                      <th className="p-3 w-[50px] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {rows.map((row, index) => {
                      const existingMatch = findMatchingProduct(row, existingProducts);
                      const hasDifferentRates = !existingMatch && hasSameNameDifferentValues(row, existingProducts);

                      return (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="p-2">
                          <ProductSuggestionInput
                            id={`product-name-${index}`}
                            value={row.name}
                            onChange={val => handleRowChange(index, 'name', val)}
                            onSelectProduct={selectedProd => handleSelectProductSuggestion(index, selectedProd)}
                            onKeyDown={e => handleRowKeyDown(e, index, 'name')}
                            products={existingProducts}
                            placeholder="Type or select product..."
                          />
                          {existingMatch && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>
                                Matches existing (Stock: {existingMatch.stockQty} &rarr; Will update to <strong>{Number(existingMatch.stockQty || 0) + Number(row.stockQty || 0)}</strong>)
                              </span>
                            </div>
                          )}
                          {hasDifferentRates && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span>Different rates (Will save as new price variant)</span>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <select 
                            id={`product-unit-${index}`}
                            value={row.unit} 
                            onChange={e => handleRowChange(index, 'unit', e.target.value)} 
                            onKeyDown={e => handleRowKeyDown(e, index, 'unit')}
                            className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="Pics">Pics</option>
                            <option value="Strip">Strip</option>
                            <option value="Box">Box</option>
                            <option value="Bottle">Bottle</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <Input 
                            id={`product-stockQty-${index}`}
                            type="number" 
                            min="0" 
                            value={row.stockQty} 
                            onFocus={(e) => e.target.select()}
                            onChange={e => handleRowChange(index, 'stockQty', e.target.value)} 
                            onKeyDown={e => handleRowKeyDown(e, index, 'stockQty')}
                            placeholder="0" 
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            id={`product-mrp-${index}`}
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={row.mrp} 
                            onFocus={(e) => e.target.select()}
                            onChange={e => handleRowChange(index, 'mrp', e.target.value)} 
                            onKeyDown={e => handleRowKeyDown(e, index, 'mrp')}
                            placeholder="0.00" 
                          />
                        </td>
                        <td className="p-2">
                          <div className="relative">
                            <Input 
                              id={`product-discount-${index}`}
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="100"
                              value={row.discount !== undefined ? row.discount : defaultDiscount} 
                              onFocus={(e) => e.target.select()}
                              onChange={e => handleRowChange(index, 'discount', e.target.value)} 
                              onKeyDown={e => handleRowKeyDown(e, index, 'discount')}
                              placeholder="20" 
                              className="pr-6 font-semibold"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <Input 
                            id={`product-purchasePrice-${index}`}
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={row.purchasePrice} 
                            onFocus={(e) => e.target.select()}
                            onChange={e => handleRowChange(index, 'purchasePrice', e.target.value)} 
                            onKeyDown={e => handleRowKeyDown(e, index, 'purchasePrice')}
                            placeholder="0.00" 
                            className="bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            id={`product-gstPercent-${index}`}
                            type="number" 
                            min="0" 
                            max="28" 
                            value={row.gstPercent} 
                            onFocus={(e) => e.target.select()}
                            onChange={e => handleRowChange(index, 'gstPercent', e.target.value)} 
                            onKeyDown={e => handleRowKeyDown(e, index, 'gstPercent')}
                            placeholder="12" 
                          />
                        </td>
                        <td className="p-2 text-center font-medium">
                          ₹{((Number(row.purchasePrice) || 0) * (Number(row.stockQty) || 0)).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveRow(index)}
                            disabled={rows.length === 1}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (hasDraft) {
                  handleClearDraft();
                }
                onClose();
              }}
            >
              Cancel & Discard
            </Button>
            <Button 
              id="submit-purchase-btn" 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-5 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update Product' : `Save ${rows.length} Product(s)`)}
            </Button>
          </div>
        </form>

        {valuesModalProduct && (
          <ProductValuesModal
            productName={valuesModalProduct}
            allProducts={existingProducts}
            onClose={() => setValuesModalProduct(null)}
          />
        )}
      </div>
    </div>
  );
}
