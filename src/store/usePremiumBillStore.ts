import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

export const PRICE_PER_PREMIUM_BILL = 2; // Rs. 2 per bill generation

interface PremiumBillState {
  credits: number;
  selectedTemplate: 'free' | 'premium';
  isPaymentModalOpen: boolean;
  pendingQty: number;
  setSelectedTemplate: (template: 'free' | 'premium') => void;
  setCredits: (count: number) => void;
  openPaymentModal: (qty?: number) => void;
  closePaymentModal: () => void;
  completePayment: (qty: number, method: string) => Promise<number>;
  deductCredit: () => Promise<boolean>;
  syncWithOrg: (orgCredits?: number) => void;
}

export const usePremiumBillStore = create<PremiumBillState>()(
  persist(
    (set, get) => ({
      credits: 0,
      selectedTemplate: 'free',
      isPaymentModalOpen: false,
      pendingQty: 4,

      setSelectedTemplate: (template) => set({ selectedTemplate: template }),

      setCredits: (count) => set({ credits: Math.max(0, count) }),

      openPaymentModal: (qty = 4) => set({ 
        isPaymentModalOpen: true, 
        pendingQty: Math.max(1, qty) 
      }),

      closePaymentModal: () => set({ isPaymentModalOpen: false }),

      completePayment: async (qty: number, _method: string) => {
        const added = Math.max(1, qty);
        const current = get().credits;
        const newCredits = current + added;

        set({
          credits: newCredits,
          isPaymentModalOpen: false,
          selectedTemplate: 'premium',
        });

        // Sync with organization in auth store & backend
        try {
          const authState = useAuthStore.getState();
          if (authState.updateOrganization) {
            authState.updateOrganization({ premiumInvoiceCredits: newCredits });
          }
        } catch (err) {
          console.error("Error updating organization premium credits:", err);
        }

        return newCredits;
      },

      deductCredit: async () => {
        const current = get().credits;
        if (current <= 0) return false;

        const newCredits = current - 1;
        set({ credits: newCredits });

        try {
          const authState = useAuthStore.getState();
          if (authState.updateOrganization) {
            authState.updateOrganization({ premiumInvoiceCredits: newCredits });
          }
        } catch (err) {
          console.error("Error deducting credit:", err);
        }

        return true;
      },

      syncWithOrg: (orgCredits) => {
        if (typeof orgCredits === 'number') {
          // If org has higher or defined credits, synchronize
          if (orgCredits !== get().credits) {
            set({ credits: orgCredits });
          }
        }
      }
    }),
    {
      name: 'meditrack_premium_bill_store',
      partialize: (state) => ({ 
        credits: state.credits,
        selectedTemplate: state.selectedTemplate 
      }),
    }
  )
);
