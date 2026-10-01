import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea } from "../../components/ui";
import { Search, Plus, Trash2, Edit2, Phone, MapPin, Mail, Stethoscope, UserCheck, X } from "lucide-react";
import { Doctor } from "../../types";
import { toast } from "sonner";
import { useAuthStore } from "../../store/useAuthStore";
import { useAlertModal } from "../../context/AlertModalContext";

export function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();
  const { confirm, alert: showAlert } = useAlertModal();

  const [formData, setFormData] = useState<Partial<Doctor>>({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'doctors'));
    const unsub = onSnapshot(q, (snapshot) => {
      const records: Doctor[] = [];
      snapshot.forEach(d => records.push({ id: d.id, ...d.data() } as Doctor));
      setDoctors(records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching doctors:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredDoctors = doctors.filter(docItem => {
    const s = (search || '').toLowerCase();
    return (
      (docItem?.name || '').toLowerCase().includes(s) || 
      (docItem?.phone && docItem.phone.includes(search)) ||
      (docItem?.email && docItem.email.toLowerCase().includes(s)) ||
      (docItem?.address && docItem.address.toLowerCase().includes(s))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const nameVal = (formData.name || '').trim();
    if (!nameVal) {
      toast.error('Doctor name is required');
      return;
    }

    const phoneVal = (formData.phone || '').trim();
    if (!phoneVal || phoneVal.length !== 10 || !/^\d{10}$/.test(phoneVal)) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    const addressVal = (formData.address || '').trim();
    if (!addressVal) {
      toast.error('Doctor address is required');
      return;
    }

    try {
      const payload: Doctor = {
        name: nameVal,
        phone: phoneVal,
        email: (formData.email || '').trim(),
        address: addressVal,
        createdAt: formData.createdAt || Date.now(),
        createdBy: formData.createdBy || user.id!
      };

      if (formData.id) {
        await setDoc(doc(db, 'doctors', formData.id), payload);
        toast.success("Doctor details updated successfully");
      } else {
        await addDoc(collection(db, 'doctors'), payload);
        toast.success("Doctor added successfully");
      }
      localStorage.removeItem('meditrack_doctor_draft');
      setIsModalOpen(false);
      setFormData({ name: "", phone: "", email: "", address: "" });
    } catch (err: any) {
      console.error("Failed to save doctor:", err);
      toast.error("Failed to save doctor information");
    }
  };

  // Auto-draft for new doctor entry
  useEffect(() => {
    if (isModalOpen && !formData.id) {
      const hasContent = (formData.name || '').trim() || (formData.phone || '').trim() || (formData.email || '').trim() || (formData.address || '').trim();
      if (hasContent) {
        localStorage.setItem('meditrack_doctor_draft', JSON.stringify(formData));
      }
    }
  }, [formData, isModalOpen]);

  const handleDelete = async (id: string, docName: string) => {
    if (!db) return;
    const isConfirmed = await confirm({
      title: "Delete Doctor Profile?",
      message: `Are you sure you want to delete ${docName} from the registered doctors roster?`,
      confirmText: "Yes, Delete Doctor",
      cancelText: "Cancel",
      variant: "danger",
      eyebrow: "DOCTOR DIRECTORY"
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'doctors', id));
        toast.success("Doctor deleted successfully");
      } catch (err: any) {
        console.error("Delete doctor error:", err);
        await showAlert({
          title: "Deletion Failed",
          message: `The system could not remove Dr. "${docName}" from the roster.`,
          problem: err.message || "Database permission or connectivity issue",
          variant: "danger",
          eyebrow: "SYSTEM ERROR",
          confirmText: "Back to Doctors"
        });
      }
    }
  };

  const openAddModal = () => {
    setFormData({ name: "", phone: "", email: "", address: "" });
    const saved = localStorage.getItem('meditrack_doctor_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData({ ...parsed, id: undefined });
      } catch (e) {
        console.error("Failed to restore doctor draft", e);
      }
    }
    setIsModalOpen(true);
  };

  const openEditModal = (d: Doctor) => {
    setFormData(d);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-lg">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Doctors Info</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage registered doctors, contact numbers, and prescription clinic addresses
              </p>
            </div>
          </div>
        </div>
        <Button onClick={openAddModal} className="bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Doctor
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by name, phone, address..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-center font-medium">
          Total Registered Doctors: <span className="font-bold text-slate-900 dark:text-slate-200">{doctors.length}</span>
        </div>
      </div>

      {/* Main List */}
      <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">Loading doctor profiles...</div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <Stethoscope className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                {search ? "No doctors found matching your search" : "No doctor profiles added yet"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {search ? "Try searching with a different name or phone number." : "Add doctor information here to automatically auto-fill doctor name, phone, and address on sales invoices."}
              </p>
              {!search && (
                <Button onClick={openAddModal} variant="outline" className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Doctor
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide border-b-2 border-slate-300 dark:border-slate-700 shadow-sm">
                  <tr>
                    <th className="px-5 py-3.5 text-center">Doctor Name</th>
                    <th className="px-5 py-3.5 text-center">Phone No.</th>
                    <th className="px-5 py-3.5 text-center">Email</th>
                    <th className="px-5 py-3.5 text-center">Clinic / Address</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {filteredDoctors.map((docItem) => (
                    <tr key={docItem.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {docItem.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-xs">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+91 {docItem.phone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {docItem.email ? (
                          <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[200px]">{docItem.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not provided</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs max-w-xs text-left">
                          <MapPin className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                          <span className="line-clamp-2">{docItem.address}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-600 hover:text-primary-600" 
                            onClick={() => openEditModal(docItem)}
                            title="Edit Doctor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" 
                            onClick={() => handleDelete(docItem.id!, docItem.name)}
                            title="Delete Doctor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-700">
            <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  {formData.id ? 'Edit Doctor Info' : 'Add New Doctor'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Doctor Name <span className="text-red-500">*</span>
                </label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. A. K. Banerjee"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number (10 Digits) <span className="text-red-500">*</span>
                </label>
                <Input 
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
                <p className="text-[11px] text-slate-400">Must be exactly 10 digits</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address (Optional)
                </label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g. doctor@clinic.com"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Clinic / Chamber Address <span className="text-red-500">*</span>
                </label>
                <Textarea 
                  required
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="e.g. Apollo Clinic, Park Street, Kolkata - 700016"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-700">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-5">
                  {formData.id ? 'Save Changes' : 'Add Doctor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
