import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "../../components/ui";
import { 
  Search, Plus, Trash2, Edit2, Phone, MapPin, Mail, 
  X, Check, Building2, IndianRupee, 
  Receipt, Calendar, Eye, Package, ShoppingCart, 
  FileCheck, ArrowUpRight, Truck, Clock, ShieldCheck,
  Copy, CheckCheck, FileText, Sparkles, ShoppingBag
} from "lucide-react";
import { Supplier, Purchase, Product } from "../../types";
import { toast } from "sonner";
import { useAuthStore } from "../../store/useAuthStore";
import { formatCurrency } from "../../lib/utils";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAlertModal } from "../../context/AlertModalContext";

export interface ExtendedSupplier extends Supplier {
  email?: string;
  drugLicenseNo?: string;
  contactPerson?: string;
  type?: 'purchase';
  createdBy?: string;
}

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<ExtendedSupplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const selectedSupplierRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { confirm, alert: showAlert } = useAlertModal();

  const [formData, setFormData] = useState<Partial<ExtendedSupplier>>({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    drugLicenseNo: "",
    contactPerson: "",
    outstandingBalance: 0,
    type: 'purchase'
  });

  // Load suppliers from customers collection (type: 'purchase') or direct records
  useEffect(() => {
    if (!db) return;
    const qSuppliers = query(collection(db, 'customers'));
    const unsubSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      const records: ExtendedSupplier[] = [];
      snapshot.forEach(d => {
        const data = d.data() as ExtendedSupplier;
        if (data.type === 'purchase') {
          records.push({ id: d.id, ...data });
        }
      });
      setSuppliers(records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setLoading(false);
    });

    const qPurchases = query(collection(db, 'purchases'), orderBy('date', 'desc'));
    const unsubPurchases = onSnapshot(qPurchases, (snapshot) => {
      const records: Purchase[] = [];
      snapshot.forEach(d => records.push({ id: d.id, ...d.data() } as Purchase));
      setPurchases(records);
    });

    const qProducts = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(d => prods.push({ id: d.id, ...d.data() } as Product));
      setProducts(prods);
    });

    return () => {
      unsubSuppliers();
      unsubPurchases();
      unsubProducts();
    };
  }, []);

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredSuppliers = useMemo(() => {
    const term = (search || '').toLowerCase().trim();
    if (!term) return suppliers;
    return suppliers.filter(s => 
      (s?.name || '').toLowerCase().includes(term) || 
      (s?.phone && s.phone.includes(term)) ||
      (s?.email && s.email.toLowerCase().includes(term)) ||
      (s?.gstNumber && s.gstNumber.toLowerCase().includes(term)) ||
      (s?.drugLicenseNo && s.drugLicenseNo.toLowerCase().includes(term)) ||
      (s?.address && s.address.toLowerCase().includes(term))
    );
  }, [suppliers, search]);

  // Procurement & History Analytics for a given supplier
  const getSupplierStats = (supplier: ExtendedSupplier) => {
    const supName = (supplier.name || '').trim().toLowerCase();
    const supPhone = (supplier.phone || '').trim();

    // Match purchases
    const matchedPurchases = purchases.filter(p => {
      if (p.supplierId && p.supplierId === supplier.id) return true;
      if (supName && p.supplierName && p.supplierName.trim().toLowerCase() === supName) return true;
      return false;
    });

    const totalSpend = matchedPurchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
    const invoiceCount = matchedPurchases.length;
    const avgOrderValue = invoiceCount > 0 ? totalSpend / invoiceCount : 0;
    const lastPurchaseDate = invoiceCount > 0 ? matchedPurchases[0].date : null;

    // Match products supplied
    const suppliedProducts = products.filter(pr => {
      if (!pr.supplierName) return false;
      return pr.supplierName.trim().toLowerCase() === supName;
    });

    return {
      totalSpend,
      invoiceCount,
      avgOrderValue,
      lastPurchaseDate,
      purchases: matchedPurchases,
      products: suppliedProducts
    };
  };

  const selectedSupplier = useMemo(() => {
    if (selectedSupplierId) {
      const found = suppliers.find(s => s.id === selectedSupplierId);
      if (found) return found;
    }
    return suppliers[0] || null;
  }, [suppliers, selectedSupplierId]);

  const selectedStats = useMemo(() => {
    if (!selectedSupplier) return null;
    return getSupplierStats(selectedSupplier);
  }, [selectedSupplier, purchases, products]);

  const handleSelectSupplier = (id: string) => {
    setSelectedSupplierId(id);
    selectedSupplierRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const phoneVal = (formData.phone || '').trim();
    if (phoneVal && (phoneVal.length !== 10 || !/^\d{10}$/.test(phoneVal))) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    try {
      const disc = formData.defaultDiscount !== undefined && formData.defaultDiscount !== null && !isNaN(Number(formData.defaultDiscount))
        ? Number(formData.defaultDiscount)
        : 20;

      const payload: ExtendedSupplier = {
        name: (formData.name || "").trim(),
        phone: (formData.phone || "").trim(),
        email: (formData.email || "").trim(),
        address: (formData.address || "").trim(),
        gstNumber: (formData.gstNumber || "").trim().toUpperCase(),
        drugLicenseNo: (formData.drugLicenseNo || "").trim(),
        contactPerson: (formData.contactPerson || "").trim(),
        type: 'purchase',
        outstandingBalance: formData.outstandingBalance || 0,
        defaultDiscount: disc,
        createdAt: formData.createdAt || Date.now(),
        createdBy: formData.createdBy || user.id!
      };

      const nameLower = payload.name.trim().toLowerCase();
      if (nameLower) {
        localStorage.setItem(`meditrack_supplier_discount_${nameLower}`, disc.toString());
      }

      if (formData.id) {
        await setDoc(doc(db, 'customers', formData.id), payload);
        toast.success(`Supplier "${payload.name}" updated successfully`);
      } else {
        await addDoc(collection(db, 'customers'), payload);
        toast.success(`Supplier "${payload.name}" added successfully`);
      }
      localStorage.removeItem(`meditrack_supplier_draft`);
      setIsModalOpen(false);
      resetModalState();
    } catch (err) {
      toast.error(`Failed to save supplier`);
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    const targetSupplier = suppliers.find(s => s.id === id);
    const supplierName = targetSupplier?.name || "this supplier";

    const isConfirmed = await confirm({
      title: "Remove Supplier?",
      message: `Are you sure you want to remove "${supplierName}" from the supplier directory? All linked purchase bills and historic transactions will be preserved.`,
      confirmText: "Yes, Remove Supplier",
      cancelText: "Cancel",
      variant: "danger",
      eyebrow: "SUPPLIER DIRECTORY"
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'customers', id));
        toast.success(`Supplier "${supplierName}" removed`);
      } catch (err: any) {
        console.error("Delete supplier error:", err);
        await showAlert({
          title: "Removal Failed",
          message: `The system could not remove "${supplierName}" from the directory.`,
          problem: err.message || "Database permission or connectivity issue",
          variant: "danger",
          eyebrow: "SYSTEM ERROR",
          confirmText: "Back to Directory"
        });
      }
    }
  };

  // Auto-draft for new supplier entry
  useEffect(() => {
    if (isModalOpen && !formData.id) {
      const draftKey = `meditrack_supplier_draft`;
      const hasContent = (formData.name || '').trim() || (formData.phone || '').trim() || (formData.gstNumber || '').trim();
      if (hasContent) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      }
    }
  }, [formData, isModalOpen]);

  const resetModalState = () => {
    setFormData({ 
      name: "", 
      phone: "", 
      email: "", 
      address: "", 
      gstNumber: "", 
      drugLicenseNo: "", 
      contactPerson: "", 
      type: 'purchase', 
      outstandingBalance: 0,
      defaultDiscount: 20
    });
  };

  const openAddModal = () => {
    resetModalState();
    const draftKey = `meditrack_supplier_draft`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData({ ...parsed, type: 'purchase', id: undefined });
      } catch (e) {
        console.error("Failed to restore supplier draft:", e);
      }
    }
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: ExtendedSupplier) => {
    const nameKey = (supplier.name || '').trim().toLowerCase();
    const localDisc = nameKey ? localStorage.getItem(`meditrack_supplier_discount_${nameKey}`) : null;
    const resolvedDiscount = supplier.defaultDiscount !== undefined && supplier.defaultDiscount !== null
      ? supplier.defaultDiscount
      : (localDisc !== null && !isNaN(Number(localDisc)) ? Number(localDisc) : 20);

    setFormData({
      ...supplier,
      defaultDiscount: resolvedDiscount
    });
    setIsModalOpen(true);
  };

  // Metrics Highlights
  const totalSuppliersCount = suppliers.length;
  const totalProcurementSpend = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
  }, [purchases]);
  const totalSuppliedProducts = useMemo(() => {
    return products.filter(p => p.supplierName && p.supplierName.trim()).length;
  }, [products]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 break-words">
                Supplier & Vendor Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium break-words">
                Manage pharmaceutical distributors, drug licenses, GSTIN compliance, and procurement purchase ledgers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <Button 
            variant="outline" 
            onClick={() => navigate('/purchase')} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700 font-bold h-10 px-4"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Purchase Entry
          </Button>
          <Button 
            id="add-supplier-btn" 
            onClick={openAddModal} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 shadow-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Analytics Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Suppliers */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-slate-900 dark:to-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">Total Suppliers</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">{totalSuppliersCount}</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 truncate">Active wholesale distributors</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Procurement Turnover */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-slate-900 dark:to-blue-950/30 border-blue-200/80 dark:border-blue-900/50 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 truncate">Procurement Turnover</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">{formatCurrency(totalProcurementSpend)}</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 truncate">{purchases.length} purchase invoices recorded</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Linked Catalog Items */}
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50/40 dark:from-slate-900 dark:to-teal-950/30 border-teal-200/80 dark:border-teal-900/50 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 truncate">Linked Catalog Items</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">{totalSuppliedProducts}</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 truncate">Products mapped to vendor source</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-2xs shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Supplier Directory List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 min-w-0">
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Supplier Directory
                </CardTitle>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  {filteredSuppliers.length} of {suppliers.length}
                </span>
              </div>
              <div className="relative mt-2.5">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="supplier-search-input"
                  placeholder="Search by vendor, phone, GSTIN, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-sm font-medium border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 focus:bg-white dark:focus:bg-slate-900"
                />
                {search && (
                  <button 
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-2 space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
              {loading ? (
                <div className="p-10 text-center text-sm font-medium text-slate-600 dark:text-slate-400">Loading suppliers...</div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No suppliers found</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {search ? `No vendor records matching "${search}"` : "Add wholesale suppliers or enter them when adding products in Purchase."}
                  </p>
                  {!search && (
                    <Button size="sm" onClick={openAddModal} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Supplier
                    </Button>
                  )}
                </div>
              ) : (
                filteredSuppliers.map((s) => {
                  const isSelected = selectedSupplier?.id === s.id;
                  const stats = getSupplierStats(s);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSupplier(s.id!)}
                      className={`p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 border ${
                        isSelected 
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-400/50' 
                          : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold shrink-0 text-sm sm:text-base shadow-2xs ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate text-slate-900 dark:text-slate-50">
                            {s.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs mt-0.5">
                            {s.phone ? (
                              <span className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                {s.phone}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No phone</span>
                            )}
                            {s.gstNumber && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold border border-slate-200 dark:border-slate-700 shrink-0">
                                GSTIN
                              </span>
                            )}
                            {s.defaultDiscount !== undefined && s.defaultDiscount !== null && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                                {s.defaultDiscount}% Disc
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(stats.totalSpend)}
                        </p>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {stats.invoiceCount} {stats.invoiceCount === 1 ? 'bill' : 'bills'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Selected Supplier In-Depth Overview (7 Cols) */}
        <div ref={selectedSupplierRef} className="lg:col-span-7 space-y-6 min-w-0">
          {selectedSupplier ? (
            <>
              {/* Supplier Profile Card */}
              <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {/* Hero Header */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-inner border border-white/30 shrink-0">
                        {selectedSupplier.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white break-words">
                            {selectedSupplier.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-white/20 text-white border border-white/30 shrink-0">
                            Verified Vendor
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/90 mt-1 font-medium">
                          {selectedSupplier.phone && (
                            <span className="flex items-center gap-1 font-mono bg-black/15 px-2 py-0.5 rounded-md shrink-0">
                              <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                              {selectedSupplier.phone}
                            </span>
                          )}
                          {selectedSupplier.createdAt && (
                            <span className="flex items-center gap-1 text-white/80 shrink-0">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              Partner since {format(new Date(selectedSupplier.createdAt), 'dd MMM yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => navigate('/purchase', { state: { supplier: selectedSupplier, openOrderModal: true } })}
                        className="h-9 px-3 bg-white text-emerald-800 hover:bg-white/90 font-bold shadow-xs border-0 gap-1.5"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        New Order
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(selectedSupplier)}
                        className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(selectedSupplier.id!)}
                        className="h-9 px-3 bg-red-500/20 hover:bg-red-500/40 text-red-100 border-red-300/40 font-semibold"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Business & Legal Credentials Bento Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {/* GSTIN Box */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">GSTIN / Tax ID</span>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1 truncate">
                          {selectedSupplier.gstNumber || <span className="text-slate-400 font-normal italic">Not provided</span>}
                        </p>
                      </div>
                      {selectedSupplier.gstNumber && (
                        <button 
                          onClick={() => copyToClipboard(selectedSupplier.gstNumber!, 'gst')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
                          title="Copy GSTIN"
                        >
                          {copiedField === 'gst' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {/* Drug License Box */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Drug License No.</span>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1 truncate">
                          {selectedSupplier.drugLicenseNo || <span className="text-slate-400 font-normal italic">Not provided</span>}
                        </p>
                      </div>
                      {selectedSupplier.drugLicenseNo && (
                        <button 
                          onClick={() => copyToClipboard(selectedSupplier.drugLicenseNo!, 'dl')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
                          title="Copy Drug License"
                        >
                          {copiedField === 'dl' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {/* Email Box */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Official Email</span>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate break-all">
                          {selectedSupplier.email || <span className="text-slate-400 font-normal italic">Not provided</span>}
                        </p>
                      </div>
                      {selectedSupplier.email && (
                        <button 
                          onClick={() => copyToClipboard(selectedSupplier.email!, 'email')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
                          title="Copy Email"
                        >
                          {copiedField === 'email' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {/* Default Purchase Discount Box */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Default Purchase Discount</span>
                        <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 truncate flex items-center gap-1.5">
                          <span>{selectedSupplier.defaultDiscount !== undefined && selectedSupplier.defaultDiscount !== null ? selectedSupplier.defaultDiscount : 20}%</span>
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">(Auto-applied)</span>
                        </p>
                      </div>
                    </div>

                    {/* Warehouse Address */}
                    <div className="sm:col-span-2 md:col-span-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Warehouse / Depot Address</span>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 leading-relaxed break-words">
                          {selectedSupplier.address || <span className="text-slate-400 font-normal italic">No physical office/depot address recorded.</span>}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Procurement Statistics */}
                  {selectedStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                      <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">Total Spend</p>
                        <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">
                          {formatCurrency(selectedStats.totalSpend)}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 truncate">Purchase Bills</p>
                        <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">
                          {selectedStats.invoiceCount} {selectedStats.invoiceCount === 1 ? 'Bill' : 'Bills'}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 truncate">Supplied Items</p>
                        <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">
                          {selectedStats.products.length} Products
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">Last Procurement</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-1.5 truncate">
                          {selectedStats.lastPurchaseDate ? format(new Date(selectedStats.lastPurchaseDate), 'dd MMM yyyy') : 'No Invoices Yet'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Supplied Products Catalog */}
                  <div className="space-y-3.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                          Products Sourced from {selectedSupplier.name} ({selectedStats?.products.length || 0})
                        </h3>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/purchase')}
                        className="h-8 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 gap-1 self-start sm:self-auto"
                      >
                        <Plus className="w-3 h-3" /> Add Products
                      </Button>
                    </div>

                    {selectedStats && selectedStats.products.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-xs text-left min-w-[560px]">
                          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3">Product Name & Generic</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Pack Unit</th>
                              <th className="p-3 text-right">Purchase Price</th>
                              <th className="p-3 text-right">MRP</th>
                              <th className="p-3 text-center">Live Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {selectedStats.products.map((pr) => (
                              <tr key={pr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                                  <span className="break-words">{pr.name}</span>
                                  {pr.genericName && (
                                    <span className="block text-[11px] text-slate-500 font-normal mt-0.5 break-words">{pr.genericName}</span>
                                  )}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                  {pr.category || 'General'}
                                </td>
                                <td className="p-3 text-slate-700 dark:text-slate-300 font-mono font-medium whitespace-nowrap">
                                  {pr.unit}
                                </td>
                                <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                  {formatCurrency(pr.purchasePrice)}
                                </td>
                                <td className="p-3 text-right font-extrabold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                                  {formatCurrency(pr.mrp)}
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    pr.stockQty <= (pr.reorderLevel || 10)
                                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                      : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  }`}>
                                    {pr.stockQty} in stock
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        No products explicitly linked to this supplier yet. Products will appear here when added with this supplier selected in Purchase.
                      </div>
                    )}
                  </div>

                  {/* Purchase Orders / Bills History */}
                  <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                          Purchase Order Bills History ({selectedStats?.purchases.length || 0})
                        </h3>
                      </div>
                    </div>

                    {selectedStats && selectedStats.purchases.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-xs text-left min-w-[560px]">
                          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Bill / Ref #</th>
                              <th className="p-3">Items</th>
                              <th className="p-3 text-right">Subtotal</th>
                              <th className="p-3 text-right">Grand Total</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center">View</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {selectedStats.purchases.map((pc) => (
                              <tr key={pc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {format(new Date(pc.date), 'dd MMM yyyy')}
                                </td>
                                <td className="p-3 font-mono font-bold text-primary-700 dark:text-primary-400 whitespace-nowrap">
                                  {pc.id?.slice(0, 8).toUpperCase() || 'PO-AUTO'}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                  {pc.items?.length || 0} items
                                </td>
                                <td className="p-3 text-right text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {formatCurrency(pc.subtotal || pc.grandTotal)}
                                </td>
                                <td className="p-3 text-right font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                  {formatCurrency(pc.grandTotal)}
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    {pc.paymentStatus || 'Paid'}
                                  </span>
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewingPurchase(pc)}
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-emerald-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    title="View Bill Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        No purchase invoices recorded for this supplier yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40 text-emerald-500" />
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">Select a supplier to view detailed ledger & catalog</p>
              <p className="text-xs text-slate-500 mt-1">Or click "Add Supplier" to register a wholesale distributor.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {formData.id ? 'Edit Supplier Profile' : 'Add New Wholesale Supplier'}
                </CardTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Save distributor contact credentials, GSTIN, and drug license identifiers.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Supplier / Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="supplier-name-field"
                    required
                    placeholder="e.g. Apex Pharma Agencies / Sun Pharma Distributor"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Mobile / Office Phone
                    </label>
                    <Input
                      id="supplier-phone-field"
                      placeholder="10-digit mobile number"
                      value={formData.phone || ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, phone: val });
                      }}
                      className="mt-1 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Official Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="orders@supplierpharma.com"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      GSTIN / Tax Identification
                    </label>
                    <Input
                      placeholder="e.g. 24AAAAA0000A1Z5"
                      value={formData.gstNumber || ''}
                      onChange={e => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                      className="mt-1 font-mono uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drug License Number
                    </label>
                    <Input
                      placeholder="e.g. DL-20B/21B-87654"
                      value={formData.drugLicenseNo || ''}
                      onChange={e => setFormData({ ...formData, drugLicenseNo: e.target.value })}
                      className="mt-1 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Warehouse / Depot Address
                  </label>
                  <Input
                    placeholder="Godown No, Industrial Area, Street, City"
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Default Purchase Discount %
                  </label>
                  <div className="relative mt-1 w-full max-w-[200px]">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="e.g. 30"
                      value={formData.defaultDiscount !== undefined && formData.defaultDiscount !== null ? formData.defaultDiscount : ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                        setFormData({ ...formData, defaultDiscount: val });
                      }}
                      className="pr-7 font-bold font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Default discount percentage that automatically auto-fills whenever adding products from this supplier in Multiple Products (Row-wise).
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="font-semibold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5">
                  {formData.id ? 'Save Changes' : 'Create Supplier Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Purchase Bill Viewer Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Purchase Bill #{viewingPurchase.id?.slice(0, 8).toUpperCase()}</CardTitle>
                <p className="text-xs text-slate-500 font-medium">{format(new Date(viewingPurchase.date), 'dd MMM yyyy, hh:mm a')}</p>
              </div>
              <button onClick={() => setViewingPurchase(null)} className="text-slate-400 hover:text-slate-600 p-1.5">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="text-xs space-y-1.5 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-700 dark:text-slate-300"><span className="text-slate-500 font-bold">Supplier:</span> <span className="font-bold text-slate-900 dark:text-slate-100">{viewingPurchase.supplierName || selectedSupplier?.name}</span></p>
                <p className="text-slate-700 dark:text-slate-300"><span className="text-slate-500 font-bold">Payment Status:</span> <span className="text-emerald-700 dark:text-emerald-400 font-bold">{viewingPurchase.paymentStatus || 'Paid'}</span></p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">Item Name / ID</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {viewingPurchase.items?.map((it, idx) => {
                      const matchedProd = products.find(p => p.id === it.productId);
                      return (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                            {matchedProd?.name || it.productId?.slice(0, 10) || `Item #${idx + 1}`}
                          </td>
                          <td className="p-2.5 text-center font-bold">{it.qty}</td>
                          <td className="p-2.5 text-right font-medium">{formatCurrency(it.rate)}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-50">{formatCurrency(it.rate * it.qty)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center text-sm font-bold pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">Grand Total</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(viewingPurchase.grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
export default Suppliers;
