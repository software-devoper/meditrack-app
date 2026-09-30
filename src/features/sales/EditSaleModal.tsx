import React, { useState, useEffect } from 'react';
import { doc, collection, query, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product, Customer, Doctor } from '../../types';
import { Button, Input, Card, CardContent } from '../../components/ui';
import { toast } from 'sonner';
import { X, Plus, RotateCcw, Stethoscope, Sparkles, RefreshCw } from 'lucide-react';
import { ProductAutocomplete } from './ProductAutocomplete';
import { CustomerAutocomplete } from './CustomerAutocomplete';
import { DoctorAutocomplete } from './DoctorAutocomplete';
import { PatientDoctorSelectModal } from './PatientDoctorSelectModal';

export function EditSaleModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  const [customerName, setCustomerName] = useState(sale.patientName || sale.customerName || '');
  const [billTo, setBillTo] = useState(sale.billTo || sale.patientName || sale.customerName || '');
  const [isBillToCustomized, setIsBillToCustomized] = useState(Boolean(sale.billTo && sale.billTo !== (sale.patientName || sale.customerName)));
  const [customerPhone, setCustomerPhone] = useState(sale.patientPhone || sale.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(
    (sale.patientAddress || sale.customerAddress) && (sale.patientAddress || sale.customerAddress).trim().toLowerCase() !== 'local' 
      ? (sale.patientAddress || sale.customerAddress) 
      : ''
  );
  const [doctorName, setDoctorName] = useState(sale.doctorName || '');
  const [doctorPhone, setDoctorPhone] = useState(sale.doctorPhone || '');
  const [doctorAddress, setDoctorAddress] = useState(sale.doctorAddress || '');
  const [paymentMode, setPaymentMode] = useState(sale.paymentMode || 'Cash');
  const [billDiscount, setBillDiscount] = useState<number>(sale.discountTotal || 0);
  const [isRoundOff, setIsRoundOff] = useState<boolean>(sale.roundOff !== undefined ? sale.roundOff !== 0 : true);
  const [rows, setRows] = useState<any[]>(sale.items || []);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Customer | null>(null);
  const [isDoctorSelectModalOpen, setIsDoctorSelectModalOpen] = useState(false);

  const applyPatientInfo = (patient: Customer) => {
    setSelectedPatient(patient);
    setCustomerName(patient.name);
    if (!isBillToCustomized) {
      setBillTo(patient.name);
    }
    setCustomerPhone(patient.phone || '');
    setCustomerAddress(patient.address || '');

    const patDoctors = patient.doctors || [];
    if (patDoctors.length === 1) {
      const doc = patDoctors[0];
      setDoctorName(doc.name);
      setDoctorPhone(doc.phone || '');
      setDoctorAddress(doc.address || '');
      toast.success(`Patient "${patient.name}" selected. Doctor "${doc.name}" auto-filled.`);
    } else if (patDoctors.length > 1) {
      setDoctorName('');
      setDoctorPhone('');
      setDoctorAddress('');
      setIsDoctorSelectModalOpen(true);
    } else {
      setDoctorName('');
      setDoctorPhone('');
      setDoctorAddress('');
    }
  };

  useEffect(() => {
    if (!db) return;
    const fetchProducts = async () => {
      const pSnap = await getDocs(collection(db, 'products'));
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    };
    const fetchCustomers = async () => {
      const cSnap = await getDocs(collection(db, 'customers'));
      setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    };
    const fetchDoctors = async () => {
      const dSnap = await getDocs(collection(db, 'doctors'));
      setDoctors(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
    };
    fetchProducts();
    fetchCustomers();
    fetchDoctors();
  }, []);

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Optional: add stock check here if needed, but it's handled in transaction anyway
    
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
      gstPercent: product.gstPercent || 12,
      discount: 0,
      maxQty: product.stockQty, // For display
      unit: product.unit || 'Strip',
      isCustom: false
    };
    setRows(updated);
  };

  const handleSelectCustomProduct = (index: number, customName: string) => {
    const name = customName.trim();
    if (!name) return;
    const updated = [...rows];
    updated[index] = {
      productId: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name,
      qty: 1,
      rate: 0,
      gstPercent: 12,
      discount: 0,
      maxQty: 999999,
      unit: 'Piece',
      isCustom: true
    };
    setRows(updated);
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleReturnRow = (index: number) => {
    if (rows.length === 1) {
      toast.error("Cannot return the only item. To cancel the sale entirely, delete the invoice.");
      return;
    }
    const removedRow = rows[index];
    setRows(rows.filter((_, i) => i !== index));
    if (removedRow.productId && !removedRow.isCustom && !removedRow.productId.startsWith('custom_')) {
      toast.info(`Product removed. Click 'Update Sale' to confirm and restore inventory stock.`);
    } else {
      toast.info(`Custom item removed.`);
    }
  };

  const addRow = () => {
    setRows([...rows, { productId: '', name: '', qty: 1, rate: 0, gstPercent: 12, discount: 0, maxQty: 0, unit: 'Strip', isCustom: false }]);
  };

  const addCustomRow = () => {
    setRows([
      ...rows,
      {
        productId: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        qty: 1,
        rate: 0,
        gstPercent: 12,
        discount: 0,
        maxQty: 999999,
        unit: 'Piece',
        isCustom: true
      }
    ]);
  };

  // Calculations
  const subtotal = rows.reduce((acc, row) => {
    if (!row.productId && !row.isCustom) return acc;
    return acc + (Number(row.qty) * Number(row.rate));
  }, 0);
  const totalItemDiscount = rows.reduce((acc, row) => {
    if (!row.productId && !row.isCustom) return acc;
    return acc + ((Number(row.qty) * Number(row.rate)) * (Number(row.discount) / 100));
  }, 0);
  const taxableAmount = subtotal - totalItemDiscount;
  const taxAmount = rows.reduce((acc, row) => {
    if (!row.productId && !row.isCustom) return acc;
    const itemTotal = (Number(row.qty) * Number(row.rate)) * (1 - (Number(row.discount) / 100));
    const base = itemTotal / (1 + Number(row.gstPercent) / 100);
    return acc + (itemTotal - base);
  }, 0);
  const actualSubtotal = rows.reduce((acc, row) => {
    if (!row.productId && !row.isCustom) return acc;
    const itemTotal = (Number(row.qty) * Number(row.rate)) * (1 - (Number(row.discount) / 100));
    const base = itemTotal / (1 + Number(row.gstPercent) / 100);
    return acc + base;
  }, 0);

  const rawGrandTotal = actualSubtotal + taxAmount;
  const netTotal = Math.max(0, rawGrandTotal - (billDiscount || 0));
  const roundOffAmount = isRoundOff ? Math.round(netTotal) - netTotal : 0;
  const grandTotal = netTotal + roundOffAmount;

  const handleUpdate = async () => {
    const validRows = rows.filter(r => ((r.productId && r.productId !== '') || r.isCustom) && r.name.trim() && Number(r.qty) > 0 && Number(r.rate) > 0);
    if (validRows.length === 0) {
      toast.error("Please add at least one valid product with quantity and rate");
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length !== 10 || !/^\d{10}$/.test(customerPhone.trim())) {
      toast.error('Patient phone number must be exactly 10 digits');
      return;
    }

    setIsSubmitting(true);
    try {
      await runTransaction(db!, async (transaction) => {
        const productDataMap: Record<string, { currentQty: number, name: string }> = {};
        
        // Find all unique INVENTORY product IDs across old and new items (exclude custom sales items)
        const allProductIds = new Set<string>();
        sale.items.forEach((item: any) => {
          if (!item.isCustom && !item.productId?.startsWith('custom_')) {
            allProductIds.add(item.productId);
          }
        });
        validRows.forEach(item => {
          if (!item.isCustom && !item.productId?.startsWith('custom_')) {
            allProductIds.add(item.productId);
          }
        });

        // 1. Fetch all required inventory products
        for (const pid of allProductIds) {
          const pRef = doc(db!, 'products', pid);
          const pDoc = await transaction.get(pRef);
          if (pDoc.exists()) {
            productDataMap[pid] = { currentQty: pDoc.data().stockQty, name: pDoc.data().name };
          }
        }

        // 2. Compute net stock changes (only for inventory items)
        // Positive means we need to add back to inventory, negative means we deduct
        const stockChanges: Record<string, number> = {};
        allProductIds.forEach(pid => stockChanges[pid] = 0);

        // Add back old quantities
        sale.items.forEach((oldItem: any) => {
          if (oldItem.isCustom || oldItem.productId?.startsWith('custom_')) return;
          stockChanges[oldItem.productId] = (stockChanges[oldItem.productId] || 0) + oldItem.qty;
        });

        // Deduct new quantities
        validRows.forEach(newItem => {
          if (newItem.isCustom || newItem.productId?.startsWith('custom_')) return;
          stockChanges[newItem.productId] = (stockChanges[newItem.productId] || 0) - Number(newItem.qty);
        });

        // 3. Validate new stock levels
        for (const pid of allProductIds) {
          const change = stockChanges[pid];
          if (!productDataMap[pid]) {
            if (change < 0) throw new Error(`Product not found for ID: ${pid}`);
            continue;
          }
          const finalStock = productDataMap[pid].currentQty + change;
          if (finalStock < 0) {
            throw new Error(`Insufficient stock for ${productDataMap[pid].name}. Need ${-change} more.`);
          }
        }

        // 4. Update product stocks and write ledgers (only for inventory items)
        for (const pid of allProductIds) {
          const change = stockChanges[pid];
          if (change !== 0 && productDataMap[pid]) {
            const pRef = doc(db!, 'products', pid);
            transaction.update(pRef, { stockQty: productDataMap[pid].currentQty + change });

            // Record ledger entry
            const ledgerRef = doc(collection(db!, 'stockLedger'));
            transaction.set(ledgerRef, {
              productId: pid,
              type: change > 0 ? "return" : "sale",
              qtyChange: change,
              refCollection: "sales",
              refId: sale.id,
              reason: `Sale Edit - ${sale.invoiceNo}`,
              date: Date.now(),
              createdBy: 'System'
            });
          }
        }

        // 5. Update Sale Document
        const saleRef = doc(db!, 'sales', sale.id);
        const processedItems = validRows.map(({ maxQty, ...rest }) => ({
          ...rest,
          productId: rest.productId || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          isCustom: !!rest.isCustom
        }));

        const newSalePayload = {
          ...sale,
          billTo: billTo.trim() || customerName || 'Walk-in Patient',
          patientName: customerName,
          customerName,
          patientPhone: customerPhone,
          customerPhone,
          patientAddress: customerAddress.trim() || 'N/A',
          customerAddress: customerAddress.trim() || 'N/A',
          doctorName: doctorName.trim() || 'N/A',
          doctorPhone: doctorPhone.trim() || 'N/A',
          doctorAddress: doctorAddress.trim() || 'N/A',
          paymentMode,
          items: processedItems,
          subtotal: actualSubtotal,
          gstTotal: taxAmount,
          discountTotal: billDiscount,
          totalDiscount: totalItemDiscount,
          roundOff: roundOffAmount,
          taxableAmount,
          taxAmount,
          grandTotal,
          amountPaid: grandTotal,
          updatedAt: Date.now()
        };
        transaction.update(saleRef, newSalePayload);
      });

      toast.success("Sale updated successfully!");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
          <h2 className="text-xl font-bold">Edit Sale - {sale.invoiceNo}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Patient, Doctor & Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Patient Name</label>
              <CustomerAutocomplete
                id="edit-patient-name-input"
                value={customerName}
                onChange={val => {
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
                  const matched = customers.find(c => c.type === 'sale' && c.name.toLowerCase() === trimmed.toLowerCase());
                  if (matched) {
                    applyPatientInfo(matched);
                  } else {
                    setSelectedPatient(null);
                    setCustomerPhone('');
                    setCustomerAddress('');
                    setDoctorName('');
                    setDoctorPhone('');
                    setDoctorAddress('');
                  }
                }}
                customers={customers.filter(c => c.type === 'sale')}
                onSelect={(c: any) => { 
                  applyPatientInfo(c);
                }}
              />
            </div>
            <div className="space-y-1">
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
                id="edit-bill-to-input"
                value={billTo} 
                onFocus={(e) => e.target.select()}
                onChange={e => {
                  setBillTo(e.target.value);
                  setIsBillToCustomized(true);
                }} 
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const phoneEl = document.getElementById('edit-patient-phone-input') as HTMLInputElement | null;
                    if (phoneEl) {
                      phoneEl.focus();
                      if (phoneEl.select) phoneEl.select();
                    }
                  }
                }}
                placeholder={customerName || "Patient name (default)"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Patient Phone</label>
              <Input 
                id="edit-patient-phone-input"
                value={customerPhone} 
                onFocus={(e) => e.target.select()}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCustomerPhone(val);
                  if (val.length === 10) {
                    const matched = customers.find(c => c.type === 'sale' && c.phone === val);
                    if (matched) applyPatientInfo(matched);
                  }
                }} 
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const addrEl = document.getElementById('edit-patient-address-input') as HTMLInputElement | null;
                    if (addrEl) {
                      addrEl.focus();
                      if (addrEl.select) addrEl.select();
                    }
                  }
                }}
                maxLength={10}
                placeholder="10-digit mobile no."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Patient Address</label>
              <Input 
                id="edit-patient-address-input"
                value={customerAddress} 
                onFocus={(e) => e.target.select()}
                onChange={e => setCustomerAddress(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const docEl = document.getElementById('edit-doctor-name-input') as HTMLInputElement | null;
                    if (docEl) {
                      docEl.focus();
                      if (docEl.select) docEl.select();
                    }
                  }
                }}
                placeholder="Address / Area"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Doctor Name</label>
                <div className="flex items-center gap-2">
                  {selectedPatient?.doctors && selectedPatient.doctors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsDoctorSelectModalOpen(true)}
                      className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Stethoscope className="w-3 h-3" /> Dr. ({selectedPatient.doctors.length})
                    </button>
                  )}
                  {doctorPhone && <span className="text-[10px] text-primary-600 font-medium">Ph: {doctorPhone}</span>}
                </div>
              </div>
              <DoctorAutocomplete
                id="edit-doctor-name-input"
                value={doctorName}
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
                doctors={doctors}
                onSelect={(d: any) => {
                  setDoctorName(d.name);
                  setDoctorPhone(d.phone || '');
                  setDoctorAddress(d.address || '');
                }}
                placeholder="Doctor Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Mode</label>
              <select 
                id="edit-payment-mode-select"
                value={paymentMode} 
                onChange={e => setPaymentMode(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const firstProductInput = document.getElementById('edit-grid-0-0');
                    if (firstProductInput) {
                      firstProductInput.focus();
                    }
                  }
                }}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="border dark:border-slate-700 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide border-b-2 border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 min-w-[250px] text-center">Product Name</th>
                  <th className="p-3 w-28 text-center">Quantity</th>
                  <th className="p-3 w-32 text-center">MRP (₹)</th>
                  <th className="p-3 w-28 text-center">Disc (%)</th>
                  <th className="p-3 w-32 text-center">Total (₹)</th>
                  <th className="p-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {rows.map((row, index) => {
                  const lineTotal = (Number(row.qty) * Number(row.rate)) * (1 - (Number(row.discount) / 100));
                  return (
                    <tr key={index} className={row.isCustom ? 'bg-purple-50/20 dark:bg-purple-950/10' : ''}>
                      <td className="p-2 text-center text-slate-500 dark:text-slate-400">{index + 1}</td>
                      <td className="p-2">
                        {row.isCustom ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <div className="relative flex-1">
                              <Input 
                                id={`edit-custom-name-${index}`}
                                value={row.name}
                                onChange={e => handleRowChange(index, 'name', e.target.value)}
                                placeholder="Custom product name..."
                                className="h-9 text-sm font-semibold bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 pr-20"
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
                                  gstPercent: 12,
                                  discount: 0,
                                  maxQty: 0,
                                  unit: 'Strip',
                                  isCustom: false
                                };
                                setRows(updated);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Switch back to inventory search"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <ProductAutocomplete 
                            id={`edit-grid-${index}`}
                            value={row.productId}
                            products={products}
                            selectedProductIds={rows.map((r, i) => i !== index ? r.productId : null).filter(Boolean)}
                            onChange={(val: string) => handleProductSelect(index, val)}
                            onSelectCustom={(customName: string) => handleSelectCustomProduct(index, customName)}
                          />
                        )}
                      </td>
                      <td className="p-2">
                        <Input 
                          id={`edit-qty-${index}`}
                          type="number" 
                          min="1" 
                          value={row.qty} 
                          onFocus={(e) => e.target.select()}
                          onChange={e => handleRowChange(index, 'qty', Math.max(1, Number(e.target.value)))} 
                          className={`text-center font-medium ${row.isCustom ? 'border-purple-200 dark:border-purple-800' : ''}`}
                        />
                      </td>
                      <td className="p-2">
                        {row.isCustom ? (
                          <Input 
                            id={`edit-rate-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.rate === 0 ? '' : row.rate}
                            onFocus={(e) => e.target.select()}
                            onChange={e => handleRowChange(index, 'rate', Number(e.target.value))}
                            placeholder="0.00"
                            className="bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-center font-bold"
                            title="Enter custom item selling price"
                          />
                        ) : (
                          <Input 
                            type="text" 
                            readOnly 
                            tabIndex={-1} 
                            value={row.rate ? `₹${Number(row.rate).toFixed(2)}` : '-'} 
                            className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed select-none text-center font-medium" 
                            title="MRP is non-editable"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        <Input 
                          id={`edit-discount-${index}`}
                          type="number" 
                          min="0" 
                          max="100" 
                          value={row.discount} 
                          onFocus={(e) => e.target.select()}
                          onChange={e => handleRowChange(index, 'discount', Number(e.target.value))} 
                          className="text-center font-medium"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">₹{lineTotal.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                          onClick={() => handleReturnRow(index)}
                          title={row.isCustom ? "Remove Item" : "Return Product"}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          <span className="text-xs font-semibold">{row.isCustom ? "Remove" : "Return"}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4 mr-2" /> Add Inventory Item
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addCustomRow}
                className="text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> + Custom Item (Sales Only)
              </Button>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Grand Total: ₹{grandTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Sale'}
          </Button>
        </div>
      </div>

      {isDoctorSelectModalOpen && selectedPatient && selectedPatient.doctors && selectedPatient.doctors.length > 1 && (
        <PatientDoctorSelectModal
          isOpen={isDoctorSelectModalOpen}
          onClose={() => setIsDoctorSelectModalOpen(false)}
          patientName={selectedPatient.name}
          doctors={selectedPatient.doctors}
          onSelectDoctor={(doc) => {
            setDoctorName(doc.name);
            setDoctorPhone(doc.phone || '');
            setDoctorAddress(doc.address || '');
            setIsDoctorSelectModalOpen(false);
            toast.success(`Doctor "${doc.name}" selected`);
          }}
          onSelectNone={() => {
            setDoctorName('Self');
            setDoctorPhone('');
            setDoctorAddress('');
            setIsDoctorSelectModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
