import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  Layers, 
  Settings as SettingsIcon, 
  Sparkles, 
  ShieldCheck, 
  Store, 
  ArrowRight,
  X,
  Search,
  Users
} from 'lucide-react';
import { Button, Input } from '../ui';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  getOrganizations, 
  createClientWorkspace, 
  switchWorkspace as switchWorkspaceMock 
} from '../../lib/firebase-mock';
import { Organization } from '../../types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean;
}

export function WorkspaceSwitcher({ isCollapsed = false }: WorkspaceSwitcherProps) {
  const { user, organization, switchWorkspace } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // New Workspace form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<'starter' | 'growth' | 'enterprise'>('growth');
  const [newOrgGst, setNewOrgGst] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [newOrgBranches, setNewOrgBranches] = useState('1');
  const [isCreating, setIsCreating] = useState(false);

  // Load organizations
  const refreshOrganizations = () => {
    try {
      const orgs = getOrganizations();
      setOrganizations(orgs);
    } catch (e) {
      console.error('Failed to load organizations:', e);
    }
  };

  useEffect(() => {
    refreshOrganizations();
  }, [isOpen, isCreateModalOpen]);

  const currentOrg = organization || (user?.tenantId ? {
    id: user.tenantId,
    name: user.organizationName || 'MediTrack Cloud Pharmacy',
    slug: user.organizationSlug || 'main-pharmacy',
    plan: user.plan || 'growth',
    ownerId: user.id || 'owner_1',
    createdAt: Date.now(),
    status: 'active' as const,
    branchesCount: 1
  } : null);

  const handleSelectWorkspace = (org: Organization) => {
    if (org.id === currentOrg?.id) {
      setIsOpen(false);
      return;
    }
    switchWorkspace(org);
    toast.success(`Switched to ${org.name}`, {
      description: `Active plan: ${org.plan?.toUpperCase()} • All inventory and billing are now scoped to this pharmacy.`
    });
    setIsOpen(false);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      toast.error('Please enter a pharmacy/organization name');
      return;
    }

    setIsCreating(true);
    try {
      const createdOrg = await createClientWorkspace({
        name: newOrgName.trim(),
        plan: newOrgPlan,
        gstNumber: newOrgGst.trim(),
        phone: newOrgPhone.trim(),
        email: newOrgEmail.trim() || user?.contactEmail || '',
        address: newOrgAddress.trim(),
        branchesCount: parseInt(newOrgBranches, 10) || 1,
        ownerName: user?.name
      });

      refreshOrganizations();
      switchWorkspace(createdOrg);
      
      toast.success(`Workspace "${createdOrg.name}" created successfully!`, {
        description: 'Starter medicine catalog and tax configurations have been initialized.'
      });

      // Reset form
      setNewOrgName('');
      setNewOrgGst('');
      setNewOrgPhone('');
      setNewOrgEmail('');
      setNewOrgAddress('');
      setIsCreateModalOpen(false);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create client workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredOrgs = (organizations || []).filter(org => 
    (org?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (org?.slug || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'enterprise':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">ENTERPRISE</span>;
      case 'growth':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">GROWTH</span>;
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">STARTER</span>;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all text-left shadow-2xs group cursor-pointer ${
            isCollapsed ? 'justify-center w-full px-2' : 'w-full'
          }`}
          title={isCollapsed ? (currentOrg?.name || 'Client Workspace') : undefined}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Store className="w-4 h-4" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {currentOrg?.name || 'MediTrack Cloud'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getPlanBadge(currentOrg?.plan)}
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {currentOrg?.branchesCount || 1} {Number(currentOrg?.branchesCount || 1) > 1 ? 'Branches' : 'Branch'}
                </span>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-primary-500" />
                    <span>Client Workspaces</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {organizations.length} {organizations.length === 1 ? 'Client' : 'Clients'}
                  </span>
                </div>
                
                {/* Search input if more than 2 orgs */}
                {organizations.length > 2 && (
                  <div className="relative mt-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search workspace..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-primary-500"
                    />
                  </div>
                )}
              </div>

              {/* Workspaces List */}
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                {filteredOrgs.map((org) => {
                  const isCurrent = org.id === currentOrg?.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSelectWorkspace(org)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                        isCurrent 
                          ? 'bg-primary-50/80 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 shadow-2xs' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCurrent
                            ? 'bg-primary-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {(org?.name || 'W').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${
                            isCurrent 
                              ? 'text-primary-700 dark:text-primary-300 font-bold' 
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {org?.name || 'Workspace'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getPlanBadge(org.plan)}
                            <span className="text-[10px] text-slate-400">
                              {org.branchesCount || 1} br.
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 group-hover:text-primary-600 font-medium">
                          Switch
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreateModalOpen(true);
                    setIsOpen(false);
                  }}
                  className="w-full justify-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/40 border-dashed border-primary-300 dark:border-primary-800 h-9"
                >
                  <Plus className="w-4 h-4" />
                  Register New Client Pharmacy
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/settings?tab=workspace');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  Manage Workspace & Staff
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal: Register New Client Workspace */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Register Client Pharmacy Workspace
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Provisions an isolated multi-tenant workspace with independent inventory, sales, and accounts.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateWorkspace} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pharmacy / Clinic Organization Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g., Sunrise Health & Wellness Pharmacy"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    SaaS Subscription Plan
                  </label>
                  <select
                    value={newOrgPlan}
                    onChange={(e: any) => setNewOrgPlan(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:border-primary-500"
                  >
                    <option value="starter">Starter Plan (Single branch)</option>
                    <option value="growth">Growth Plan (Up to 3 branches)</option>
                    <option value="enterprise">Enterprise Plan (Unlimited branches)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Branch Count
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={newOrgBranches}
                    onChange={(e) => setNewOrgBranches(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Contact Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newOrgPhone}
                    onChange={(e) => setNewOrgPhone(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    GSTIN / Tax ID (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 27AAAAA0000A1Z5"
                    value={newOrgGst}
                    onChange={(e) => setNewOrgGst(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Clinic / Pharmacy Address
                </label>
                <Input
                  type="text"
                  placeholder="e.g., 102 Health Avenue, Medical Hub"
                  value={newOrgAddress}
                  onChange={(e) => setNewOrgAddress(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p>
                  Upon creation, this pharmacy client will get their own isolated drug catalog, stock ledger, sales register, and patient records.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !newOrgName.trim()}
                  className="gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold"
                >
                  {isCreating ? 'Provisioning...' : 'Provision Client Workspace'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
