/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

function getStoredFirebaseConfig() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('meditrack_custom_firebase_config');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
  }
  return null;
}

const customConfig = getStoredFirebaseConfig();

export const firebaseConfig = {
  apiKey: customConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: customConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: customConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: customConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: customConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: customConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = true;

let app: any = null;
let dbInstance: Firestore = null as any;
let authInstance: Auth = null as any;

try {
  if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
  } else {
    // Initialized with a safe placeholder so imports do not break
    app = getApps().length === 0 ? initializeApp({
      apiKey: "dummy-key-for-local-mode",
      authDomain: "meditrack-local.firebaseapp.com",
      projectId: "meditrack-local-preview",
      storageBucket: "meditrack-local.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    }) : getApp();
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
  }
} catch (e) {
  console.warn("Firebase initialization notice:", e);
}

export const db = dbInstance;
export const auth = authInstance;

export function saveCustomFirebaseConfig(config: Record<string, string>) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('meditrack_custom_firebase_config', JSON.stringify(config));
    window.location.reload();
  }
}

export function clearCustomFirebaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('meditrack_custom_firebase_config');
    window.location.reload();
  }
}


