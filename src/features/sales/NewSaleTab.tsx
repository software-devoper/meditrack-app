import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, runTransaction, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product, SalesItem, Customer, Doctor, PatientDoctor } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '../../components/ui';
import { 
  ShoppingCart, Search, User as UserIcon, Trash2, Printer, Plus, Minus, 
  FileText, CheckCircle, CheckCircle2, AlertTriangle, CreditCard, Banknote, QrCode, RefreshCw, X, Eye, Stethoscope, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { CustomerAutocomplete } from './CustomerAutocomplete';
import { ProductAutocomplete } from './ProductAutocomplete';
import { DoctorAutocomplete } from './DoctorAutocomplete';
import { PatientDoctorSelectModal } from './PatientDoctorSelectModal';
import { NewCustomerDoctorModal } from './NewCustomerDoctorModal';
import { useAlertModal } from '../../context/AlertModalContext';

interface SaleRow {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  purchasePrice: number;
  gstPercent: number;
  discount: number;
  maxQty: number;
  unit: string;
  isCustom?: boolean;
}

export function NewSaleTab({ onPrint }: { onPrint?: (sale: any) => void }) {
  const { user } = useAuthStore();
  const { confirm, alert: showAlert } = useAlertModal();
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<SaleRow[]>([
    { productId: '', name: '', qty: 1, rate: 0, purchasePrice: 0, gstPercent: 12, discount: 0, maxQty: 0, unit: 'Strip' }
  ]);
  
  // Customer & Prescription details
  const [customerName, setCustomerName] = useState('');
  const [billTo, setBillTo] = useState('');
  const [isBillToCustomized, setIsBillToCustomized] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  
  // Payment details
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI'>('Cash');
  const [flatDiscount, setFlatDiscount] = useState<string>('');
  const [percentDiscount, setPercentDiscount] = useState<string>('');
  const [discountActiveSource, setDiscountActiveSource] = useState<'flat' | 'percent'>('flat');
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [isRoundOff, setIsRoundOff] = useState<boolean>(true);
  
  // Modals & Status
  const location = useLocation();
  const [invoiceNo, setInvoiceNo] = useState("HCP-0");
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [salesCustomers, setSalesCustomers] = useState<Customer[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Customer | null>(null);
  const [isDoctorSelectModalOpen, setIsDoctorSelectModalOpen] = useState(false);
  const [isNewCustomerDoctorModalOpen, setIsNewCustomerDoctorModalOpen] = useState(false);
  const [hasPromptedNewCustomerDoctorFor, setHasPromptedNewCustomerDoctorFor] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('meditrack_sale_draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.customerName !== undefined) setCustomerName(data.customerName);
        if (data.billTo !== undefined) setBillTo(data.billTo);
        if (data.isBillToCustomized !== undefined) setIsBillToCustomized(data.isBillToCustomized);
        if (data.customerPhone !== undefined) setCustomerPhone(data.customerPhone);
        if (data.customerAddress !== undefined) setCustomerAddress(data.customerAddress);
        if (data.doctorName !== undefined) setDoctorName(data.doctorName);
        if (data.doctorPhone !== undefined) setDoctorPhone(data.doctorPhone);
        if (data.doctorAddress !== undefined) setDoctorAddress(data.doctorAddress);
        if (data.paymentMode) setPaymentMode(data.paymentMode);
        if (data.flatDiscount !== undefined) setFlatDiscount(data.flatDiscount);
        if (data.percentDiscount !== undefined) setPercentDiscount(data.percentDiscount);
        if (data.discountActiveSource) setDiscountActiveSource(data.discountActiveSource);
        // Fallback for legacy draft formats
        if (data.flatDiscount === undefined && data.discountInput !== undefined) {
          if (data.discountType === 'percent') {
            setPercentDiscount(String(data.discountInput));
            setDiscountActiveSource('percent');
          } else {
            setFlatDiscount(String(data.discountInput));
            setDiscountActiveSource('flat');
          }
        }
        if (Array.isArray(data.rows) && data.rows.length > 0) setRows(data.rows);
        setHasDraft(true);
      } catch (e) {
        console.error("Failed to load saved draft", e);
      }
    }
  }, []);

  // Auto-save draft automatically whenever any field changes
  useEffect(() => {
    const hasData = rows.some(r => (r.productId && r.qty > 0) || r.name.trim()) || 
                    customerName.trim() || 
                    customerPhone.trim() || 
                    doctorName.trim() ||
                    flatDiscount ||
                    percentDiscount;
    if (hasData) {
      const draftData = {
        customerName,
        billTo,
        isBillToCustomized,
        customerPhone,
        customerAddress,
        doctorName,
        doctorPhone,
        doctorAddress,
        paymentMode,
        flatDiscount,
        percentDiscount,
        discountActiveSource,
        rows,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      localStorage.setItem('meditrack_sale_draft', JSON.stringify(draftData));
      setHasDraft(true);
    }
  }, [customerName, billTo, isBillToCustomized, customerPhone, customerAddress, doctorName, doctorPhone, doctorAddress, paymentMode, flatDiscount, percentDiscount, discountActiveSource, rows]);

  useEffect(() => {
    if (!db) return;
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(list);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Customer;
        if (data.type === 'sale') list.push({ id: doc.id, ...data });
      });
      setSalesCustomers(list);
    });

    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const list: Doctor[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Doctor);
      });
      setDoctors(list);
    });

    const unsubSales = onSnapshot(doc(db, 'metadata', 'salesCounter'), (docSnap) => {
      if (docSnap.exists()) {
        const current = docSnap.data().current || 0;
        setInvoiceNo(`HCP-${current + 1}`);
      } else {
        setInvoiceNo(`HCP-1`);
      }
    });

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubDoctors();
      unsubSales();
    };
  }, []);

  const applyPatientInfo = (patient: Customer) => {
    setSelectedPatient(patient);
    setCustomerName(patient.name);
    if (!isBillToCustomized) {
      setBillTo(patient.name);
    }
    // Always overwrite with new patient's actual data or clear if empty
    setCustomerPhone(patient.phone || '');
    setCustomerAddress(patient.address || '');

    const patDoctors = patient.doctors || [];
    if (patDoctors.length === 1) {
      // Single doctor associated with this patient: auto-fill doctor name, phone, address
      const doc = patDoctors[0];
      setDoctorName(doc.name);
      setDoctorPhone(doc.phone || '');
      setDoctorAddress(doc.address || '');
      toast.success(`Patient "${patient.name}" selected. Doctor "${doc.name}" auto-filled.`);
      setTimeout(() => {
        const payEl = document.getElementById('payment-mode-select');
        if (payEl) {
          payEl.focus();
        }
      }, 200);
    } else if (patDoctors.length > 1) {
      // Multiple doctors: reset doctor fields and trigger dialog box so client can choose
      setDoctorName('');
      setDoctorPhone('');
      setDoctorAddress('');
      setIsDoctorSelectModalOpen(true);
    } else {
      setDoctorName('');
      setDoctorPhone('');
      setDoctorAddress('');
      setTimeout(() => {
        const payEl = document.getElementById('payment-mode-select');
        if (payEl) {
          payEl.focus();
        }
      }, 200);
    }
  };

  useEffect(() => {
    if (location.state?.patient) {
      const p = location.state.patient as Customer;
      applyPatientInfo(p);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (!isBillToCustomized) {
      setBillTo(val);
    }
    const trimmed = val.trim();
    if (!trimmed) {
      setSelectedPatient(null);
      setCustomerPhone('');
      setCustomerAddress('');
      setDoctorName('');
      setDoctorPhone('');
      setDoctorAddress('');
      return;
    }

    const existing = salesCustomers.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      applyPatientInfo(existing);
    } else {
      // Patient name changed away from previously selected patient:
      // Clear all related fields so old patient info is not held!
      setSelectedPatient(null);
      setCustomerPhone('');
      setCustomerAddress('');
      setDoctorName('');
      setDoctorPhone('');
      setDoctorAddress('');
    }
  };

  const handleCustomerPhoneChange = (val: string) => {
    setCustomerPhone(val);
    if (val.length === 10) {
      const existing = salesCustomers.find(c => c.phone === val.trim());
      if (existing) {
        applyPatientInfo(existing);
      }
    }
  };

  const handleAddRow = () => {
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const isFilled = lastRow.isCustom
        ? (lastRow.name.trim() && lastRow.qty > 0 && lastRow.rate > 0)
        : (lastRow.productId && lastRow.qty > 0 && lastRow.rate > 0);
      if (!isFilled) {
        toast.error("Please fill all required fields in the current row before adding a new one");
        return;
      }
    }
    setRows([
      ...rows,
      { productId: '', name: '', qty: 1, rate: 0, purchasePrice: 0, gstPercent: 12, discount: 0, maxQty: 0, unit: 'Strip', isCustom: false }
    ]);
  };

  const handleAddCustomRow = () => {
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const isFilled = lastRow.isCustom
        ? (lastRow.name.trim() && lastRow.qty > 0 && lastRow.rate > 0)
        : (lastRow.productId && lastRow.qty > 0 && lastRow.rate > 0);
      if (!isFilled && (lastRow.productId || lastRow.name.trim())) {
        toast.error("Please fill all required fields in the current row first");
        return;
      }
    }

    const customId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRow: SaleRow = {
      productId: customId,
      name: '',
      qty: 1,
      rate: 0,
      purchasePrice: 0,
      gstPercent: 12,
      discount: 0,
      maxQty: 999999,
      unit: 'Piece',
      isCustom: true
    };

    // If the only row is empty, replace it, otherwise append
    if (rows.length === 1 && !rows[0].productId && !rows[0].name.trim() && !rows[0].isCustom) {
      setRows([newRow]);
    } else {
      setRows([...rows, newRow]);
    }

    setTimeout(() => {
      const nameInput = document.getElementById(`grid-input-${rows.length === 1 && !rows[0].productId && !rows[0].name.trim() ? 0 : rows.length}-custom-name`);
      if (nameInput) nameInput.focus();
    }, 80);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ productId: '', name: '', qty: 1, rate: 0, purchasePrice: 0, gstPercent: 12, discount: 0, maxQty: 0, unit: 'Strip', isCustom: false }]);
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stockQty <= 0) {
      toast.error(`${product.name} is out of stock!`);
      return;
    }

    const existingIndex = rows.findIndex((r, i) => i !== index && r.productId === productId);
    if (existingIndex !== -1) {
      toast.error(`${product.name} is already added in another row.`);
      return;
    }

    const updated = [...rows];
    updated[index] = {
      productId: product.id,
      name: product.name,
      qty: 1,
      rate: product.mrp,
      purchasePrice: product.purchasePrice || 0,
      gstPercent: product.gstPercent || 12,
      discount: 0,
      maxQty: product.stockQty,
      unit: product.unit || 'Strip',
      isCustom: false
    };
    setRows(updated);
  };

  const handleSelectCustomProduct = (index: number, customName: string) => {
    const name = customName.trim();
    if (!name) return;

    const updated = [...rows];
    const customId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    updated[index] = {
      productId: customId,
      name: name,
      qty: 1,
      rate: 0,
      purchasePrice: 0,
      gstPercent: 12,
      discount: 0,
      maxQty: 999999,
      unit: 'Piece',
      isCustom: true
    };
    setRows(updated);

    toast.info(`Added "${name}" as custom sales-only item (bypasses stock & profit).`);

    setTimeout(() => {
      const rateInput = document.getElementById(`grid-input-${index}-3`);
      if (rateInput) {
        rateInput.focus();
        if ((rateInput as HTMLInputElement).select) (rateInput as HTMLInputElement).select();
      }
    }, 80);
  };

  const handleRowChange = (index: number, field: keyof SaleRow, value: any) => {
    const updated = [...rows];
    const currentRow = updated[index];

    if (field === 'qty') {
      const val = Math.max(1, Number(value));
      if (!currentRow.isCustom && currentRow.maxQty > 0 && val > currentRow.maxQty) {
        toast.error(`Cannot exceed stock quantity (${currentRow.maxQty})`);
        return;
      }
      currentRow.qty = val;
    } else if (field === 'rate') {
      // Editable for custom items
      currentRow.rate = Math.max(0, Number(value));
    } else if (field === 'discount') {
      const val = Math.max(0, Number(value));
      if (val > 100) return;
      currentRow.discount = val;
    } else if (field === 'name') {
      currentRow.name = String(value);
    } else if (field === 'unit') {
      currentRow.unit = String(value);
    } else if (field === 'gstPercent') {
      currentRow.gstPercent = Math.max(0, Number(value));
    }
    setRows(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
      const isSelect = (e.target as HTMLElement).tagName === 'SELECT';
      if (isSelect && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return; // Native select behavior
      }
      
      let nextRow = rowIndex;
      let nextCol = colIndex;
      const row = rows[rowIndex];
      if (!row) return;
      
      const isRowCustom = !!(row.isCustom || (row.productId && row.productId.startsWith('custom_')));
      
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab backwards
          if (colIndex === 4) { // Discount
            e.preventDefault();
            if (isRowCustom) {
              nextCol = 3; // go back to Rate/MRP for custom products
            } else {
              nextCol = 1; // skip MRP (3) and Purchase Price (2) back to Qty
            }
          } else if (colIndex === 3) {
            e.preventDefault();
            nextCol = 1; // go back to Qty from Rate
          } else if (colIndex === 1) {
            e.preventDefault();
            nextCol = 0; // back to product
          } else if (colIndex === 0 && rowIndex > 0) {
            e.preventDefault();
            nextRow = rowIndex - 1;
            nextCol = 4; // previous row's discount
          } else {
            return; // let native focus exit backwards
          }
        } else {
          // Tab forwards
          if (colIndex === 0) {
            e.preventDefault();
            nextCol = 1; // go to Qty
          } else if (colIndex === 1) {
            e.preventDefault();
            if (isRowCustom) {
              nextCol = 3; // go to Rate/MRP for custom items
            } else {
              nextCol = 4; // skip non-editable Purchase Price (2) and MRP (3) directly to Discount
            }
          } else if (colIndex === 3) {
            e.preventDefault();
            nextCol = 4; // go to Discount from Rate
          } else if (colIndex === 4) {
            e.preventDefault();
            const isFilled = isRowCustom
              ? (row.name.trim() && row.qty > 0 && row.rate > 0)
              : (row.productId && row.qty > 0);
            if (!isFilled) {
              toast.error("Please fill all required fields in the current row before adding a new one");
              return;
            }
            if (rowIndex === rows.length - 1) {
              if (isRowCustom) {
                handleAddCustomRow();
              } else {
                handleAddRow();
              }
              setTimeout(() => {
                const nextEl = document.getElementById(`grid-input-${rowIndex + 1}-0`) as HTMLInputElement | null;
                if (nextEl) {
                  nextEl.focus();
                  if (nextEl.select) nextEl.select();
                }
              }, 80);
              return;
            } else {
              nextRow = rowIndex + 1;
              nextCol = 0;
            }
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isRowCustom) {
          if (colIndex === 0) {
            nextCol = 1; // From custom Name -> Qty
          } else if (colIndex === 1) {
            nextCol = 3; // From Qty -> Rate (MRP)
          } else if (colIndex === 3) {
            nextCol = 4; // From Rate -> Discount
          } else {
            // From Discount -> next row or add row
            const isFilled = row.name.trim() && row.qty > 0 && row.rate > 0;
            if (!isFilled) {
              toast.error("Please fill all required fields in the current row before adding a new one");
              return;
            }
            if (rowIndex === rows.length - 1) {
              handleAddCustomRow();
              setTimeout(() => {
                const nextEl = document.getElementById(`grid-input-${rowIndex + 1}-0`) as HTMLInputElement | null;
                if (nextEl) {
                  nextEl.focus();
                  if (nextEl.select) nextEl.select();
                }
              }, 80);
              return;
            } else {
              nextRow = rowIndex + 1;
              nextCol = 0;
            }
          }
        } else {
          if (colIndex === 0) {
            nextCol = 1;
          } else if (colIndex === 1) {
            nextCol = 4; // skip non-editable Purchase Price (2) and MRP (3) directly to Discount
          } else {
            // At the last editable column (discount)
            if (!row.productId || row.qty <= 0) {
              toast.error("Please fill all required fields in the current row before adding a new one");
              return;
            }
            if (rowIndex === rows.length - 1) {
              handleAddRow();
              setTimeout(() => {
                const nextEl = document.getElementById(`grid-input-${rowIndex + 1}-0`) as HTMLInputElement | null;
                if (nextEl) {
                  nextEl.focus();
                  if (nextEl.select) nextEl.select();
                }
              }, 80);
              return;
            } else {
              nextRow = rowIndex + 1;
              nextCol = 0;
            }
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextRow = Math.max(0, rowIndex - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          nextRow = rowIndex + 1;
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (colIndex === 4) {
          nextCol = isRowCustom ? 3 : 1;
        } else if (colIndex === 3) {
          nextCol = 1;
        } else if (colIndex === 1) {
          nextCol = 0;
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (colIndex === 0) {
          nextCol = 1;
        } else if (colIndex === 1) {
          nextCol = isRowCustom ? 3 : 4;
        } else if (colIndex === 3) {
          nextCol = 4;
        }
      }
      
      const nextEl = document.getElementById(`grid-input-${nextRow}-${nextCol}`) as HTMLInputElement | null;
      if (nextEl) {
        nextEl.focus();
        if (nextEl.select) {
          nextEl.select();
        }
      }
    }
  };

  // Calculations
  const subtotal = rows.reduce((acc, item) => {
    if (!item.productId && !item.isCustom) return acc;
    if (item.isCustom && (!item.name.trim() || item.rate <= 0)) return acc;
    const itemTotal = item.qty * item.rate;
    const discountedItemTotal = itemTotal * (1 - (item.discount || 0) / 100);
    const base = discountedItemTotal / (1 + item.gstPercent / 100);
    return acc + base;
  }, 0);

  const gstTotal = rows.reduce((acc, item) => {
    if (!item.productId && !item.isCustom) return acc;
    if (item.isCustom && (!item.name.trim() || item.rate <= 0)) return acc;
    const itemTotal = item.qty * item.rate;
    const discountedItemTotal = itemTotal * (1 - (item.discount || 0) / 100);
    const base = discountedItemTotal / (1 + item.gstPercent / 100);
    return acc + (discountedItemTotal - base);
  }, 0);

  const rawGrandTotal = subtotal + gstTotal;

  // Real-time synchronization between flat (₹) and percentage (%) discounts
  const handleFlatDiscountChange = (valStr: string) => {
    setDiscountActiveSource('flat');
    setFlatDiscount(valStr);
    const num = parseFloat(valStr);
    if (!valStr || isNaN(num) || num <= 0) {
      setPercentDiscount('');
    } else if (rawGrandTotal > 0) {
      const pct = Math.min(100, (num / rawGrandTotal) * 100);
      setPercentDiscount(pct % 1 === 0 ? pct.toString() : parseFloat(pct.toFixed(2)).toString());
    } else {
      setPercentDiscount('');
    }
  };

  const handlePercentDiscountChange = (valStr: string) => {
    setDiscountActiveSource('percent');
    let num = parseFloat(valStr);
    if (num > 100) {
      num = 100;
      valStr = '100';
    }
    setPercentDiscount(valStr);
    if (!valStr || isNaN(num) || num <= 0) {
      setFlatDiscount('');
    } else if (rawGrandTotal > 0) {
      const flat = (rawGrandTotal * num) / 100;
      setFlatDiscount(flat % 1 === 0 ? flat.toString() : parseFloat(flat.toFixed(2)).toString());
    } else {
      setFlatDiscount('');
    }
  };

  // Re-synchronize when products change rawGrandTotal
  useEffect(() => {
    if (discountActiveSource === 'percent' && percentDiscount) {
      const pct = parseFloat(percentDiscount);
      if (!isNaN(pct) && pct > 0) {
        if (rawGrandTotal > 0) {
          const flat = (rawGrandTotal * pct) / 100;
          setFlatDiscount(flat % 1 === 0 ? flat.toString() : parseFloat(flat.toFixed(2)).toString());
        } else {
          setFlatDiscount('');
        }
      }
    } else if (discountActiveSource === 'flat' && flatDiscount) {
      const flat = parseFloat(flatDiscount);
      if (!isNaN(flat) && flat > 0) {
        if (rawGrandTotal > 0) {
          const pct = Math.min(100, (flat / rawGrandTotal) * 100);
          setPercentDiscount(pct % 1 === 0 ? pct.toString() : parseFloat(pct.toFixed(2)).toString());
        } else {
          setPercentDiscount('');
        }
      }
    }
  }, [rawGrandTotal]);

  const billDiscount = discountActiveSource === 'percent'
    ? (percentDiscount && rawGrandTotal > 0 ? Math.min(rawGrandTotal, (rawGrandTotal * (parseFloat(percentDiscount) || 0)) / 100) : 0)
    : (flatDiscount ? Math.min(rawGrandTotal, Math.max(0, parseFloat(flatDiscount) || 0)) : 0);

  const netTotal = Math.max(0, rawGrandTotal - (billDiscount || 0));
  const roundOffAmount = isRoundOff ? Math.round(netTotal) - netTotal : 0;
  const grandTotal = netTotal + roundOffAmount;
  const amountPaid = grandTotal;
  const changeDue = 0;

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem('meditrack_sale_draft');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.customerName !== undefined) setCustomerName(data.customerName);
      if (data.billTo !== undefined) setBillTo(data.billTo);
      if (data.isBillToCustomized !== undefined) setIsBillToCustomized(data.isBillToCustomized);
      if (data.customerPhone !== undefined) setCustomerPhone(data.customerPhone);
      if (data.customerAddress !== undefined) setCustomerAddress(data.customerAddress);
      if (data.doctorName !== undefined) setDoctorName(data.doctorName);
      if (data.doctorPhone !== undefined) setDoctorPhone(data.doctorPhone);
      if (data.doctorAddress !== undefined) setDoctorAddress(data.doctorAddress);
      if (data.paymentMode) setPaymentMode(data.paymentMode);
      if (data.flatDiscount !== undefined) setFlatDiscount(data.flatDiscount);
      if (data.percentDiscount !== undefined) setPercentDiscount(data.percentDiscount);
      if (data.discountActiveSource) setDiscountActiveSource(data.discountActiveSource);
      if (data.flatDiscount === undefined && data.discountInput !== undefined) {
        if (data.discountType === 'percent') {
          setPercentDiscount(String(data.discountInput));
          setDiscountActiveSource('percent');
        } else {
          setFlatDiscount(String(data.discountInput));
          setDiscountActiveSource('flat');
        }
      }
      if (Array.isArray(data.rows) && data.rows.length > 0) setRows(data.rows);
      toast.success(`Draft restored (saved at ${data.savedAt || 'earlier'})`);
    } catch (e) {
      toast.error('Failed to load draft');
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('meditrack_sale_draft');
    setHasDraft(false);
    toast.info('Saved draft removed');
  };

  const handleCancelSale = async () => {
    try {
      const hasData = rows.some(r => r.productId && r.productId !== '') || 
                      customerName.trim() !== '' || 
                      customerPhone.trim() !== '' || 
                      flatDiscount !== '' || 
                      percentDiscount !== '';

      if (hasData) {
        const isConfirmed = await confirm({
          title: "Cancel & Reset Current Bill?",
          message: "All entered prescription items, customer info, and applied discounts on this active bill will be discarded.",
          confirmText: "Yes, Reset Bill",
          cancelText: "Keep Billing",
          variant: "warning",
          eyebrow: "DISCARD DRAFT"
        });
        if (!isConfirmed) {
          return;
        }
      }

      // Reset all billing states
      setRows([{ productId: '', name: '', qty: 1, rate: 0, purchasePrice: 0, gstPercent: 12, discount: 0, maxQty: 0, unit: 'Strip' }]);
      setCustomerName('');
      setBillTo('');
      setIsBillToCustomized(false);
      setCustomerPhone('');
      setCustomerAddress('');
      setDoctorName('');
      setDoctorPhone('');
      setDoctorAddress('');
      setFlatDiscount('');
      setPercentDiscount('');
      setDiscountActiveSource('flat');
      setSelectedPatient(null);
      setIsRoundOff(true);
      
      // Clear persistence
      localStorage.removeItem('meditrack_sale_draft');
      setHasDraft(false);
      
      toast.success('Sale cancelled and bill cleared');
    } catch (error) {
      console.error("Error cancelling sale:", error);
      toast.error("Failed to cancel sale properly");
    }
  };

  const isBillReady = rows.some(r => ((r.productId && r.productId !== '') || r.isCustom) && r.name.trim() && r.qty > 0 && r.rate > 0) &&
    customerPhone.trim().length === 10 &&
    /^\d{10}$/.test(customerPhone.trim());

  const handleCheckoutClick = () => {
    const validRows = rows.filter(r => ((r.productId && r.productId !== '') || r.isCustom) && r.name.trim() && r.qty > 0 && r.rate > 0);
    if (validRows.length === 0) {
      toast.error('Please select or add at least one product with valid quantity and price');
      return;
    }
    const incompleteCustom = rows.find(r => r.isCustom && (!r.name.trim() || r.rate <= 0));
    if (incompleteCustom) {
      toast.error('Please provide both product name and selling price for custom items');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length !== 10 || !/^\d{10}$/.test(customerPhone.trim())) {
      toast.error('Patient phone number must be exactly 10 digits');
      return;
    }
    setShowInvoicePreview(true);
    setTimeout(() => {
      const confirmBtn = document.getElementById('confirm-print-invoice-btn');
      if (confirmBtn) confirmBtn.focus();
    }, 50);
  };

  const confirmCheckout = async () => {
    const validRows = rows.filter(r => ((r.productId && r.productId !== '') || r.isCustom) && r.name.trim() && r.qty > 0 && r.rate > 0);
    if (validRows.length === 0 || !db || !user) return;

    setIsProcessing(true);
    try {
      const resolvedCustomerAddress = customerAddress.trim() || 
        salesCustomers.find(c => (customerPhone && c.phone === customerPhone) || (customerName && c.name.toLowerCase() === customerName.toLowerCase()))?.address || 
        '';

      const isDoctorSkipped = !doctorName || 
        doctorName.trim() === '' || 
        doctorName.trim().toUpperCase() === 'N/A' || 
        doctorName.trim().toLowerCase() === 'self';

      const processedItems = validRows.map(({ maxQty, ...rest }) => ({
        ...rest,
        productId: rest.productId || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        isCustom: !!rest.isCustom
      }));

      const salePayload = {
        invoiceNo,
        billTo: billTo.trim() || customerName.trim() || 'Walk-in Patient',
        patientName: customerName.trim() || 'Walk-in Patient',
        customerName: customerName.trim() || 'Walk-in Patient',
        patientPhone: customerPhone.trim(),
        customerPhone: customerPhone.trim(),
        patientAddress: resolvedCustomerAddress || 'N/A',
        customerAddress: resolvedCustomerAddress || 'N/A',
        doctorName: isDoctorSkipped ? 'N/A' : doctorName.trim(),
        doctorPhone: isDoctorSkipped ? 'N/A' : (doctorPhone.trim() || 'N/A'),
        doctorAddress: isDoctorSkipped ? 'N/A' : (doctorAddress.trim() || 'N/A'),
        items: processedItems,
        subtotal,
        discountTotal: billDiscount,
        discountType: discountActiveSource === 'percent' ? 'percent' : 'amount',
        discountValue: discountActiveSource === 'percent' ? (parseFloat(percentDiscount) || 0) : (parseFloat(flatDiscount) || 0),
        billNotes: '',
        gstTotal,
        roundOff: roundOffAmount,
        grandTotal,
        amountPaid: amountPaid || grandTotal,
        changeDue: changeDue > 0 ? changeDue : 0,
        paymentMode,
        date: Date.now(),
        createdBy: user.username,
        status: "completed"
      };

      await runTransaction(db, async (transaction) => {
        // 1. ALL READS FIRST (Skip custom sales-only items)
        const productDataMap: { [key: string]: { currentQty: number; name: string } } = {};

        for (const item of processedItems) {
          if (item.isCustom || (item.productId && item.productId.startsWith('custom_'))) {
            continue; // Custom products have no stock record in products table
          }
          const productRef = doc(db!, 'products', item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw new Error(`Product not found: ${item.name}`);
          }
          const currentQty = productDoc.data().stockQty;
          if (currentQty < item.qty) {
            throw new Error(`Insufficient stock for ${item.name}. Available: ${currentQty}, Requested: ${item.qty}`);
          }
          productDataMap[item.productId] = { currentQty, name: item.name };
        }

        const counterRef = doc(db!, 'metadata', 'salesCounter');
        const counterDoc = await transaction.get(counterRef);
        let nextInvoiceNum = 1;
        if (counterDoc.exists()) {
          nextInvoiceNum = (counterDoc.data().current || 0) + 1;
        }
        const finalInvoiceNo = `HCP-${nextInvoiceNum}`;
        salePayload.invoiceNo = finalInvoiceNo;

        // 2. ALL WRITES AFTERWARDS
        transaction.set(counterRef, { current: nextInvoiceNum }, { merge: true });

        const saleRef = doc(collection(db!, 'sales'));
        transaction.set(saleRef, salePayload);

        // Add patient if new, or update existing patient's address & doctors
        if (
          customerName &&
          customerName.toLowerCase() !== 'walk-in customer' &&
          customerName.toLowerCase() !== 'walk-in patient' &&
          customerName.toLowerCase() !== 'walk in'
        ) {
          const matchedCust = salesCustomers.find(
            c => c.name.toLowerCase() === customerName.toLowerCase() || (customerPhone && c.phone === customerPhone)
          );

          const hasValidDoctor = doctorName && 
            doctorName.trim() !== '' &&
            doctorName.trim().toUpperCase() !== 'N/A' && 
            doctorName.trim().toLowerCase() !== 'self';

          const docEntry: PatientDoctor | null = hasValidDoctor ? {
            id: `doc_${Date.now()}`,
            name: doctorName.trim(),
            phone: (doctorPhone.trim() && doctorPhone.trim().toUpperCase() !== 'N/A') ? doctorPhone.trim() : undefined,
            address: (doctorAddress.trim() && doctorAddress.trim().toUpperCase() !== 'N/A') ? doctorAddress.trim() : undefined
          } : null;

          if (!matchedCust) {
            const newCustomerRef = doc(collection(db!, 'customers'));
            const newCustomer: Customer = {
              name: customerName.trim(),
              phone: customerPhone.trim(),
              address: customerAddress.trim() || resolvedCustomerAddress || '',
              type: "sale",
              outstandingBalance: 0,
              doctors: docEntry ? [docEntry] : [],
              createdAt: Date.now(),
              createdBy: user.username
            };
            transaction.set(newCustomerRef, newCustomer);
          } else if (matchedCust.id) {
            const custRef = doc(db!, 'customers', matchedCust.id);
            const updates: any = {};
            if (customerAddress.trim() && matchedCust.address !== customerAddress.trim()) {
              updates.address = customerAddress.trim();
            }
            if (customerPhone.trim() && matchedCust.phone !== customerPhone.trim()) {
              updates.phone = customerPhone.trim();
            }
            if (docEntry) {
              const currentDocs = matchedCust.doctors || [];
              const alreadyExists = currentDocs.some(d => d.name.toLowerCase() === docEntry.name.toLowerCase());
              if (!alreadyExists) {
                updates.doctors = [...currentDocs, docEntry];
              }
            }
            if (Object.keys(updates).length > 0) {
              transaction.update(custRef, updates);
            }
          }
        }

        // 3. Decrement stock & create ledger entries ONLY for inventory items (NOT custom sales items)
        for (const item of processedItems) {
          if (item.isCustom || (item.productId && item.productId.startsWith('custom_'))) {
            continue; // Custom sales-only item: strictly NO stock deduction and NO stock ledger entry
          }
          const productRef = doc(db!, 'products', item.productId);
          const info = productDataMap[item.productId];
          
          transaction.update(productRef, {
            stockQty: info.currentQty - item.qty
          });

          const ledgerRef = doc(collection(db!, 'stockLedger'));
          transaction.set(ledgerRef, {
            productId: item.productId,
            type: "sale",
            qtyChange: -item.qty,
            refCollection: "sales",
            refId: saleRef.id,
            reason: `POS Sale - ${finalInvoiceNo}`,
            date: Date.now(),
            createdBy: user.username
          });
        }
      });

      toast.success("Sale completed successfully!");
      if (onPrint) {
        onPrint(salePayload);
      }
      setShowInvoicePreview(false);
      setRows([{ productId: '', name: '', qty: 1, rate: 0, purchasePrice: 0, gstPercent: 12, discount: 0, maxQty: 0, unit: 'Strip' }]);
      setCustomerName("");
      setBillTo("");
      setIsBillToCustomized(false);
      setCustomerPhone("");
      setCustomerAddress("");
      setDoctorName("");
      setDoctorPhone("");
      setDoctorAddress("");
      setSelectedPatient(null);
      setIsDoctorSelectModalOpen(false);
      setFlatDiscount('');
      setPercentDiscount('');
      setDiscountActiveSource('flat');
      setHasPromptedNewCustomerDoctorFor(null);
      setIsNewCustomerDoctorModalOpen(false);
      localStorage.removeItem('meditrack_sale_draft');
      setHasDraft(false);
      setIsRoundOff(true);
    } catch (error: any) {
      console.error(error);
      await showAlert({
        title: "Transaction Failure",
        message: "An error occurred while processing the checkout. The stock has not been deducted and the sale has not been recorded.",
        problem: error.message || "Unknown database error",
        variant: "danger",
        eyebrow: "SYSTEM ERROR",
        confirmText: "Back to POS"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Shortcut: F4 for quick print even without adding Additional Bill Notes & Information
  useEffect(() => {
    const handleGlobalF4KeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (isBillReady && !isProcessing) {
          toast.info("Triggering Quick Print (F4)...");
          confirmCheckout();
        } else if (!isBillReady) {
          if (!rows.some(r => r.productId && r.qty > 0)) {
            toast.error("Quick Print (F4) disabled: Please select at least one medicine with valid quantity.");
          } else if (!customerPhone.trim() || customerPhone.trim().length !== 10 || !/^\d{10}$/.test(customerPhone.trim())) {
            toast.error("Quick Print (F4) disabled: Patient phone number must be exactly 10 digits.");
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalF4KeyDown);
    return () => window.removeEventListener('keydown', handleGlobalF4KeyDown);
  }, [isBillReady, isProcessing, rows, customerPhone, customerName, customerAddress, doctorName, doctorPhone, doctorAddress, paymentMode, grandTotal]);

  const formatCurrency = (val: number) => `₹${val.toFixed(2)}`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Top Header & Bill Meta */}
      <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-4 border-b dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <ShoppingCart className="w-6 h-6 text-primary-600" /> New Row-Wise Sale / Billing
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add multiple medicines in rows and complete the transaction</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900">
                Invoice No: {invoiceNo}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Patient Name</label>
            <CustomerAutocomplete 
              id="patient-name-input"
              value={customerName}
              onChange={handleCustomerNameChange}
              customers={salesCustomers}
              onSelect={(c: any) => {
                applyPatientInfo(c);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Bill to</label>
              {isBillToCustomized && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBillToCustomized(false);
                    setBillTo(customerName);
                  }}
                  className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                  title="Reset to Patient Name"
                >
                  Reset
                </button>
              )}
            </div>
            <Input 
              id="bill-to-input"
              value={billTo} 
              onFocus={(e) => e.target.select()}
              onChange={e => {
                setBillTo(e.target.value);
                setIsBillToCustomized(true);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const phoneEl = document.getElementById('patient-phone-input') as HTMLInputElement | null;
                  if (phoneEl) {
                    phoneEl.focus();
                    if (phoneEl.select) phoneEl.select();
                  }
                }
              }}
              placeholder={customerName || "Patient name (default)"}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Patient Phone</label>
            <Input 
              id="patient-phone-input"
              value={customerPhone} 
              onFocus={(e) => e.target.select()}
              onChange={e => handleCustomerPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))} 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const addrEl = document.getElementById('patient-address-input') as HTMLInputElement | null;
                  if (addrEl) {
                    addrEl.focus();
                    if (addrEl.select) addrEl.select();
                  }
                }
              }}
              maxLength={10}
              placeholder="10-digit mobile no."
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Patient Address</label>
            <Input 
              id="patient-address-input"
              value={customerAddress} 
              onFocus={(e) => e.target.select()}
              onChange={e => setCustomerAddress(e.target.value)} 
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const docEl = document.getElementById('doctor-name-input') as HTMLInputElement | null;
                  if (docEl) {
                    docEl.focus();
                    if (docEl.select) docEl.select();
                  }
                }
              }}
              placeholder="Address / Town / Area"
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Doctor Name (Optional)</label>
              <div className="flex items-center gap-2">
                {selectedPatient?.doctors && selectedPatient.doctors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsDoctorSelectModalOpen(true)}
                    className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    title="Select doctor for this patient"
                  >
                    <Stethoscope className="w-3 h-3" /> Select Dr. ({selectedPatient.doctors.length})
                  </button>
                )}
                {doctorPhone && (
                  <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium">
                    Ph: {doctorPhone}
                  </span>
                )}
              </div>
            </div>
            <DoctorAutocomplete 
              id="doctor-name-input"
              value={doctorName} 
              patientDoctors={selectedPatient?.doctors || []}
              onChange={val => {
                setDoctorName(val);
                const trimmed = val.trim().toLowerCase();
                if (!trimmed) {
                  setDoctorPhone('');
                  setDoctorAddress('');
                  return;
                }
                const matched = doctors.find(d => d.name.toLowerCase() === trimmed);
                if (matched) {
                  setDoctorPhone(matched.phone || '');
                  setDoctorAddress(matched.address || '');
                } else {
                  setDoctorPhone('');
                  setDoctorAddress('');
                }
              }}
              onFocus={() => {
                const trimmedName = customerName.trim();
                const trimmedPhone = customerPhone.trim();
                const isWalkIn = !trimmedName || 
                  trimmedName.toLowerCase() === 'walk-in' || 
                  trimmedName.toLowerCase() === 'walk-in patient' || 
                  trimmedName.toLowerCase() === 'walk in' ||
                  trimmedName.toLowerCase() === 'walk-in customer';

                if (!isWalkIn && trimmedName.length > 1) {
                  const isExisting = salesCustomers.some(c => 
                    c.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
                    (trimmedPhone.length > 0 && c.phone === trimmedPhone)
                  );

                  if (!isExisting && hasPromptedNewCustomerDoctorFor !== trimmedName.toLowerCase()) {
                    setHasPromptedNewCustomerDoctorFor(trimmedName.toLowerCase());
                    setIsNewCustomerDoctorModalOpen(true);
                  }
                }
              }}
              doctors={doctors}
              onSelect={(d: any) => {
                setDoctorName(d.name);
                setDoctorPhone(d.phone || '');
                setDoctorAddress(d.address || '');
                setTimeout(() => {
                  const payEl = document.getElementById('payment-mode-select');
                  if (payEl) payEl.focus();
                }, 150);
              }}
              placeholder="Search or enter doctor name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Mode</label>
            <select 
              id="payment-mode-select"
              value={paymentMode} 
              onChange={e => setPaymentMode(e.target.value as any)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const firstProductInput = document.getElementById('grid-input-0-0');
                  if (firstProductInput) {
                    firstProductInput.focus();
                  }
                }
              }}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 text-sm shadow-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / QR</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Row-Wise Product Selection Table */}
      <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Selected Products</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
              Custom Sales-Only Supported
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddRow} size="sm" variant="outline" className="flex items-center gap-1.5 h-8 text-xs">
              <Plus className="w-4 h-4" /> Add Inventory Product
            </Button>
            <Button 
              onClick={handleAddCustomRow} 
              size="sm" 
              className="flex items-center gap-1.5 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
              title="Add a custom product solely for sales (does not affect stock or profit)"
            >
              <Sparkles className="w-3.5 h-3.5" /> + Custom Product (Sales Only)
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide border-b-2 border-slate-300 dark:border-slate-700 shadow-sm">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 min-w-[280px] text-center">Product Name / Medicine *</th>
                <th className="p-3 w-28 text-center">Available Stock</th>
                <th className="p-3 w-28 text-center">Quantity *</th>
                <th className="p-3 w-32 text-center">Purchase Price</th>
                <th className="p-3 w-32 text-center">Rate / MRP (₹) *</th>
                <th className="p-3 w-28 text-center">Disc (%)</th>
                <th className="p-3 w-32 text-center">Total (₹)</th>
                <th className="p-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {rows.map((row, index) => {
                const itemTotal = row.qty * row.rate;
                const discountedTotal = itemTotal * (1 - (row.discount || 0) / 100);

                return (
                  <tr key={index} className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/30 ${row.isCustom ? 'bg-purple-50/20 dark:bg-purple-950/10' : ''}`}>
                    <td className="p-3 text-center text-slate-500 dark:text-slate-400 font-medium">{index + 1}</td>
                    
                    {/* Product Selection Dropdown or Custom Input */}
                    <td className="p-2.5">
                      {row.isCustom ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <div className="relative flex-1">
                            <Input
                              id={`grid-input-${index}-0`}
                              value={row.name}
                              onChange={e => handleRowChange(index, 'name', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, index, 0)}
                              placeholder="Type custom product name..."
                              autoFocus={index === rows.length - 1}
                              className="h-10 text-sm font-semibold bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 pr-24"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 pointer-events-none select-none">
                              Sales Only
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...rows];
                              updated[index] = {
                                productId: '',
                                name: '',
                                qty: 1,
                                rate: 0,
                                purchasePrice: 0,
                                gstPercent: 12,
                                discount: 0,
                                maxQty: 0,
                                unit: 'Strip',
                                isCustom: false
                              };
                              setRows(updated);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Switch back to inventory search"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <ProductAutocomplete 
                          id={`grid-input-${index}-0`}
                          value={row.productId}
                          products={products}
                          selectedProductIds={rows.map((r, i) => i !== index ? r.productId : null).filter(Boolean)}
                          onChange={(val: string) => handleProductSelect(index, val)}
                          onSelectCustom={(customName: string) => handleSelectCustomProduct(index, customName)}
                          onKeyDown={(e: any) => handleKeyDown(e, index, 0)}
                          autoFocus={index === rows.length - 1 && index !== 0}
                        />
                      )}
                    </td>

                    {/* Available Stock Badge */}
                    <td className="p-3 text-center">
                      {row.isCustom ? (
                        <span 
                          className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 select-none inline-block"
                          title="Solely for sales: no inventory stock check or deduction"
                        >
                          Non-Stock
                        </span>
                      ) : row.productId ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          (row.maxQty - (Number(row.qty) || 0)) <= 5 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}>
                          {Math.max(0, row.maxQty - (Number(row.qty) || 0))} {row.unit}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="p-2.5">
                      <Input 
                        id={`grid-input-${index}-1`}
                        onKeyDown={(e) => handleKeyDown(e, index, 1)}
                        onFocus={(e) => e.target.select()}
                        type="number"
                        min={1}
                        max={row.isCustom ? undefined : (row.maxQty || 100)}
                        value={row.qty}
                        onChange={e => handleRowChange(index, 'qty', e.target.value)}
                        disabled={!row.productId && !row.isCustom}
                        className={`h-10 text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium ${
                          row.isCustom ? 'border-purple-200 dark:border-purple-800' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      />
                    </td>

                    {/* Purchase Price (Non-editable) */}
                    <td className="p-2.5 text-center">
                      {row.isCustom ? (
                        <span className="inline-block w-full text-center text-xs text-slate-400 dark:text-slate-500 italic py-2">
                          N/A (Sales Only)
                        </span>
                      ) : (
                        <Input 
                          id={`grid-input-${index}-2`}
                          onKeyDown={(e) => handleKeyDown(e, index, 2)}
                          type="text"
                          readOnly
                          value={row.productId ? (row.purchasePrice ? formatCurrency(row.purchasePrice) : '₹0.00') : '-'}
                          className="h-10 text-center font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                          title="Purchase price is shown for reference"
                        />
                      )}
                    </td>

                    {/* Rate / MRP */}
                    <td className="p-2.5">
                      {row.isCustom ? (
                        <Input 
                          id={`grid-input-${index}-3`}
                          onKeyDown={(e) => handleKeyDown(e, index, 3)}
                          onFocus={(e) => e.target.select()}
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.rate === 0 ? '' : row.rate}
                          onChange={e => handleRowChange(index, 'rate', e.target.value)}
                          placeholder="0.00"
                          className="h-10 text-center font-bold bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 focus:ring-purple-500"
                          title="Enter selling price for this custom item"
                        />
                      ) : (
                        <Input 
                          id={`grid-input-${index}-3`}
                          onKeyDown={(e) => handleKeyDown(e, index, 3)}
                          type="text"
                          readOnly
                          value={row.productId ? (row.rate ? formatCurrency(row.rate) : '₹0.00') : '-'}
                          className="h-10 text-center font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed select-none"
                          title="MRP is fixed from product master and cannot be edited"
                        />
                      )}
                    </td>

                    {/* Discount % */}
                    <td className="p-2.5">
                      <Input 
                        id={`grid-input-${index}-4`}
                        onKeyDown={(e) => handleKeyDown(e, index, 4)}
                        onFocus={(e) => e.target.select()}
                        type="number"
                        min={0}
                        max={100}
                        value={row.discount === 0 ? '0' : (row.discount || '')}
                        onChange={e => handleRowChange(index, 'discount', e.target.value)}
                        disabled={!row.productId && !row.isCustom}
                        placeholder="0"
                        className="h-10 text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 font-medium"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="p-3 text-right font-semibold text-primary-600 dark:text-primary-400">
                      {formatCurrency(discountedTotal)}
                    </td>

                    {/* Remove Action */}
                    <td className="p-3 text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveRow(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 w-8"
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

        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAddRow} className="flex items-center gap-1.5 text-xs">
              <Plus className="w-4 h-4" /> Add Inventory Item
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddCustomRow} 
              className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" /> + Custom Item (Sales Only)
            </Button>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Inventory Items: <strong className="text-slate-900 dark:text-slate-100">{rows.filter(r => !r.isCustom && r.productId).length}</strong>
            </span>
            <span>
              Custom (Sales-Only) Items: <strong className="text-purple-700 dark:text-purple-300">{rows.filter(r => r.isCustom && r.name.trim()).length}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Bottom Summary & Checkout Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Additional Bill Notes & Information
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Shortcut: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">F4</kbd> for quick print even without adding notes.
                  </span>
                  {isBillReady ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      ● F4 Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      ● F4 Disabled (requires item & 10-digit phone)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={confirmCheckout}
                  disabled={!isBillReady || isProcessing}
                  className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title={isBillReady ? "Quick Print Bill directly (F4)" : "Quick Print (F4) is disabled until a product and 10-digit phone number are entered"}
                >
                  <Printer className="w-3.5 h-3.5" /> Quick Print
                  <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-emerald-800 text-emerald-100 rounded border border-emerald-500/50">
                    F4
                  </kbd>
                </Button>
                {hasDraft && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Draft automatically saved
                    </span>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="text-xs text-slate-400 hover:text-red-500 font-medium underline"
                      title="Clear saved draft"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Bill Discount: Divided into Flat (₹) and Percentage (%) fields with real-time bidirectional synchronization */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Overall Bill Discount
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter flat rupee or percentage discount — both values sync dynamically.
                  </p>
                </div>
                {billDiscount > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                    Discount: -{formatCurrency(billDiscount)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Flat Discount field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>Flat Discount (₹)</span>
                    <span className="text-[10px] text-slate-400">Updates % dynamically</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <Input 
                      type="number"
                      min="0"
                      step="1"
                      value={flatDiscount}
                      onFocus={(e) => e.target.select()}
                      onChange={e => handleFlatDiscountChange(e.target.value)}
                      placeholder="0.00"
                      className="pl-8 pr-3 h-11 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Percentage Discount field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>Percentage Discount (%)</span>
                    <span className="text-[10px] text-slate-400">Updates ₹ dynamically</span>
                  </label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={percentDiscount}
                      onFocus={(e) => e.target.select()}
                      onChange={e => handlePercentDiscountChange(e.target.value)}
                      placeholder="0"
                      className="pl-3 pr-8 h-11 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 text-sm font-medium"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Cancel and Review & Complete Sale pushed to the bottom of the dialog box, made larger */}
          <div className="mt-8 pt-5 border-t dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelSale}
              className="h-12 px-6 text-sm font-semibold border-2 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 flex items-center gap-2 rounded-xl transition-all"
            >
              <X className="w-5 h-5" /> Cancel Sale
            </Button>

            <Button
              type="button"
              onClick={handleCheckoutClick}
              disabled={rows.filter(r => r.productId && r.qty > 0).length === 0}
              className="h-12 px-8 text-base font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20 flex items-center gap-2.5 rounded-xl disabled:opacity-50 transition-all"
            >
              <CheckCircle className="w-5 h-5" /> Review & Complete Sale
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Logged in as: <strong className="text-slate-800 dark:text-slate-200">{user?.username || 'Staff'}</strong></span>
            <span>All inventory records and stock ledgers update automatically upon checkout.</span>
          </div>
        </Card>

        {/* Calculation & Final Payment Box (Bill Summary) - Review & Complete Sale button removed */}
        <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-lg p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 border-b dark:border-slate-700 pb-3">Bill Summary</h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>GST / Tax Total</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(gstTotal)}</span>
              </div>
              {billDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Bill Discount {percentDiscount ? `(${percentDiscount}%)` : ''}</span>
                  <span>-{formatCurrency(billDiscount)}</span>
                </div>
              )}
              {isRoundOff && roundOffAmount !== 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Round Off</span>
                  <span>{roundOffAmount > 0 ? '+' : ''}{formatCurrency(roundOffAmount)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 mb-2">
                <input 
                  type="checkbox" 
                  id="roundOffCheck"
                  checked={isRoundOff}
                  onChange={(e) => setIsRoundOff(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                />
                <label htmlFor="roundOffCheck" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  Apply Round Off
                </label>
              </div>
              <div className="flex justify-between font-extrabold text-lg text-slate-900 dark:text-slate-100 pt-3 border-t dark:border-slate-700">
                <span>Grand Total</span>
                <span className="text-primary-600 dark:text-primary-400">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount Paid by Patient (₹)</label>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Auto-Fetched (Full Paid)
                </span>
              </div>
              <Input 
                type="text"
                readOnly
                disabled
                value={formatCurrency(grandTotal)}
                className="h-10 text-base font-bold bg-slate-100 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 cursor-not-allowed select-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Payment Mode: <strong className="text-slate-800 dark:text-slate-200">{paymentMode}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Checkout
            </span>
          </div>
        </Card>
      </div>

      {/* Invoice Preview Modal */}
      {showInvoicePreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border dark:border-slate-700">
            
            <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" /> Invoice Preview
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowInvoicePreview(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto" style={{ fontSize: '102%' }}>
              <div className="text-center pb-4 border-b dark:border-slate-700 space-y-1">
                <h2 className="text-xl font-extrabold text-primary-600">MediTrack Pro Pharmacy</h2>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">GST GST No. : 19DRSPS0161Q1ZR</p>
              </div>

              <div className="grid grid-cols-2 text-xs gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block">Invoice No:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{invoiceNo}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Date:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{new Date().toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Patient Name:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{customerName || 'Walk-in Patient'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Bill To:</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-primary-600 dark:text-primary-400">
                    {billTo.trim() || customerName || 'Walk-in Patient'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Patient Phone:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{customerPhone || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Patient Address:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{customerAddress || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Mode:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{paymentMode}</strong>
                </div>
                {doctorName && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Doctor Name:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{doctorName}</strong>
                    {doctorPhone && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Contact: +91 {doctorPhone}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs tracking-wide border-b-2 border-slate-300 dark:border-slate-700 shadow-sm">
                    <tr>
                      <th className="p-2.5 text-center">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-center">MRP</th>
                      <th className="p-2.5 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {rows.filter(r => r.productId && r.qty > 0).map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium">{item.name}</td>
                        <td className="p-2.5 text-center">{item.qty} {item.unit}</td>
                        <td className="p-2.5 text-right">{formatCurrency(item.rate)}</td>
                        <td className="p-2.5 text-right font-semibold">{formatCurrency(item.qty * item.rate * (1 - (item.discount || 0) / 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 text-xs pt-2 border-t dark:border-slate-700">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>GST Total</span>
                  <span>{formatCurrency(gstTotal)}</span>
                </div>
                {billDiscount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Bill Discount {percentDiscount ? `(${percentDiscount}%)` : ''}</span>
                    <span>-{formatCurrency(billDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 pt-1 border-t dark:border-slate-700">
                  <span>Grand Total</span>
                  <span className="text-primary-600 dark:text-primary-400">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span>Amount Paid</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(grandTotal)} (Full Paid)</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-700 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowInvoicePreview(false)}>Cancel</Button>
              <Button 
                id="confirm-print-invoice-btn"
                onClick={confirmCheckout} 
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <CheckCircle className="w-4 h-4" /> {isProcessing ? 'Processing...' : 'Confirm & Print Invoice'}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Multiple Doctors Selection Modal for Selected Patient */}
      {isDoctorSelectModalOpen && selectedPatient && selectedPatient.doctors && selectedPatient.doctors.length > 1 && (
        <PatientDoctorSelectModal
          isOpen={isDoctorSelectModalOpen}
          onClose={() => {
            setIsDoctorSelectModalOpen(false);
            setTimeout(() => {
              const payEl = document.getElementById('payment-mode-select');
              if (payEl) payEl.focus();
            }, 150);
          }}
          patientName={selectedPatient.name}
          doctors={selectedPatient.doctors}
          onSelectDoctor={(doc) => {
            setDoctorName(doc.name);
            setDoctorPhone(doc.phone || 'N/A');
            setDoctorAddress(doc.address || 'N/A');
            setIsDoctorSelectModalOpen(false);
            toast.success(`Doctor "${doc.name}" selected for ${selectedPatient.name}`);
            setTimeout(() => {
              const payEl = document.getElementById('payment-mode-select');
              if (payEl) payEl.focus();
            }, 150);
          }}
          onSelectNone={() => {
            setDoctorName('N/A');
            setDoctorPhone('N/A');
            setDoctorAddress('N/A');
            setIsDoctorSelectModalOpen(false);
            setTimeout(() => {
              const payEl = document.getElementById('payment-mode-select');
              if (payEl) payEl.focus();
            }, 150);
          }}
        />
      )}

      {/* New Customer Doctor Modal - triggers when cursor points to Dr. name for a new customer */}
      {isNewCustomerDoctorModalOpen && (
        <NewCustomerDoctorModal
          isOpen={isNewCustomerDoctorModalOpen}
          customerName={customerName}
          initialDoctorName={doctorName && doctorName !== 'N/A' && doctorName !== 'Self' ? doctorName : ''}
          initialDoctorPhone={doctorPhone && doctorPhone !== 'N/A' ? doctorPhone : ''}
          initialDoctorAddress={doctorAddress && doctorAddress !== 'N/A' ? doctorAddress : ''}
          onSave={(docData) => {
            setDoctorName(docData.name);
            setDoctorPhone(docData.phone || 'N/A');
            setDoctorAddress(docData.address || 'N/A');
            setIsNewCustomerDoctorModalOpen(false);
            toast.success(`Doctor "${docData.name}" details added for ${customerName}`);
            setTimeout(() => {
              const payEl = document.getElementById('payment-mode-select');
              if (payEl) payEl.focus();
            }, 150);
          }}
          onSkip={() => {
            setDoctorName('N/A');
            setDoctorPhone('N/A');
            setDoctorAddress('N/A');
            setIsNewCustomerDoctorModalOpen(false);
            setTimeout(() => {
              const payEl = document.getElementById('payment-mode-select');
              if (payEl) payEl.focus();
            }, 150);
          }}
          onClose={() => {
            setIsNewCustomerDoctorModalOpen(false);
          }}
        />
      )}

    </div>
  );
}
