import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "../../components/ui";
import { useSettingsStore, ColorScheme, FontSize, ThemeMode, Density } from "../../store/useSettingsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { 
  Palette, 
  Type, 
  Moon, 
  Sun, 
  Monitor, 
  CheckCircle2, 
  RotateCcw, 
  Building2, 
  Landmark,
  Users, 
  Plus, 
  Trash2, 
  Store, 
  CreditCard, 
  Download, 
  Sparkles, 
  Check, 
  AlertCircle,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  X
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { toast } from 'sonner';
import { 
  firebaseConfig, 
  isFirebaseConfigured, 
  saveCustomFirebaseConfig, 
  clearCustomFirebaseConfig 
} from '../../lib/firebase';
import { 
  getOrganizations, 
  getWorkspaceMembers, 
  addWorkspaceMember, 
  deleteWorkspaceMember, 
  exportActiveTenantData
} from '../../lib/firebase-mock';
import { Organization, User, Role } from '../../types';

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'workspace' ? 'workspace' : 'appearance';
  const [activeTab, setActiveTab] = useState<'workspace' | 'appearance' | 'system'>(initialTab);

  const { themeMode, colorScheme, fontSize, density, setThemeMode, setColorScheme, setFontSize, setDensity, reset } = useSettingsStore();
  const { user, organization, switchWorkspace, updateOrganization } = useAuthStore();
  const { 
    localVersion, 
    localBuildTime, 
    lastChecked, 
    isChecking, 
    hasUpdate, 
    checkForUpdate, 
    simulateUpdate, 
    clearSimulation, 
    refreshApp 
  } = useAppUpdate();

  // Active Workspace Profile form state
  const [orgName, setOrgName] = useState(organization?.name || user?.organizationName || 'MediTrack Cloud Pharmacy');
  const [orgSlug, setOrgSlug] = useState(organization?.slug || user?.organizationSlug || 'main-pharmacy');
  const [orgGst, setOrgGst] = useState(organization?.gstNumber || '');
  const [orgPan, setOrgPan] = useState(organization?.panNumber || '');
  const [orgDrugLicense, setOrgDrugLicense] = useState(organization?.drugLicenseNumber || '');
  const [orgBankName, setOrgBankName] = useState(organization?.bankName || '');
  const [orgAccountNumber, setOrgAccountNumber] = useState(organization?.accountNumber || '');
  const [orgIfscCode, setOrgIfscCode] = useState(organization?.ifscCode || '');
  const [orgPhone, setOrgPhone] = useState(organization?.phone || user?.phone || '');
  const [orgEmail, setOrgEmail] = useState(organization?.email || user?.contactEmail || '');
  const [orgAddress, setOrgAddress] = useState(organization?.address || '');
  const [orgBranches, setOrgBranches] = useState(String(organization?.branchesCount || 1));
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Workspaces list
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [members, setMembers] = useState<User[]>([]);

  // Add Member Modal
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState<Role>('pharmacist');
  const [memberPhone, setMemberPhone] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [dbConfigInput, setDbConfigInput] = useState('');

  const activeTenantId = organization?.id || user?.tenantId || 'tenant_apex';

  const reloadData = () => {
    try {
      const orgs = getOrganizations();
      setAllOrgs(orgs);
      const mems = getWorkspaceMembers(activeTenantId);
      setMembers(mems);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    reloadData();
  }, [activeTenantId]);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setOrgSlug(organization.slug || '');
      setOrgGst(organization.gstNumber || '');
      setOrgPan(organization.panNumber || '');
      setOrgDrugLicense(organization.drugLicenseNumber || '');
      setOrgBankName(organization.bankName || '');
      setOrgAccountNumber(organization.accountNumber || '');
      setOrgIfscCode(organization.ifscCode || '');
      setOrgPhone(organization.phone || '');
      setOrgEmail(organization.email || '');
      setOrgAddress(organization.address || '');
      setOrgBranches(String(organization.branchesCount || 1));
    }
  }, [organization]);

  const handleSaveOrgProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast.error('Organization / Pharmacy name is required');
      return;
    }
    setIsSavingOrg(true);
    try {
      updateOrganization({
        name: orgName.trim(),
        slug: orgSlug.trim() || orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        gstNumber: orgGst.trim(),
        panNumber: orgPan.trim(),
        drugLicenseNumber: orgDrugLicense.trim(),
        bankName: orgBankName.trim(),
        accountNumber: orgAccountNumber.trim(),
        ifscCode: orgIfscCode.trim(),
        phone: orgPhone.trim(),
        email: orgEmail.trim(),
        address: orgAddress.trim(),
        branchesCount: parseInt(orgBranches, 10) || 1,
      });
      reloadData();
      toast.success('Workspace profile updated successfully', {
        description: 'New details will appear on invoices, orders, and receipts.'
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update workspace');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberUsername.trim() || !memberEmail.trim()) {
      toast.error('Name, Username, and Email are required');
      return;
    }

    setIsAddingMember(true);
    try {
      await addWorkspaceMember({
        tenantId: activeTenantId,
        name: memberName.trim(),
        username: memberUsername.trim(),
        email: memberEmail.trim(),
        password: memberPassword || 'meditrack123',
        role: memberRole,
        phone: memberPhone.trim(),
      });
      reloadData();
      toast.success(`Staff member "${memberName}" invited!`, {
        description: `Login username: ${memberUsername} • Role: ${memberRole.toUpperCase()}`
      });
      setMemberName('');
      setMemberUsername('');
      setMemberEmail('');
      setMemberPassword('');
      setMemberPhone('');
      setIsAddMemberOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteMember = (memberId?: string, memberName?: string) => {
    if (!memberId) return;
    if (memberId === user?.id) {
      toast.error('You cannot remove yourself from your active workspace.');
      return;
    }
    deleteWorkspaceMember(memberId);
    reloadData();
    toast.success(`Removed "${memberName || 'Member'}" from workspace`);
  };

  const handleExportData = () => {
    try {
      const exportJson = exportActiveTenantData(activeTenantId);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportJson, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${organization?.slug || 'pharmacy'}-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Workspace backup downloaded successfully!');
    } catch (e: any) {
      toast.error('Failed to export data: ' + e.message);
    }
  };

  const colors: { id: ColorScheme; label: string; class: string }[] = [
    { id: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { id: 'green', label: 'Green', class: 'bg-green-500' },
    { id: 'teal', label: 'Teal', class: 'bg-teal-500' },
    { id: 'violet', label: 'Violet', class: 'bg-violet-500' },
    { id: 'rose', label: 'Rose', class: 'bg-rose-500' },
    { id: 'red', label: 'Red', class: 'bg-red-500' },
    { id: 'orange', label: 'Orange', class: 'bg-orange-500' },
  ];

  const fontSizesList: { id: FontSize; label: string }[] = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
    { id: 'xlarge', label: 'Extra Large' },
  ];

  const modes: { id: ThemeMode; label: string; icon: any }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const densities: { id: Density; label: string; desc: string }[] = [
    { id: 'comfortable', label: 'Comfortable', desc: 'More spacing, easier to read' },
    { id: 'compact', label: 'Compact', desc: 'High density, fit more data' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pharmacy SaaS Settings
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Manage your pharmacy profile, staff access control, invoice branding, and layout.
          </p>
        </div>

        {activeTab === 'appearance' && (
          <Button variant="outline" onClick={reset} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset Appearance
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('workspace');
            setSearchParams({ tab: 'workspace' });
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer",
            activeTab === 'workspace'
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Client Workspace & Staff</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('appearance');
            setSearchParams({ tab: 'appearance' });
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer",
            activeTab === 'appearance'
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance & Theme</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('system');
            setSearchParams({ tab: 'system' });
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer",
            activeTab === 'system'
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          <span>System & Updates</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: WORKSPACE & MULTI-CLIENT MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {/* Active Workspace Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary-900 to-slate-900 text-white border border-primary-800/50 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-600/30 border border-primary-400/40 flex items-center justify-center font-black text-xl text-primary-300">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {organization?.name || user?.organizationName || 'MediTrack Cloud Pharmacy'}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    {organization?.plan || user?.plan || 'Growth'} Plan
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Tenant ID: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-primary-200 font-mono">{activeTenantId}</code>
                  <span className="mx-2">•</span>
                  Status: <span className="text-emerald-400 font-medium">Active & Synchronized</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Workspace (JSON)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Pharmacy Profile & Invoice Settings */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-500" />
                    Pharmacy Legal & Invoice Branding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveOrgProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pharmacy / Clinic Name (Appears on GST Invoices) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. HealthBuddy Chaulkhola Pharmacy"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          GSTIN / Tax Identification
                        </label>
                        <Input
                          type="text"
                          value={orgGst}
                          onChange={(e) => setOrgGst(e.target.value)}
                          placeholder="e.g. 19DRSPS0161Q1ZR"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          PAN Number
                        </label>
                        <Input
                          type="text"
                          value={orgPan}
                          onChange={(e) => setOrgPan(e.target.value)}
                          placeholder="e.g. DRSPS0161Q"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Drug License Number (DL No.)
                        </label>
                        <Input
                          type="text"
                          value={orgDrugLicense}
                          onChange={(e) => setOrgDrugLicense(e.target.value)}
                          placeholder="e.g. DL-20B/21B-98765"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Branch Locations Count
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={orgBranches}
                          onChange={(e) => setOrgBranches(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Contact Phone / Mobile
                        </label>
                        <Input
                          type="tel"
                          value={orgPhone}
                          onChange={(e) => setOrgPhone(e.target.value)}
                          placeholder="e.g. +91 8420023578"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Billing & Order Email
                        </label>
                        <Input
                          type="email"
                          value={orgEmail}
                          onChange={(e) => setOrgEmail(e.target.value)}
                          placeholder="e.g. pharmacy@meditrack.cloud"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Registered Clinic / Pharmacy Address
                      </label>
                      <Input
                        type="text"
                        value={orgAddress}
                        onChange={(e) => setOrgAddress(e.target.value)}
                        placeholder="e.g. Medical Hub, Chaulkhola, Purba Medinipur, WB - 721455"
                      />
                    </div>

                    {/* Pharmacy Owner Bank Details for Invoices */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-primary-500" />
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Pharmacy Owner Bank Details (Printed on Invoices)
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            These bank credentials appear on the sales invoice for RTGS / NEFT / IMPS transfers.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Bank Name
                          </label>
                          <Input
                            type="text"
                            value={orgBankName}
                            onChange={(e) => setOrgBankName(e.target.value)}
                            placeholder="e.g. State Bank of India"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Account Number (A/C No.)
                          </label>
                          <Input
                            type="text"
                            value={orgAccountNumber}
                            onChange={(e) => setOrgAccountNumber(e.target.value)}
                            placeholder="e.g. 38920192847"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            IFSC Code
                          </label>
                          <Input
                            type="text"
                            value={orgIfscCode}
                            onChange={(e) => setOrgIfscCode(e.target.value.toUpperCase())}
                            placeholder="e.g. SBIN0001234"
                            className="uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSavingOrg}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold"
                      >
                        {isSavingOrg ? 'Saving Changes...' : 'Save Workspace Profile'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Team Members List */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-500" />
                    Pharmacy Staff & Clinicians
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setIsAddMemberOpen(true)}
                    className="gap-1.5 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Staff Member
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {members.map((member) => (
                      <div key={member.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center text-sm shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              @{member.username} • {member.contactEmail || member.internalAuthEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border",
                            member.role === 'owner' ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" :
                            member.role === 'admin' ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800" :
                            member.role === 'pharmacist' ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          )}>
                            {member.role}
                          </span>

                          {member.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Client Workspaces Hub */}
            <div className="space-y-6">
              {/* Pharmacy Overview Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-500" />
                    Pharmacy Profile Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Pharmacy</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {orgName || organization?.name || 'Pharmacy Workspace'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">SaaS Plan</span>
                      <span className="text-xs font-extrabold uppercase text-primary-600 dark:text-primary-400">
                        {organization?.plan || user?.plan || 'Growth'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff Count</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{members.length} Members</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">D.L. Number</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                        {orgDrugLicense || organization?.drugLicenseNumber || 'Not configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bank Details</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                        {orgBankName || organization?.bankName ? `${orgBankName || organization?.bankName}` : 'Not configured'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SaaS Plan & Feature Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary-500" />
                    Current SaaS Tier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                        {organization?.plan || 'Growth'} Plan
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </div>
                    <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 pt-2">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Isolated Multi-Tenant Catalog</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>GST Ready Invoicing & Thermal Printing</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Real-Time Stock Audits & Low Stock Alerts</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Unlimited Staff Logins & RBAC</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: APPEARANCE & DISPLAY SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary-500" />
                Theme Color
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setColorScheme(color.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all w-[70px]",
                      colorScheme === color.id ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20" : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", color.class)}>
                      {colorScheme === color.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-xs font-medium">{color.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sun className="w-5 h-5 text-primary-500" />
                Display Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setThemeMode(mode.id)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                      themeMode === mode.id 
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" 
                        : "border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    <mode.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{mode.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Type className="w-5 h-5 text-primary-500" />
                Font Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-400">
                  <span>Small</span>
                  <span>Medium</span>
                  <span>Large</span>
                  <span>Extra Large</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={fontSizesList.findIndex(fs => fs.id === fontSize)}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    if (fontSizesList[idx]) setFontSize(fontSizesList[idx].id);
                  }}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-500" />
                Layout Density
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {densities.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDensity(d.id)}
                    className={cn(
                      "flex flex-col text-left p-3.5 rounded-xl border-2 transition-all",
                      density === d.id
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                        : "border-slate-200 dark:border-slate-700 hover:border-primary-300 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    <span className="font-bold text-sm">{d.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{d.desc}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SYSTEM & APP UPDATES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary-500" />
                App Version & System Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current App Build</p>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">{localVersion}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Architecture</p>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">Multi-Client Cloud SaaS</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update Status</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {hasUpdate ? 'Update Available' : 'Up to Date'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2.5">
                <Button
                  onClick={checkForUpdate}
                  disabled={isChecking}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
                  {isChecking ? 'Checking System...' : 'Check for Updates'}
                </Button>

                {hasUpdate && (
                  <Button onClick={refreshApp} className="bg-primary-600 text-white gap-2 font-bold">
                    <Sparkles className="w-4 h-4" />
                    Install & Reload Application
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cloud Database Connection Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary-500" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Cloud Database & Firebase Sync
                  </CardTitle>
                </div>
                {isFirebaseConfigured ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cloud Database Active
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" /> Offline / Local Storage
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Target Firebase Project:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {firebaseConfig.projectId || 'None (Using Local Mode)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Auth Domain:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-xs">
                    {firebaseConfig.authDomain || 'Local Mock Auth'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    setDbConfigInput(JSON.stringify(firebaseConfig, null, 2));
                    setIsDbConfigOpen(true);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white gap-2 text-xs font-bold"
                >
                  <Database className="w-3.5 h-3.5" />
                  Connect / Update Firebase Credentials
                </Button>

                {isFirebaseConfigured && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Disconnect and clear custom Firebase config?")) {
                        clearCustomFirebaseConfig();
                        toast.info("Firebase custom credentials cleared");
                      }
                    }}
                    className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900"
                  >
                    Disconnect Database
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: ADD STAFF MEMBER */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                Add Staff to {organization?.name || 'Workspace'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAddMemberOpen(false)}
                className="h-8 w-8 text-slate-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Dr. Rajesh Gupta"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="rajesh_rx"
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={memberRole}
                    onChange={(e: any) => setMemberRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="pharmacist">Pharmacist</option>
                    <option value="staff">Staff / Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  placeholder="rajesh@pharmacy.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <Input
                    type="tel"
                    placeholder="9876543210"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password
                  </label>
                  <Input
                    type="text"
                    placeholder="meditrack123"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingMember} className="bg-primary-600 text-white font-bold">
                  {isAddingMember ? 'Adding...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FIREBASE DATABASE CONFIGURATION */}
      {isDbConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-500" />
                Configure Firebase Database
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDbConfigOpen(false)}
                className="h-8 w-8 text-slate-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Paste your Firebase Web App configuration JSON from Firebase Console (Project Settings ➔ General ➔ Your apps):
            </p>

            <textarea
              rows={8}
              value={dbConfigInput}
              onChange={(e) => setDbConfigInput(e.target.value)}
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 mb-4 focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDbConfigOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(dbConfigInput);
                    if (!parsed.projectId || !parsed.apiKey) {
                      toast.error("Invalid configuration: apiKey and projectId are required.");
                      return;
                    }
                    saveCustomFirebaseConfig(parsed);
                    toast.success("Firebase configuration saved! Reloading application...");
                  } catch (_) {
                    toast.error("Please enter a valid JSON object.");
                  }
                }}
                className="bg-primary-600 text-white font-bold"
              >
                Save & Connect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
