import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Organization } from '../types';
import { switchWorkspace as switchWorkspaceMock, updateClientWorkspace } from '../lib/firebase-mock';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  firebaseUid: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null, uid?: string | null, org?: Organization | null) => void;
  setOrganization: (org: Organization | null) => void;
  updateUser: (updates: Partial<User>) => void;
  updateOrganization: (updates: Partial<Organization>) => void;
  switchWorkspace: (org: Organization) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      firebaseUid: null,
      isAuthenticated: false,
      setUser: (user, uid = null, org = null) => 
        set((state) => ({ 
          user, 
          firebaseUid: uid, 
          isAuthenticated: !!user,
          organization: org || (user?.tenantId ? {
            id: user.tenantId,
            name: user.organizationName || 'MediTrack Cloud Pharmacy',
            slug: user.organizationSlug || 'main-pharmacy',
            plan: user.plan || 'growth',
            ownerId: user.id || 'owner_1',
            createdAt: user.createdAt || Date.now(),
            status: 'active',
            branchesCount: 1
          } : state.organization)
        })),
      setOrganization: (organization) => set({ organization }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      updateOrganization: (updates) =>
        set((state) => {
          if (!state.organization) return state;
          const updated = updateClientWorkspace(state.organization.id, updates);
          return {
            organization: updated,
            user: state.user ? {
              ...state.user,
              organizationName: updated.name,
              organizationSlug: updated.slug,
              plan: updated.plan,
            } : null
          };
        }),
      switchWorkspace: (org) => {
        try {
          switchWorkspaceMock(org.id);
        } catch (e) {
          console.error("Failed to switch workspace in mock DB:", e);
        }
        set((state) => ({
          organization: org,
          user: state.user ? {
            ...state.user,
            tenantId: org.id,
            organizationName: org.name,
            organizationSlug: org.slug,
            plan: org.plan,
          } : null
        }));
      },
      logout: () => {
        set({ user: null, organization: null, firebaseUid: null, isAuthenticated: false });
        try {
          localStorage.removeItem('meditrack-auth-storage');
          localStorage.setItem('meditrack_has_logged_out', 'true');
        } catch (_) {}
      },
    }),
    {
      name: 'meditrack-auth-storage',
    }
  )
);


