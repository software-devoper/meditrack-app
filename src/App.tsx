import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { Patients } from './features/patients/Patients';
import { Suppliers } from './features/suppliers/Suppliers';
import { Doctors } from './features/doctors/Doctors';
import { Sales } from './features/sales/Sales';
import { Purchase } from './features/purchase/Purchase';
import { AuthPage } from './features/auth/AuthPage';
import { Bootstrap } from './features/auth/Bootstrap';
import { PrivacyPolicy } from './features/legal/PrivacyPolicy';
import { Profile } from './features/profile/Profile';
import { Settings } from './features/settings/Settings';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import React, { useEffect, useState } from 'react';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User } from './types';
import { Toaster } from 'sonner';
import { UpdateNotificationCard } from './components/UpdateNotificationCard';
import { AlertModalProvider } from './context/AlertModalContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setUser } = useAuthStore();
  const [authResolved, setAuthResolved] = useState(false);
  const { themeMode, colorScheme, fontSize, density, fontColor } = useSettingsStore();

  // Apply settings to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme Mode
    if (themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Color Scheme
    root.setAttribute('data-color', colorScheme);

    // Font Size
    root.setAttribute('data-font-size', fontSize);

    // Density
    root.setAttribute('data-density', density);
    
    // Font Color
    if (fontColor) {
      root.setAttribute('data-has-custom-font', 'true');
      root.style.setProperty('--dynamic-font-color', fontColor);
    } else {
      root.removeAttribute('data-has-custom-font');
      root.style.removeProperty('--dynamic-font-color');
    }
  }, [themeMode, colorScheme, fontSize, density, fontColor]);

  useEffect(() => {
    if (!auth || !db) {
      setAuthResolved(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.uid) {
        // Fetch custom user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() } as User, firebaseUser.uid);
          } else {
            const current = useAuthStore.getState().user;
            if (!current) setUser(null);
          }
        } catch (e) {
          console.warn("Could not fetch user profile:", e);
        }
      } else {
        // If not authenticated via Firebase Auth, retain local session if already logged in
        const current = useAuthStore.getState().user;
        if (!current) {
          setUser(null);
        }
      }
      setAuthResolved(true);
    });
    return () => unsub();
  }, [setUser]);

  // App runs smoothly with local persistence & optional Firebase sync
  if (!authResolved) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">Loading...</div>;

  return (
    <AlertModalProvider>
      <Toaster 
        position="top-right" 
        richColors 
        theme={themeMode === 'system' ? 'system' : themeMode} 
        toastOptions={{
          className: 'premium-toast-popup',
          duration: 3500,
        }}
      />
      <UpdateNotificationCard />
      <Routes>
        <Route path="/setup" element={<Bootstrap />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/data-deletion" element={<PrivacyPolicy />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="purchase" element={<Purchase />} />
          <Route path="sales" element={<Sales />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patient-info" element={<Navigate to="/patients" replace />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="supplier-info" element={<Navigate to="/suppliers" replace />} />
          <Route path="customers" element={<Navigate to="/patients" replace />} />
          <Route path="doctors" element={<Navigate to="/patients" replace />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </AlertModalProvider>
  );
}
