import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "../../components/ui";
import { 
  Search, Plus, Trash2, Edit2, Phone, MapPin, Mail, Stethoscope, 
  X, Check, UserCheck, AlertCircle, IndianRupee, TrendingUp,
  Receipt, Calendar, Eye, FileText, ChevronRight, CheckCircle2, User,
  ExternalLink, Sparkles, ArrowUpRight, Users, Copy, CheckCheck,
  ShoppingBag, ArrowRight
} from "lucide-react";
import { Patient, PatientDoctor, Doctor, Sale } from "../../types";
import { toast } from "sonner";
import { useAuthStore } from "../../store/useAuthStore";
import { formatCurrency } from "../../lib/utils";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAlertModal } from "../../context/AlertModalContext";

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [registeredDoctors, setRegisteredDoctors] = useState<Doctor[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isQuickDoctorOpen, setIsQuickDoctorOpen] = useState(false);
  const [quickDoctorForm, setQuickDoctorForm] = useState<PatientDoctor>({
    name: "",
    phone: "",
    email: "",
    address: ""
  });
  const selectedPatientRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { confirm, alert: showAlert } = useAlertModal();

  const [formData, setFormData] = useState<Partial<Patient>>({
    name: "",
    phone: "",
    email: "",
    address: "",
    type: 'sale',
    outstandingBalance: 0,
    doctors: []
  });

  // Doctor inline sub-form state within patient dialog
  const [isDoctorFormOpen, setIsDoctorFormOpen] = useState(false);
  const [editingDoctorIndex, setEditingDoctorIndex] = useState<number | null>(null);
  const [doctorForm, setDoctorForm] = useState<PatientDoctor>({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    if (!db) return;
    const qCust = query(collection(db, 'customers'));
    const unsubCust = onSnapshot(qCust, (snapshot) => {
      const records: Patient[] = [];
      snapshot.forEach(d => {
        const data = d.data() as Patient;
        // Include sale type or records without purchase type
        if (data.type === 'sale' || !data.type) {
          records.push({ id: d.id, ...data });
        }
      });
      setPatients(records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setLoading(false);
    });

    const qDocs = query(collection(db, 'doctors'));
    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      const docsList: Doctor[] = [];
      snapshot.forEach(d => docsList.push({ id: d.id, ...d.data() } as Doctor));
      setRegisteredDoctors(docsList);
    });

    const qSales = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const salesList: Sale[] = [];
      snapshot.forEach(d => salesList.push({ id: d.id, ...d.data() } as Sale));
      setSales(salesList);
    });

    return () => {
      unsubCust();
      unsubDocs();
      unsubSales();
    };
  }, []);

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Comprehensive calculation of all unique Prescribing Doctors across:
  // 1. Registered doctors collection
  // 2. All patient assigned doctors
  // 3. Historical doctor names recorded in sales invoices
  const allDistinctPrescribingDoctors = useMemo(() => {
    const docMap = new Map<string, { name: string; phone?: string; address?: string; count: number }>();
    
    // From registered doctors collection
    registeredDoctors.forEach(d => {
      if (d.name && d.name.trim()) {
        const key = d.name.trim().toLowerCase();
        docMap.set(key, { 
          name: d.name.trim(), 
          phone: d.phone?.trim() || "", 
          address: d.address?.trim() || "", 
          count: 1 
        });
      }
    });

    // From all patient records
    patients.forEach(p => {
      (p.doctors || []).forEach(d => {
        if (d.name && d.name.trim()) {
          const key = d.name.trim().toLowerCase();
          const existing = docMap.get(key);
          if (existing) {
            existing.count += 1;
            if (!existing.phone && d.phone) existing.phone = d.phone.trim();
            if (!existing.address && d.address) existing.address = d.address.trim();
          } else {
            docMap.set(key, { 
              name: d.name.trim(), 
              phone: d.phone?.trim() || "", 
              address: d.address?.trim() || "", 
              count: 1 
            });
          }
        }
      });
    });

    // From historical sales invoices
    sales.forEach(s => {
      const docName = (s.doctorName || '').trim();
      if (docName && docName.toLowerCase() !== 'self' && docName.toLowerCase() !== 'none') {
        const key = docName.toLowerCase();
        const existing = docMap.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.phone && s.doctorPhone) existing.phone = s.doctorPhone.trim();
          if (!existing.address && s.doctorAddress) existing.address = s.doctorAddress.trim();
        } else {
          docMap.set(key, { 
            name: docName, 
            phone: s.doctorPhone?.trim() || "", 
            address: s.doctorAddress?.trim() || "", 
            count: 1 
          });
        }
      }
    });

    return Array.from(docMap.values());
  }, [registeredDoctors, patients, sales]);

  const totalPrescribingDoctorsCount = allDistinctPrescribingDoctors.length;

  const filteredPatients = useMemo(() => {
    const term = (search || '').toLowerCase().trim();
    if (!term) return patients;
    return patients.filter(c => {
      const cName = (c?.name || '').toLowerCase();
      const cPhone = c?.phone || '';
      const cEmail = (c?.email || '').toLowerCase();
      const cAddr = (c?.address || '').toLowerCase();
      const docMatch = Array.isArray(c?.doctors) && c.doctors.some((d: any) => {
        const dName = typeof d === 'string' ? d : d?.name || '';
        return dName.toLowerCase().includes(term);
      });
      return cName.includes(term) || cPhone.includes(term) || cEmail.includes(term) || cAddr.includes(term) || docMatch;
    });
  }, [patients, search]);

  // Turnover & Sales Analytics helper for any patient
  const getPatientTurnoverStats = (patient: Patient) => {
    const custPhone = (patient.phone || '').trim();
    const custName = (patient.name || '').trim().toLowerCase();

    const matchedSales = sales.filter(s => {
      if (custPhone) {
        if (s.patientPhone && s.patientPhone.trim() === custPhone) return true;
        if (s.customerPhone && s.customerPhone.trim() === custPhone) return true;
      }
      if (custName) {
        if (s.patientName && s.patientName.trim().toLowerCase() === custName) return true;
        if (s.customerName && s.customerName.trim().toLowerCase() === custName) return true;
        if (s.billTo && s.billTo.trim().toLowerCase() === custName) return true;
      }
      return false;
    });

    const completedSales = matchedSales.filter(s => s.status !== 'returned');
    const turnover = completedSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
    const invoicesCount = completedSales.length;
    const avgOrderValue = invoicesCount > 0 ? turnover / invoicesCount : 0;
    const lastPurchase = completedSales.length > 0 ? completedSales[0].date : null;

    return {
      turnover,
      invoicesCount,
      avgOrderValue,
      lastPurchase,
      sales: matchedSales
    };
  };

  const selectedPatient = useMemo(() => {
    if (selectedPatientId) {
      const found = patients.find(c => c.id === selectedPatientId);
      if (found) return found;
    }
    return patients[0] || null;
  }, [patients, selectedPatientId]);

  const selectedStats = useMemo(() => {
    if (!selectedPatient) return null;
    return getPatientTurnoverStats(selectedPatient);
  }, [selectedPatient, sales]);

  // Prescribing doctors discovered from past sales invoices
  const historicalDoctors = useMemo(() => {
    if (!selectedStats || !selectedPatient) return [];
    const assignedNames = new Set(
      (selectedPatient.doctors || []).map((d: any) => {
        const dName = typeof d === 'string' ? d : d?.name || '';
        return dName.toLowerCase().trim();
      })
    );

    const docMap = new Map<string, { name: string; phone: string; address: string; lastInvoice: string; lastDate: number }>();

    for (const sale of selectedStats.sales) {
      const docName = (sale.doctorName || '').trim();
      if (!docName || docName.toLowerCase() === 'self' || docName.toLowerCase() === 'none' || assignedNames.has(docName.toLowerCase())) {
        continue;
      }
      const key = docName.toLowerCase();
      if (!docMap.has(key)) {
        docMap.set(key, {
          name: docName,
          phone: sale.doctorPhone?.trim() || '',
          address: sale.doctorAddress?.trim() || '',
          lastInvoice: sale.invoiceNo,
          lastDate: sale.date
        });
      }
    }

    return Array.from(docMap.values());
  }, [selectedPatient, selectedStats]);

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    selectedPatientRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSaveQuickDoctor = async () => {
    if (!quickDoctorForm.name.trim()) {
      toast.error("Doctor name is required");
      return;
    }
    if (!db || !selectedPatient || !selectedPatient.id) return;
    const currentDoctors = selectedPatient.doctors ? [...selectedPatient.doctors] : [];
    const newDoc: PatientDoctor = {
      id: `doc_${Date.now()}`,
      name: quickDoctorForm.name.trim(),
      phone: quickDoctorForm.phone?.trim() || "",
      email: quickDoctorForm.email?.trim() || "",
      address: quickDoctorForm.address?.trim() || ""
    };
    currentDoctors.push(newDoc);
    try {
      await setDoc(doc(db, 'customers', selectedPatient.id), {
        ...selectedPatient,
        doctors: currentDoctors
      });
      toast.success(`Attached Dr. "${newDoc.name}" to ${selectedPatient.name}`);
      setIsQuickDoctorOpen(false);
      setQuickDoctorForm({ name: "", phone: "", email: "", address: "" });
    } catch (e) {
      toast.error("Failed to add doctor");
      console.error(e);
    }
  };

  const handleAttachPrescribingDoctor = async (docData: { name: string; phone: string; address: string }) => {
    if (!db || !selectedPatient || !selectedPatient.id) return;
    const currentDoctors = selectedPatient.doctors ? [...selectedPatient.doctors] : [];
    const newDoc: PatientDoctor = {
      id: `doc_${Date.now()}`,
      name: docData.name,
      phone: docData.phone,
      address: docData.address,
      email: ""
    };
    currentDoctors.push(newDoc);
    try {
      await setDoc(doc(db, 'customers', selectedPatient.id), {
        ...selectedPatient,
        doctors: currentDoctors
      });
      toast.success(`Saved Dr. "${docData.name}" to ${selectedPatient.name}'s assigned doctors`);
    } catch (e) {
      toast.error("Failed to attach doctor");
    }
  };

  const handleRemoveDoctorFromSelected = async (docIndex: number) => {
    if (!db || !selectedPatient || !selectedPatient.id) return;
    const currentDoctors = selectedPatient.doctors ? [...selectedPatient.doctors] : [];
    const removed = currentDoctors[docIndex];
    const docName = removed?.name || "this doctor";

    const isConfirmed = await confirm({
      title: "Remove Doctor Reference?",
      message: `Are you sure you want to detach Dr. "${docName}" from patient "${selectedPatient.name}"? Past sale invoices referencing this doctor will not be affected.`,
      confirmText: "Yes, Remove Doctor",
      cancelText: "Keep Doctor",
      variant: "warning",
      eyebrow: "PATIENT PROFILE"
    });

    if (!isConfirmed) return;
    currentDoctors.splice(docIndex, 1);
    try {
      await setDoc(doc(db, 'customers', selectedPatient.id), {
        ...selectedPatient,
        doctors: currentDoctors
      });
      toast.info(`Removed Dr. "${docName}"`);
    } catch (e) {
      toast.error("Failed to remove doctor");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const phoneVal = (formData.phone || '').trim();
    if (!phoneVal || phoneVal.length !== 10 || !/^\d{10}$/.test(phoneVal)) {
      toast.error('Mobile phone number must be exactly 10 digits');
      return;
    }

    try {
      const payload: Patient = {
        name: (formData.name || "").trim(),
        phone: phoneVal,
        email: (formData.email || "").trim(),
        address: (formData.address || "").trim(),
        type: 'sale',
        outstandingBalance: formData.outstandingBalance || 0,
        doctors: formData.doctors || [],
        createdAt: formData.createdAt || Date.now(),
        createdBy: formData.createdBy || user.id!
      };

      if (formData.id) {
        await setDoc(doc(db, 'customers', formData.id), payload);
        toast.success(`Patient "${payload.name}" updated successfully`);
      } else {
        await addDoc(collection(db, 'customers'), payload);
        toast.success(`Patient "${payload.name}" added successfully`);
      }
      localStorage.removeItem(`meditrack_patient_draft`);
      setIsModalOpen(false);
      resetModalState();
    } catch (err) {
      toast.error(`Failed to save patient`);
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    const targetPatient = patients.find(p => p.id === id);
    const patientName = targetPatient?.name || "this patient";

    const isConfirmed = await confirm({
      title: "Delete Patient Record?",
      message: `Are you sure you want to delete the record for "${patientName}"? Historical sales, prescription links, and billing ledger records will be preserved for accounting integrity.`,
      confirmText: "Yes, Delete Record",
      cancelText: "Cancel",
      variant: "danger",
      eyebrow: "PATIENT DIRECTORY"
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'customers', id));
        toast.success(`Patient record deleted`);
      } catch (err: any) {
        console.error("Deletion error:", err);
        await showAlert({
          title: "Deletion Failed",
          message: `The system could not delete the record for "${patientName}".`,
          problem: err.message || "Database permission or connectivity issue",
          variant: "danger",
          eyebrow: "SYSTEM ERROR",
          confirmText: "Back to Directory"
        });
      }
    }
  };

  // Auto-draft for new patient entry
  useEffect(() => {
    if (isModalOpen && !formData.id) {
      const draftKey = `meditrack_patient_draft`;
      const hasContent = (formData.name || '').trim() || (formData.phone || '').trim() || (formData.email || '').trim() || (formData.address || '').trim();
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
      type: 'sale', 
      outstandingBalance: 0,
      doctors: []
    });
    setDoctorForm({ name: "", phone: "", email: "", address: "" });
    setIsDoctorFormOpen(false);
    setEditingDoctorIndex(null);
  };

  const openAddModal = () => {
    resetModalState();
    const draftKey = `meditrack_patient_draft`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData({ ...parsed, type: 'sale', id: undefined });
      } catch (e) {
        console.error("Failed to restore patient draft:", e);
      }
    }
    setIsModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setFormData({
      ...patient,
      doctors: patient.doctors ? [...patient.doctors] : []
    });
    setDoctorForm({ name: "", phone: "", email: "", address: "" });
    setIsDoctorFormOpen(false);
    setEditingDoctorIndex(null);
    setIsModalOpen(true);
  };

  // Doctor handling within patient modal
  const handleSaveDoctor = () => {
    if (!doctorForm.name.trim()) {
      toast.error("Doctor name is required");
      return;
    }

    const currentDoctors = formData.doctors ? [...formData.doctors] : [];
    const newDoc: PatientDoctor = {
      id: doctorForm.id || `doc_${Date.now()}`,
      name: doctorForm.name.trim(),
      phone: doctorForm.phone?.trim() || "",
      email: doctorForm.email?.trim() || "",
      address: doctorForm.address?.trim() || ""
    };

    if (editingDoctorIndex !== null && editingDoctorIndex >= 0) {
      currentDoctors[editingDoctorIndex] = newDoc;
      toast.success(`Updated Dr. "${newDoc.name}"`);
    } else {
      currentDoctors.push(newDoc);
      toast.success(`Added Dr. "${newDoc.name}"`);
    }

    setFormData({ ...formData, doctors: currentDoctors });
    setDoctorForm({ name: "", phone: "", email: "", address: "" });
    setIsDoctorFormOpen(false);
    setEditingDoctorIndex(null);
  };

  const handleEditDoctor = (index: number) => {
    if (!formData.doctors || !formData.doctors[index]) return;
    setDoctorForm(formData.doctors[index]);
    setEditingDoctorIndex(index);
    setIsDoctorFormOpen(true);
  };

  const handleRemoveDoctor = (index: number) => {
    if (!formData.doctors) return;
    const removed = formData.doctors[index];
    const updated = formData.doctors.filter((_, i) => i !== index);
    setFormData({ ...formData, doctors: updated });
    toast.info(`Removed Dr. "${removed.name}"`);
  };

  const handleSelectRegisteredDoctor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const docId = e.target.value;
    if (!docId) return;
    const matched = registeredDoctors.find(d => d.id === docId);
    if (matched) {
      setDoctorForm({
        name: matched.name,
        phone: matched.phone || "",
        email: matched.email || "",
        address: matched.address || ""
      });
    }
  };

  // Summary Metrics
  const totalPatientsCount = patients.length;
  const totalPatientTurnover = useMemo(() => {
    return sales
      .filter(s => s.status !== 'returned')
      .reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  }, [sales]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 break-words">
                Patient Information & Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium break-words">
                Comprehensive patient medical profiles, assigned prescribing doctors, and prescription purchase ledgers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <Button 
            id="add-patient-btn" 
            onClick={openAddModal} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 h-10 px-5"
          >
            <Plus className="w-4 h-4" /> Add New Patient
          </Button>
        </div>
      </div>

      {/* Analytics Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Patients */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-slate-900 dark:to-indigo-950/30 border-blue-200/80 dark:border-blue-900/50 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 truncate">Total Patients</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">{totalPatientsCount}</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 truncate">Active registered customer accounts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Retail Sales */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-slate-900 dark:to-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">Total Patient Sales</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">{formatCurrency(totalPatientTurnover)}</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 truncate">{sales.length} completed retail invoices</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Prescribing Doctors */}
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50/40 dark:from-slate-900 dark:to-teal-950/30 border-teal-200/80 dark:border-teal-900/50 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 truncate">Prescribing Doctors</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">{totalPrescribingDoctorsCount}</h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 truncate">Unique practitioners linked</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-2xs shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Patient Directory List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 min-w-0">
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-600" />
                  Patient Directory
                </CardTitle>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  {filteredPatients.length} of {patients.length}
                </span>
              </div>
              <div className="relative mt-2.5">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="patient-search-input"
                  placeholder="Search by name, phone, doctor, address..."
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
                <div className="p-10 text-center text-sm font-medium text-slate-600 dark:text-slate-400">Loading patient records...</div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No patients found</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {search ? `No patient profiles match "${search}"` : "Get started by adding your first patient profile."}
                  </p>
                  {!search && (
                    <Button size="sm" onClick={openAddModal} className="mt-2 bg-primary-600 hover:bg-primary-700 text-white">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Patient
                    </Button>
                  )}
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  const stats = getPatientTurnoverStats(p);
                  const docsCount = p.doctors?.length || 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id!)}
                      className={`p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 border ${
                        isSelected 
                          ? 'bg-primary-50/90 dark:bg-primary-950/40 border-primary-400 dark:border-primary-700 shadow-sm ring-1 ring-primary-400/50' 
                          : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold shrink-0 text-sm sm:text-base shadow-2xs ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate text-slate-900 dark:text-slate-50">
                            {p.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs mt-0.5">
                            <span className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <Phone className="w-3 h-3 text-primary-500 shrink-0" />
                              {p.phone}
                            </span>
                            {docsCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 shrink-0">
                                <Stethoscope className="w-2.5 h-2.5" />
                                {docsCount} {docsCount === 1 ? 'Doc' : 'Docs'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(stats.turnover)}
                        </p>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {stats.invoicesCount} {stats.invoicesCount === 1 ? 'visit' : 'visits'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Selected Patient Profile & History (7 Cols) */}
        <div ref={selectedPatientRef} className="lg:col-span-7 space-y-6 min-w-0">
          {selectedPatient ? (
            <>
              {/* Patient Profile Card */}
              <Card className="shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {/* Hero Header */}
                <div className="p-4 sm:p-6 bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-inner border border-white/30 shrink-0">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white break-words">
                            {selectedPatient.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-white/20 text-white border border-white/30 shrink-0">
                            Active Patient
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/90 mt-1 font-medium">
                          <span className="flex items-center gap-1 font-mono bg-black/15 px-2 py-0.5 rounded-md shrink-0">
                            <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                            {selectedPatient.phone}
                          </span>
                          {selectedPatient.createdAt && (
                            <span className="flex items-center gap-1 text-white/80 shrink-0">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              Registered {format(new Date(selectedPatient.createdAt), 'dd MMM yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => navigate('/sales', { state: { patient: selectedPatient } })}
                        className="h-9 px-3 bg-white text-primary-700 hover:bg-white/90 font-bold shadow-xs border-0 gap-1.5"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        New Bill
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(selectedPatient)}
                        className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(selectedPatient.id!)}
                        className="h-9 px-3 bg-red-500/20 hover:bg-red-500/40 text-red-100 border-red-300/40 font-semibold"
                        title="Delete Patient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* Contact & Demographics Bento Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Phone Number Box */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mobile Phone</span>
                        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 truncate">
                          {selectedPatient.phone}
                        </p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(selectedPatient.phone, 'phone')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
                        title="Copy Phone"
                      >
                        {copiedField === 'phone' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Email Address Box */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</span>
                        <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate break-all">
                          {selectedPatient.email || <span className="text-slate-400 font-normal italic">Not provided</span>}
                        </p>
                      </div>
                      {selectedPatient.email && (
                        <button 
                          onClick={() => copyToClipboard(selectedPatient.email!, 'email')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
                          title="Copy Email"
                        >
                          {copiedField === 'email' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {/* Address Box */}
                    <div className="sm:col-span-2 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Residential Address / Area</span>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 leading-relaxed break-words">
                          {selectedPatient.address || <span className="text-slate-400 font-normal italic">No residential address recorded.</span>}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Financial & Visit Analytics Tiles */}
                  {selectedStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                      <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">Total Purchases</p>
                        <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">
                          {formatCurrency(selectedStats.turnover)}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 truncate">Total Visits</p>
                        <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">
                          {selectedStats.invoicesCount} {selectedStats.invoicesCount === 1 ? 'Bill' : 'Bills'}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 truncate">Average Bill</p>
                        <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1 truncate">
                          {formatCurrency(selectedStats.avgOrderValue)}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">Last Visit</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-1.5 truncate">
                          {selectedStats.lastPurchase ? format(new Date(selectedStats.lastPurchase), 'dd MMM yyyy') : 'No Visits Yet'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Connected Doctors Management */}
                  <div className="space-y-3.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                            Assigned Prescribing Doctors
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(selectedPatient.doctors?.length || 0)} clinical {selectedPatient.doctors?.length === 1 ? 'practitioner' : 'practitioners'} attached
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsQuickDoctorOpen(!isQuickDoctorOpen)}
                        className="h-8 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800 hover:bg-teal-100 self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {isQuickDoctorOpen ? 'Cancel' : 'Attach Doctor'}
                      </Button>
                    </div>

                    {/* Quick Add Doctor Box */}
                    {isQuickDoctorOpen && (
                      <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border-2 border-teal-300 dark:border-teal-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-teal-600" />
                            Attach New Doctor to {selectedPatient.name}
                          </p>
                          <button onClick={() => setIsQuickDoctorOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            placeholder="Doctor Name (e.g. Dr. A. K. Sen) *"
                            value={quickDoctorForm.name}
                            onChange={e => setQuickDoctorForm({ ...quickDoctorForm, name: e.target.value })}
                            className="h-9 text-xs font-medium bg-white dark:bg-slate-900"
                          />
                          <Input
                            placeholder="Doctor Phone (10 digits)"
                            value={quickDoctorForm.phone}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setQuickDoctorForm({ ...quickDoctorForm, phone: val });
                            }}
                            className="h-9 text-xs font-mono bg-white dark:bg-slate-900"
                          />
                          <Input
                            placeholder="Clinic / Chamber Address (Optional)"
                            value={quickDoctorForm.address}
                            onChange={e => setQuickDoctorForm({ ...quickDoctorForm, address: e.target.value })}
                            className="h-9 text-xs sm:col-span-2 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" onClick={() => setIsQuickDoctorOpen(false)} className="h-8 text-xs font-semibold">
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveQuickDoctor} className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white">
                            Save & Attach Doctor
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Assigned Doctors Cards */}
                    {selectedPatient.doctors && selectedPatient.doctors.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedPatient.doctors.map((docItem: any, idx) => {
                          const docName = typeof docItem === 'string' ? docItem : docItem?.name || 'Doctor';
                          const docPhone = typeof docItem === 'object' ? docItem?.phone : '';
                          const docAddress = typeof docItem === 'object' ? docItem?.address : '';
                          return (
                            <div
                              key={docItem.id || idx}
                              className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-slate-800/90 flex items-start justify-between gap-3 shadow-2xs min-w-0"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                                  <span className="truncate">Dr. {docName.replace(/^Dr\.?\s*/i, '')}</span>
                                </p>
                                {docPhone && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-1 flex items-center gap-1 truncate">
                                    <Phone className="w-3 h-3 text-teal-600 shrink-0" />
                                    <span className="truncate">{docPhone}</span>
                                  </p>
                                )}
                                {docAddress && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{docAddress}</span>
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemoveDoctorFromSelected(idx)}
                                title="Remove doctor"
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          No prescribing doctors currently linked to this patient.
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setIsQuickDoctorOpen(true)}
                          className="mt-2 h-7 text-xs text-teal-700 dark:text-teal-300"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Attach Prescribing Doctor
                        </Button>
                      </div>
                    )}

                    {/* Auto-Discovered Prescribing Doctors from Sales History */}
                    {historicalDoctors.length > 0 && (
                      <div className="mt-3 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="truncate">Discovered Doctors from Sales Invoices (1-Click to Attach)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {historicalDoctors.map((hd, i) => (
                            <button
                              key={i}
                              onClick={() => handleAttachPrescribingDoctor(hd)}
                              className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/80 rounded-lg text-amber-950 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all font-bold shadow-2xs max-w-full truncate"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-600 font-bold shrink-0" />
                              <span className="truncate">Dr. {hd.name.replace(/^Dr\.?\s*/i, '')}</span>
                              {hd.phone && <span className="font-normal text-[11px] opacity-75 shrink-0">({hd.phone})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Purchase & Prescription Sales History */}
                  <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                          Sales & Prescription History ({selectedStats?.sales.length || 0})
                        </h3>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/sales', { state: { patient: selectedPatient } })}
                        className="h-8 text-xs font-semibold gap-1 text-primary-600 dark:text-primary-400 self-start sm:self-auto"
                      >
                        <Plus className="w-3 h-3" /> New Invoice
                      </Button>
                    </div>

                    {selectedStats && selectedStats.sales.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-xs text-left min-w-[540px]">
                          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-3">Invoice #</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Prescribing Doctor</th>
                              <th className="p-3">Items</th>
                              <th className="p-3 text-right">Amount</th>
                              <th className="p-3 text-center">View</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {selectedStats.sales.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-3 font-mono font-bold text-primary-700 dark:text-primary-400 whitespace-nowrap">
                                  {s.invoiceNo}
                                </td>
                                <td className="p-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {format(new Date(s.date), 'dd MMM yyyy')}
                                </td>
                                <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {s.doctorName && s.doctorName.toLowerCase() !== 'self' ? `Dr. ${s.doctorName.replace(/^Dr\.?\s*/i, '')}` : <span className="text-slate-400 font-normal">Over-the-counter</span>}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                                  {s.items?.length || 0} items
                                </td>
                                <td className="p-3 text-right font-extrabold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                                  {formatCurrency(s.grandTotal)}
                                </td>
                                <td className="p-3 text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewingSale(s)}
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-primary-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    title="View Invoice"
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
                        No retail sales invoices recorded for this patient yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40 text-primary-500" />
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">Select a patient to view full history & doctor links</p>
              <p className="text-xs text-slate-500 mt-1">Or click "Add New Patient" to register a new customer.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Add / Edit Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {formData.id ? 'Edit Patient Profile' : 'Add New Patient'}
                </CardTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Save patient contact details and link their prescribing clinical doctors.
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
                    Patient Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="patient-name-field"
                    required
                    placeholder="e.g. Ramesh Kumar / Ananya Das"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Mobile Number (10 Digits) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="patient-phone-field"
                      required
                      placeholder="e.g. 9876543210"
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
                      Email Address (Optional)
                    </label>
                    <Input
                      type="email"
                      placeholder="patient@example.com"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Residential / Chamber Address
                  </label>
                  <Input
                    placeholder="House No., Street, Area, City"
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Doctors Section in Patient Dialog */}
              <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    Prescribing Doctors ({(formData.doctors?.length || 0)})
                  </label>
                  {!isDoctorFormOpen && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDoctorForm({ name: "", phone: "", email: "", address: "" });
                        setEditingDoctorIndex(null);
                        setIsDoctorFormOpen(true);
                      }}
                      className="h-8 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Doctor
                    </Button>
                  )}
                </div>

                {isDoctorFormOpen && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {editingDoctorIndex !== null ? 'Edit Doctor Details' : 'Add Prescribing Doctor'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDoctorFormOpen(false);
                          setEditingDoctorIndex(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {registeredDoctors.length > 0 && editingDoctorIndex === null && (
                      <div>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">Pick from Registered Practitioners</label>
                        <select
                          onChange={handleSelectRegisteredDoctor}
                          defaultValue=""
                          className="w-full mt-1 h-9 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-slate-900 dark:text-slate-100 font-medium"
                        >
                          <option value="">-- Choose registered doctor --</option>
                          {registeredDoctors.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.phone ? `(${d.phone})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Doctor Full Name *"
                        value={doctorForm.name}
                        onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })}
                        className="h-9 text-xs font-medium"
                      />
                      <Input
                        placeholder="Doctor Phone Number (10 Digits)"
                        value={doctorForm.phone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setDoctorForm({ ...doctorForm, phone: val });
                        }}
                        className="h-9 text-xs font-mono"
                      />
                      <Input
                        placeholder="Clinic / Chamber Address (Optional)"
                        value={doctorForm.address}
                        onChange={e => setDoctorForm({ ...doctorForm, address: e.target.value })}
                        className="h-9 text-xs sm:col-span-2"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsDoctorFormOpen(false);
                          setEditingDoctorIndex(null);
                        }}
                        className="h-8 text-xs font-semibold"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveDoctor}
                        className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        {editingDoctorIndex !== null ? 'Update Doctor' : 'Save Doctor'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Attached Doctors List in Form */}
                {formData.doctors && formData.doctors.length > 0 ? (
                  <div className="space-y-2">
                    {formData.doctors.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-800/80 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Dr. {doc.name.replace(/^Dr\.?\s*/i, '')}
                          </span>
                          {doc.phone && <span className="text-slate-500 font-mono ml-2 font-medium">({doc.phone})</span>}
                          {doc.address && <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.address}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditDoctor(idx)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoctor(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No doctors attached to this patient yet.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="font-semibold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5">
                  {formData.id ? 'Save Changes' : 'Create Patient Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Sale Invoice Details Viewer Modal */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Invoice #{viewingSale.invoiceNo}</CardTitle>
                <p className="text-xs text-slate-500 font-medium">{format(new Date(viewingSale.date), 'dd MMM yyyy, hh:mm a')}</p>
              </div>
              <button onClick={() => setViewingSale(null)} className="text-slate-400 hover:text-slate-600 p-1.5">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="text-xs space-y-1.5 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-700 dark:text-slate-300"><span className="text-slate-500 font-bold">Patient:</span> <span className="font-bold text-slate-900 dark:text-slate-100">{viewingSale.patientName || selectedPatient?.name}</span></p>
                <p className="text-slate-700 dark:text-slate-300"><span className="text-slate-500 font-bold">Doctor:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSale.doctorName ? `Dr. ${viewingSale.doctorName}` : 'Self'}</span></p>
                <p className="text-slate-700 dark:text-slate-300"><span className="text-slate-500 font-bold">Payment Method:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSale.paymentMode || 'Cash'}</span></p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {viewingSale.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{it.name}</td>
                        <td className="p-2.5 text-center font-bold">{it.qty}</td>
                        <td className="p-2.5 text-right font-medium">{formatCurrency(it.rate)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-50">{formatCurrency(it.rate * it.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center text-sm font-bold pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">Grand Total</span>
                <span className="text-primary-600 dark:text-primary-400 text-lg">{formatCurrency(viewingSale.grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
export default Patients;
