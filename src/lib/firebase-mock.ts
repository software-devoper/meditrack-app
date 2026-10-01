import { User, Organization } from '../types';

// Simple in-memory / local storage event emitter for reactive real-time snapshots
class MockDatabaseEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in mock DB listener:', e);
      }
    });
  }
}

const dbEmitter = new MockDatabaseEmitter();

// Initialize LocalStorage with seed data if empty
const SEED_DATA: Record<string, any[]> = {
  organizations: [
    {
      id: 'tenant_apex',
      name: 'Apex Health & Pharmacy Cloud',
      slug: 'apex-rx',
      plan: 'growth',
      ownerId: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1',
      createdAt: Date.now() - 30 * 24 * 3600 * 1000,
      status: 'active',
      branchesCount: 3,
      gstNumber: '07AAAAA1111A1Z1',
      address: 'Suite 400, Medical Plaza, Metro City',
      phone: '+1 (555) 234-5678'
    },
    {
      id: 'tenant_metro',
      name: 'Metro Care Multi-Specialty Clinic',
      slug: 'metro-care',
      plan: 'enterprise',
      ownerId: 'user_metro_pharmacist',
      createdAt: Date.now() - 15 * 24 * 3600 * 1000,
      status: 'active',
      branchesCount: 5,
      gstNumber: '27BBBBB2222B2Z2',
      address: 'Central Crossroad, Tech District',
      phone: '+1 (555) 987-6543'
    }
  ],
  users: [
    {
      id: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1',
      name: 'Dr. Sarah Mitchell',
      username: 'admin',
      role: 'owner',
      isActive: true,
      internalAuthEmail: 'admin@meditrack.local',
      contactEmail: 'sarah.mitchell@apexrx.health',
      tenantId: 'tenant_apex',
      organizationName: 'Apex Health & Pharmacy Cloud',
      organizationSlug: 'apex-rx',
      plan: 'growth',
      createdAt: Date.now() - 30 * 24 * 3600 * 1000,
      createdBy: 'system'
    },
    {
      id: 'user_metro_pharmacist',
      name: 'Marcus Vance, PharmD',
      username: 'marcus_rx',
      role: 'pharmacist',
      isActive: true,
      internalAuthEmail: 'marcus@metrocare.local',
      contactEmail: 'marcus.v@metrocare.org',
      tenantId: 'tenant_metro',
      organizationName: 'Metro Care Multi-Specialty Clinic',
      organizationSlug: 'metro-care',
      plan: 'enterprise',
      createdAt: Date.now() - 15 * 24 * 3600 * 1000,
      createdBy: 'system'
    }
  ],
  products: [
    // Apex Health & Pharmacy Cloud (tenant_apex)
    {
      id: 'p1',
      tenantId: 'tenant_apex',
      name: 'Paracetamol 650mg',
      genericName: 'Acetaminophen',
      category: 'Analgesics',
      manufacturer: 'GSK Pharmaceuticals',
      hsnCode: '30049011',
      unit: 'Strip',
      purchasePrice: 12.5,
      mrp: 22.0,
      gstPercent: 12,
      stockQty: 120,
      reorderLevel: 30,
      rackLocation: 'A-12',
      supplierName: 'MediLife Distributors',
      createdAt: Date.now() - 15 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 15 * 24 * 3600 * 1000
    },
    {
      id: 'p2',
      tenantId: 'tenant_apex',
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      manufacturer: 'Alkem Laboratories',
      hsnCode: '30041010',
      unit: 'Strip',
      purchasePrice: 45.0,
      mrp: 78.5,
      gstPercent: 12,
      stockQty: 85,
      reorderLevel: 20,
      rackLocation: 'B-04',
      supplierName: 'Astra Pharmaceuticals',
      createdAt: Date.now() - 10 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 10 * 24 * 3600 * 1000
    },
    {
      id: 'p3',
      tenantId: 'tenant_apex',
      name: 'Metformin 500mg',
      genericName: 'Metformin Hydrochloride',
      category: 'Antidiabetics',
      manufacturer: 'Abbott Healthcare',
      hsnCode: '30049085',
      unit: 'Strip',
      purchasePrice: 15.0,
      mrp: 28.0,
      gstPercent: 12,
      stockQty: 250,
      reorderLevel: 50,
      rackLocation: 'C-08',
      supplierName: 'MediLife Distributors',
      createdAt: Date.now() - 25 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 25 * 24 * 3600 * 1000
    },
    {
      id: 'p4',
      tenantId: 'tenant_apex',
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin Dihydrate',
      category: 'Antibiotics',
      manufacturer: 'Pfizer Labs',
      hsnCode: '30041020',
      unit: 'Strip',
      purchasePrice: 65.0,
      mrp: 115.0,
      gstPercent: 12,
      stockQty: 45,
      reorderLevel: 15,
      rackLocation: 'B-09',
      supplierName: 'Astra Pharmaceuticals',
      createdAt: Date.now() - 8 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 8 * 24 * 3600 * 1000
    },
    {
      id: 'p5',
      tenantId: 'tenant_apex',
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole Magnesium',
      category: 'Antacids',
      manufacturer: 'Sun Pharma',
      hsnCode: '30049030',
      unit: 'Strip',
      purchasePrice: 22.0,
      mrp: 44.0,
      gstPercent: 12,
      stockQty: 140,
      reorderLevel: 30,
      rackLocation: 'D-02',
      supplierName: 'MediLife Distributors',
      createdAt: Date.now() - 14 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 14 * 24 * 3600 * 1000
    },

    // Metro Care Multi-Specialty Clinic (tenant_metro)
    {
      id: 'pm1',
      tenantId: 'tenant_metro',
      name: 'Atorvastatin 20mg',
      genericName: 'Atorvastatin Calcium',
      category: 'Cardiovascular',
      manufacturer: 'Cadila Pharma',
      hsnCode: '30049070',
      unit: 'Strip',
      purchasePrice: 58.0,
      mrp: 110.0,
      gstPercent: 12,
      stockQty: 90,
      reorderLevel: 25,
      rackLocation: 'M-01',
      supplierName: 'Beacon Health Pharma',
      createdAt: Date.now() - 12 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 12 * 24 * 3600 * 1000
    },
    {
      id: 'pm2',
      tenantId: 'tenant_metro',
      name: 'Losartan Potassium 50mg',
      genericName: 'Losartan Potassium',
      category: 'Cardiovascular',
      manufacturer: 'Cipla Health',
      hsnCode: '30049072',
      unit: 'Strip',
      purchasePrice: 35.0,
      mrp: 65.0,
      gstPercent: 12,
      stockQty: 150,
      reorderLevel: 30,
      rackLocation: 'M-02',
      supplierName: 'SunRx Logistics',
      createdAt: Date.now() - 11 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 11 * 24 * 3600 * 1000
    },
    {
      id: 'pm3',
      tenantId: 'tenant_metro',
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      category: 'Analgesics',
      manufacturer: 'Abbott Healthcare',
      hsnCode: '30049015',
      unit: 'Strip',
      purchasePrice: 18.0,
      mrp: 35.0,
      gstPercent: 12,
      stockQty: 200,
      reorderLevel: 40,
      rackLocation: 'M-03',
      supplierName: 'Beacon Health Pharma',
      createdAt: Date.now() - 10 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 10 * 24 * 3600 * 1000
    },
    {
      id: 'pm4',
      tenantId: 'tenant_metro',
      name: 'Pantoprazole 40mg',
      genericName: 'Pantoprazole Sodium',
      category: 'Antacids',
      manufacturer: 'Alkem Laboratories',
      hsnCode: '30049033',
      unit: 'Strip',
      purchasePrice: 42.0,
      mrp: 85.0,
      gstPercent: 12,
      stockQty: 110,
      reorderLevel: 25,
      rackLocation: 'M-04',
      supplierName: 'SunRx Logistics',
      createdAt: Date.now() - 9 * 24 * 3600 * 1000,
      updatedAt: Date.now() - 9 * 24 * 3600 * 1000
    }
  ],
  customers: [
    // Apex Health
    {
      id: 'c1',
      tenantId: 'tenant_apex',
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul@gmail.com',
      address: '123, Park Street, Kolkata',
      type: 'sale',
      outstandingBalance: 0,
      doctors: [{ id: 'doc_c1', name: 'Dr. Amit Sen', phone: '9830012345', address: 'Apollo Clinic, Kolkata' }],
      createdAt: Date.now() - 5 * 24 * 3600 * 1000,
      createdBy: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1'
    },
    {
      id: 'c2',
      tenantId: 'tenant_apex',
      name: 'Priya Patel',
      phone: '9823456781',
      email: 'priya@gmail.com',
      address: '45, Satellite Road, Ahmedabad',
      type: 'sale',
      outstandingBalance: 150,
      doctors: [{ id: 'doc_c2', name: 'Dr. Meera Shah', phone: '9822334455', address: 'Sterling Hospital, Ahmedabad' }],
      createdAt: Date.now() - 4 * 24 * 3600 * 1000,
      createdBy: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1'
    },
    {
      id: 's1',
      tenantId: 'tenant_apex',
      name: 'MediLife Distributors',
      phone: '9111222333',
      email: 'orders@medilife.com',
      address: 'Industrial Area Phase 2, Delhi',
      type: 'purchase',
      outstandingBalance: 0,
      gstNumber: '07AAAAA1111A1Z1',
      createdAt: Date.now() - 20 * 24 * 3600 * 1000,
      createdBy: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1'
    },
    // Metro Care
    {
      id: 'cm1',
      tenantId: 'tenant_metro',
      name: 'David Miller',
      phone: '9811223344',
      email: 'david.m@outlook.com',
      address: '742 Evergreen Terrace, West Wing',
      type: 'sale',
      outstandingBalance: 0,
      doctors: [{ id: 'doc_cm1', name: 'Dr. Rajesh Gupta', phone: '9811002200', address: 'City Heart Center' }],
      createdAt: Date.now() - 6 * 24 * 3600 * 1000,
      createdBy: 'user_metro_pharmacist'
    },
    {
      id: 'cm2',
      tenantId: 'tenant_metro',
      name: 'Ananya Roy',
      phone: '9877665544',
      email: 'ananya.roy@yahoo.com',
      address: 'Block C, Heritage Heights',
      type: 'sale',
      outstandingBalance: 80,
      doctors: [{ id: 'doc_cm2', name: 'Dr. Elena Rostova', phone: '9877001122', address: 'Global Care Clinic' }],
      createdAt: Date.now() - 3 * 24 * 3600 * 1000,
      createdBy: 'user_metro_pharmacist'
    },
    {
      id: 'sm1',
      tenantId: 'tenant_metro',
      name: 'Beacon Health Pharma',
      phone: '9800112233',
      email: 'orders@beaconhealth.com',
      address: 'Pharma Port, Bay 4',
      type: 'purchase',
      outstandingBalance: 0,
      gstNumber: '27BBBBB2222B2Z2',
      createdAt: Date.now() - 18 * 24 * 3600 * 1000,
      createdBy: 'user_metro_pharmacist'
    }
  ],
  doctors: [
    // Apex Health
    {
      id: 'd1',
      tenantId: 'tenant_apex',
      name: 'Dr. Amit Sen',
      phone: '9830012345',
      email: 'amit.sen@apollo.com',
      address: 'Apollo Clinic, Kolkata',
      createdAt: Date.now() - 12 * 24 * 3600 * 1000,
      createdBy: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1'
    },
    {
      id: 'd2',
      tenantId: 'tenant_apex',
      name: 'Dr. Meera Shah',
      phone: '9824098765',
      email: 'meera.shah@zydus.com',
      address: 'Zydus Hospital, Ahmedabad',
      createdAt: Date.now() - 8 * 24 * 3600 * 1000,
      createdBy: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1'
    },
    // Metro Care
    {
      id: 'dm1',
      tenantId: 'tenant_metro',
      name: 'Dr. Rajesh Gupta',
      phone: '9812345678',
      email: 'rajesh.gupta@metrocare.org',
      address: 'Metro Cardiology Pavilion',
      createdAt: Date.now() - 10 * 24 * 3600 * 1000,
      createdBy: 'user_metro_pharmacist'
    },
    {
      id: 'dm2',
      tenantId: 'tenant_metro',
      name: 'Dr. Elena Rostova',
      phone: '9898765432',
      email: 'elena.rostova@metrocare.org',
      address: 'Metro Internal Medicine Center',
      createdAt: Date.now() - 7 * 24 * 3600 * 1000,
      createdBy: 'user_metro_pharmacist'
    }
  ],
  sales: [
    // Apex Health Sales
    {
      id: 'sale_apex_1',
      tenantId: 'tenant_apex',
      invoiceNo: 'HCP-101',
      billTo: 'Rahul Sharma',
      patientName: 'Rahul Sharma',
      patientPhone: '9876543210',
      patientAddress: '123, Park Street, Kolkata',
      doctorName: 'Dr. Amit Sen',
      items: [
        { productId: 'p1', name: 'Paracetamol 650mg', qty: 2, rate: 22.0, purchasePrice: 12.5, gstPercent: 12, discount: 0, unit: 'Strip' },
        { productId: 'p2', name: 'Amoxicillin 500mg', qty: 1, rate: 78.5, purchasePrice: 45.0, gstPercent: 12, discount: 0, unit: 'Strip' }
      ],
      subtotal: 122.5,
      discountTotal: 0,
      gstTotal: 14.7,
      grandTotal: 137.0,
      paymentMode: 'UPI',
      date: Date.now() - 2 * 24 * 3600 * 1000,
      createdBy: 'admin',
      status: 'completed'
    },
    {
      id: 'sale_apex_2',
      tenantId: 'tenant_apex',
      invoiceNo: 'HCP-102',
      billTo: 'Priya Patel',
      patientName: 'Priya Patel',
      patientPhone: '9823456781',
      patientAddress: '45, Satellite Road, Ahmedabad',
      doctorName: 'Dr. Meera Shah',
      items: [
        { productId: 'p3', name: 'Metformin 500mg', qty: 3, rate: 28.0, purchasePrice: 15.0, gstPercent: 12, discount: 5, unit: 'Strip' },
        { productId: 'p5', name: 'Omeprazole 20mg', qty: 2, rate: 44.0, purchasePrice: 22.0, gstPercent: 12, discount: 0, unit: 'Strip' }
      ],
      subtotal: 172.0,
      discountTotal: 4.2,
      gstTotal: 20.1,
      grandTotal: 188.0,
      paymentMode: 'Cash',
      date: Date.now() - 1 * 24 * 3600 * 1000,
      createdBy: 'admin',
      status: 'completed'
    },
    // Metro Care Sales
    {
      id: 'sale_metro_1',
      tenantId: 'tenant_metro',
      invoiceNo: 'HCP-1',
      billTo: 'David Miller',
      patientName: 'David Miller',
      patientPhone: '9811223344',
      patientAddress: '742 Evergreen Terrace, West Wing',
      doctorName: 'Dr. Rajesh Gupta',
      items: [
        { productId: 'pm1', name: 'Atorvastatin 20mg', qty: 2, rate: 110.0, purchasePrice: 58.0, gstPercent: 12, discount: 10, unit: 'Strip' },
        { productId: 'pm2', name: 'Losartan Potassium 50mg', qty: 2, rate: 65.0, purchasePrice: 35.0, gstPercent: 12, discount: 0, unit: 'Strip' }
      ],
      subtotal: 350.0,
      discountTotal: 22.0,
      gstTotal: 39.3,
      grandTotal: 367.0,
      paymentMode: 'Card',
      date: Date.now() - 3 * 24 * 3600 * 1000,
      createdBy: 'marcus_rx',
      status: 'completed'
    },
    {
      id: 'sale_metro_2',
      tenantId: 'tenant_metro',
      invoiceNo: 'HCP-2',
      billTo: 'Ananya Roy',
      patientName: 'Ananya Roy',
      patientPhone: '9877665544',
      patientAddress: 'Block C, Heritage Heights',
      doctorName: 'Dr. Elena Rostova',
      items: [
        { productId: 'pm4', name: 'Pantoprazole 40mg', qty: 2, rate: 85.0, purchasePrice: 42.0, gstPercent: 12, discount: 0, unit: 'Strip' },
        { productId: 'pm3', name: 'Ibuprofen 400mg', qty: 3, rate: 35.0, purchasePrice: 18.0, gstPercent: 12, discount: 5, unit: 'Strip' }
      ],
      subtotal: 275.0,
      discountTotal: 5.2,
      gstTotal: 32.3,
      grandTotal: 302.0,
      paymentMode: 'Cash',
      date: Date.now() - 1 * 24 * 3600 * 1000,
      createdBy: 'marcus_rx',
      status: 'completed'
    }
  ],
  purchases: [],
  stockLedger: [],
  metadata: [
    { id: 'tenant_apex_salesCounter', tenantId: 'tenant_apex', current: 102 },
    { id: 'tenant_metro_salesCounter', tenantId: 'tenant_metro', current: 2 }
  ]
};

const TENANT_ISOLATED_COLLECTIONS = new Set([
  'products',
  'customers',
  'doctors',
  'purchases',
  'sales',
  'stockLedger'
]);

export function getActiveTenantId(): string {
  // 1. From mockAuthInstance currentUser
  if (mockAuthInstance?.currentUser?.tenantId) {
    return mockAuthInstance.currentUser.tenantId;
  }
  // 2. From localStorage meditrack-auth-storage
  try {
    const raw = localStorage.getItem('meditrack-auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.organization?.id) return parsed.state.organization.id;
      if (parsed?.state?.user?.tenantId) return parsed.state.user.tenantId;
    }
  } catch (_) {}
  return 'tenant_apex';
}

// Helper to get collection from localStorage
export function getCollectionData(collectionName: string): any[] {
  const key = `meditrack_mock_${collectionName}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        let changed = false;
        // Migration: Ensure legacy items in isolated collections have tenantId
        if (TENANT_ISOLATED_COLLECTIONS.has(collectionName)) {
          parsed.forEach(item => {
            if (!item.tenantId) {
              item.tenantId = 'tenant_apex';
              changed = true;
            }
          });
        }
        // Normalize customer doctors to objects
        if (collectionName === 'customers') {
          parsed.forEach(item => {
            if (Array.isArray(item.doctors)) {
              item.doctors = item.doctors.map((d: any) => 
                typeof d === 'string' ? { id: 'doc_' + Math.random().toString(36).slice(2, 7), name: d } : d
              );
            }
          });
        }
        // Merge missing seed items (e.g. for tenant_metro or new tenants)
        const seedItems = SEED_DATA[collectionName] || [];
        seedItems.forEach(seedItem => {
          if (!parsed.some(p => p.id === seedItem.id)) {
            parsed.push(seedItem);
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(key, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (_) {}
  }
  // Initialize with seed data or empty
  const seed = SEED_DATA[collectionName] || [];
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

// Helper to save collection to localStorage
export function saveCollectionData(collectionName: string, data: any[]) {
  const key = `meditrack_mock_${collectionName}`;
  localStorage.setItem(key, JSON.stringify(data));
  dbEmitter.emit();
}

// Helper to generate IDs
export function generateMockId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// -------------------------------------------------------------
// FIREBASE APP MOCK
// -------------------------------------------------------------
export const initializeApp = (config: any) => {
  console.log('[Mock Firebase] App initialized with config:', config);
  return { name: '[MockApp]' };
};

export const getApps = () => [{ name: '[MockApp]' }];
export const getApp = () => ({ name: '[MockApp]' });

// Helper to get passwords from localStorage
function getStoredPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem('meditrack_mock_passwords');
    return raw ? JSON.parse(raw) : { 
      'admin': 'admin123', 
      'admin@meditrack.local': 'admin123', 
      'sarah.mitchell@apexrx.health': 'admin123',
      'marcus_rx': 'marcus123'
    };
  } catch (_) {
    return { 'admin': 'admin123' };
  }
}

function saveStoredPassword(key: string, pass: string) {
  const current = getStoredPasswords();
  current[key.toLowerCase().trim()] = pass;
  localStorage.setItem('meditrack_mock_passwords', JSON.stringify(current));
}

// -------------------------------------------------------------
// FIREBASE AUTH MOCK
// -------------------------------------------------------------
class MockAuth {
  private currentMockUser: any = null;
  private authListeners: Set<(user: any) => void> = new Set();

  constructor() {
    // Load signed in user from local storage if persists
    const saved = localStorage.getItem('meditrack-auth-storage');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.state?.user) {
          const user = parsed.state.user;
          this.currentMockUser = {
            uid: user.id || 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1',
            email: user.internalAuthEmail || user.contactEmail || 'admin@meditrack.local',
            emailVerified: true,
            displayName: user.name || 'Dr. Sarah Mitchell',
            tenantId: user.tenantId || 'tenant_apex',
            organizationName: user.organizationName || 'Apex Health & Pharmacy Cloud'
          };
        }
      } catch (_) {}
    }
  }

  get currentUser() {
    return this.currentMockUser;
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.authListeners.add(callback);
    // Fire immediately with current value
    callback(this.currentMockUser);
    return () => {
      this.authListeners.delete(callback);
    };
  }

  async signInWithEmailAndPassword(identifier: string, pass: string) {
    const input = identifier.toLowerCase().trim();
    
    // Find in users collection by username, internalAuthEmail, or contactEmail
    const users = getCollectionData('users');
    const matched = users.find(u => 
      (u.username && u.username.toLowerCase() === input) || 
      (u.internalAuthEmail && u.internalAuthEmail.toLowerCase() === input) ||
      (u.contactEmail && u.contactEmail.toLowerCase() === input)
    );

    if (matched) {
      if (matched.isActive === false) {
        throw new Error('This clinic account has been deactivated. Please contact support.');
      }

      // Check password
      const passwords = getStoredPasswords();
      const expectedPass = 
        passwords[input] || 
        passwords[matched.username?.toLowerCase()] || 
        passwords[matched.internalAuthEmail?.toLowerCase()] ||
        passwords[matched.contactEmail?.toLowerCase()] ||
        'admin123';

      if (pass !== expectedPass) {
        throw new Error('auth/invalid-credential');
      }

      this.currentMockUser = {
        uid: matched.id,
        email: matched.contactEmail || matched.internalAuthEmail,
        emailVerified: true,
        displayName: matched.name,
        tenantId: matched.tenantId,
        organizationName: matched.organizationName,
        role: matched.role
      };
      this.authListeners.forEach(cb => cb(this.currentMockUser));
      return { user: this.currentMockUser };
    }

    // Default system admin login fallback
    if (input === 'admin' && pass === 'admin123') {
      const adminUser = {
        uid: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1',
        email: 'admin@meditrack.local',
        emailVerified: true,
        displayName: 'Dr. Sarah Mitchell',
        tenantId: 'tenant_apex',
        organizationName: 'Apex Health & Pharmacy Cloud',
        role: 'owner'
      };
      this.currentMockUser = adminUser;
      this.authListeners.forEach(cb => cb(this.currentMockUser));
      return { user: this.currentMockUser };
    }

    throw new Error('auth/invalid-credential');
  }

  async signOut() {
    this.currentMockUser = null;
    this.authListeners.forEach(cb => cb(null));
  }

  async signInWithPopup() {
    const googleUser = {
      uid: 'google_user_' + Date.now().toString(36),
      email: 'clinician.google@meditrack.cloud',
      emailVerified: true,
      displayName: 'Dr. Alex Vance, MD',
      tenantId: 'tenant_google_' + Date.now().toString(36),
      organizationName: 'Vance Family Pharmacy Cloud',
      role: 'owner'
    };
    this.currentMockUser = googleUser;
    this.authListeners.forEach(cb => cb(this.currentMockUser));
    return { user: this.currentMockUser };
  }
}

const mockAuthInstance = new MockAuth();
export const auth = mockAuthInstance;
export const getAuth = () => mockAuthInstance;

export const onAuthStateChanged = (auth: any, callback: any) => {
  return mockAuthInstance.onAuthStateChanged(callback);
};

export const signInWithEmailAndPassword = async (auth: any, email: string, pass: string) => {
  return mockAuthInstance.signInWithEmailAndPassword(email, pass);
};

export const signOut = async (auth: any) => {
  return mockAuthInstance.signOut();
};

export const createUserWithEmailAndPassword = async (auth: any, email: string, pass: string) => {
  const newUid = 'usr_' + generateMockId();
  const newUser = {
    uid: newUid,
    email,
    emailVerified: true,
    displayName: 'New Pharmacy Admin'
  };
  saveStoredPassword(email, pass);
  mockAuthInstance['currentMockUser'] = newUser;
  mockAuthInstance['authListeners'].forEach((cb: any) => cb(newUser));
  return { user: newUser };
};

export const signInWithPopup = async () => {
  return mockAuthInstance.signInWithPopup();
};

/**
 * Enterprise SaaS Sign-Up Helper:
 * Provisions a complete Organization workspace + Owner User account with data isolation.
 */
export async function signUpSaaSUser(payload: {
  username: string;
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  phone?: string;
  plan?: 'starter' | 'growth' | 'enterprise';
}) {
  const users = getCollectionData('users');
  const orgs = getCollectionData('organizations');

  const normalizedUsername = payload.username.trim().toLowerCase();
  const normalizedEmail = payload.email.trim().toLowerCase();

  // 1. Check for existing username or email
  const existingUsername = users.find(u => u.username?.toLowerCase() === normalizedUsername);
  if (existingUsername) {
    throw new Error('This username is already taken. Please choose another.');
  }

  const existingEmail = users.find(u => 
    u.internalAuthEmail?.toLowerCase() === normalizedEmail || 
    u.contactEmail?.toLowerCase() === normalizedEmail
  );
  if (existingEmail) {
    throw new Error('An account with this email address already exists. Please sign in instead.');
  }

  // 2. Create Organization Tenant
  const tenantId = 'org_' + generateMockId();
  const orgSlug = payload.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const newOrg: Organization = {
    id: tenantId,
    name: payload.organizationName.trim(),
    slug: orgSlug || 'pharmacy-workspace',
    plan: payload.plan || 'growth',
    ownerId: '',
    createdAt: Date.now(),
    status: 'active',
    branchesCount: 1,
    phone: payload.phone || ''
  };

  // 3. Create User Document
  const userId = 'usr_' + generateMockId();
  newOrg.ownerId = userId;

  const newUser: User = {
    id: userId,
    name: payload.fullName.trim(),
    username: normalizedUsername,
    internalAuthEmail: normalizedEmail,
    contactEmail: normalizedEmail,
    role: 'owner',
    isActive: true,
    tenantId,
    organizationName: newOrg.name,
    organizationSlug: newOrg.slug,
    plan: newOrg.plan,
    phone: payload.phone || '',
    createdAt: Date.now(),
    createdBy: 'self_registration',
    emailVerified: true
  };

  // 4. Save to collections & save password
  users.push(newUser);
  saveCollectionData('users', users);

  orgs.push(newOrg);
  saveCollectionData('organizations', orgs);

  saveStoredPassword(normalizedUsername, payload.password);
  saveStoredPassword(normalizedEmail, payload.password);

  // Seed starter inventory for the new client's pharmacy workspace
  const products = getCollectionData('products');
  products.push(
    {
      id: 'p_' + generateMockId(),
      tenantId: tenantId,
      name: 'Paracetamol 650mg Fast-Action',
      genericName: 'Paracetamol / Acetaminophen',
      category: 'Analgesics',
      manufacturer: 'Apex Pharma Labs',
      hsnCode: '30049011',
      unit: 'Strip',
      purchasePrice: 14.0,
      mrp: 24.5,
      gstPercent: 12,
      stockQty: 100,
      reorderLevel: 25,
      rackLocation: 'A-01',
      supplierName: 'National Pharma Logistics',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'p_' + generateMockId(),
      tenantId: tenantId,
      name: 'Amoxicillin 500mg Caps',
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      manufacturer: 'Cipla Healthcare',
      hsnCode: '30041010',
      unit: 'Strip',
      purchasePrice: 48.0,
      mrp: 82.0,
      gstPercent: 12,
      stockQty: 60,
      reorderLevel: 15,
      rackLocation: 'B-02',
      supplierName: 'National Pharma Logistics',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'p_' + generateMockId(),
      tenantId: tenantId,
      name: 'Cetirizine 10mg Tablet',
      genericName: 'Cetirizine Hydrochloride',
      category: 'Antihistamines',
      manufacturer: 'Sun Pharmaceuticals',
      hsnCode: '30049099',
      unit: 'Strip',
      purchasePrice: 8.5,
      mrp: 18.0,
      gstPercent: 12,
      stockQty: 120,
      reorderLevel: 20,
      rackLocation: 'C-05',
      supplierName: 'National Pharma Logistics',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  );
  saveCollectionData('products', products);

  // Initialize their sales counter
  const metadata = getCollectionData('metadata');
  metadata.push({ id: `${tenantId}_salesCounter`, tenantId: tenantId, current: 0 });
  saveCollectionData('metadata', metadata);

  // 5. Update mock auth state
  const authUser = {
    uid: userId,
    email: normalizedEmail,
    emailVerified: true,
    displayName: newUser.name,
    tenantId,
    organizationName: newOrg.name,
    role: newUser.role
  };

  mockAuthInstance['currentMockUser'] = authUser;
  mockAuthInstance['authListeners'].forEach((cb: any) => cb(authUser));

  return { user: newUser, organization: newOrg };
}

/**
 * Enterprise SaaS Password Reset Helper:
 * Updates the stored password for a user identified by username or email.
 */
export async function resetSaaSPassword(identifier: string, newPassword: string) {
  const input = identifier.toLowerCase().trim();
  const users = getCollectionData('users');

  const matched = users.find(u => 
    (u.username && u.username.toLowerCase() === input) || 
    (u.internalAuthEmail && u.internalAuthEmail.toLowerCase() === input) ||
    (u.contactEmail && u.contactEmail.toLowerCase() === input)
  );

  if (!matched) {
    throw new Error('No registered account was found with that email or username.');
  }

  // Update password in local store
  if (matched.username) saveStoredPassword(matched.username, newPassword);
  if (matched.internalAuthEmail) saveStoredPassword(matched.internalAuthEmail, newPassword);
  if (matched.contactEmail) saveStoredPassword(matched.contactEmail, newPassword);

  return { success: true, email: matched.contactEmail || matched.internalAuthEmail };
}

/**
 * Enterprise SaaS Google OAuth Simulator:
 * One-click provision with Google for seamless onboarding.
 */
export async function signInWithGoogleSaaS(organizationName = 'Apex MedCloud Pharmacy') {
  const users = getCollectionData('users');
  const orgs = getCollectionData('organizations');

  const googleEmail = 'doctor.partner@gmail.com';
  let matchedUser = users.find(u => u.contactEmail === googleEmail || u.internalAuthEmail === googleEmail);
  let matchedOrg: Organization | null = null;

  if (!matchedUser) {
    const tenantId = 'org_g_' + generateMockId();
    matchedOrg = {
      id: tenantId,
      name: organizationName,
      slug: 'google-workspace',
      plan: 'growth',
      ownerId: '',
      createdAt: Date.now(),
      status: 'active',
      branchesCount: 2
    };

    const userId = 'usr_g_' + generateMockId();
    matchedOrg.ownerId = userId;

    matchedUser = {
      id: userId,
      name: 'Dr. Gregory House, MD',
      username: 'dr_gregory',
      internalAuthEmail: googleEmail,
      contactEmail: googleEmail,
      role: 'owner',
      isActive: true,
      tenantId,
      organizationName: matchedOrg.name,
      organizationSlug: matchedOrg.slug,
      plan: 'growth',
      createdAt: Date.now(),
      createdBy: 'google_sso',
      emailVerified: true
    };

    users.push(matchedUser);
    saveCollectionData('users', users);
    orgs.push(matchedOrg);
    saveCollectionData('organizations', orgs);
    saveStoredPassword(googleEmail, 'google_sso_pass');
    saveStoredPassword('dr_gregory', 'google_sso_pass');
  } else {
    matchedOrg = orgs.find(o => o.id === matchedUser.tenantId) || {
      id: matchedUser.tenantId || 'tenant_apex',
      name: matchedUser.organizationName || organizationName,
      slug: 'workspace',
      plan: 'growth',
      ownerId: matchedUser.id || 'owner',
      createdAt: Date.now(),
      status: 'active'
    };
  }

  const authUser = {
    uid: matchedUser.id,
    email: googleEmail,
    emailVerified: true,
    displayName: matchedUser.name,
    tenantId: matchedUser.tenantId,
    organizationName: matchedUser.organizationName,
    role: matchedUser.role
  };

  mockAuthInstance['currentMockUser'] = authUser;
  mockAuthInstance['authListeners'].forEach((cb: any) => cb(authUser));

  return { user: matchedUser, organization: matchedOrg };
}

/**
 * SaaS Multi-Client Workspace Helpers
 */
export function getOrganizations(): Organization[] {
  return getCollectionData('organizations');
}

export function getOrganization(orgId: string): Organization | undefined {
  const orgs = getCollectionData('organizations');
  return orgs.find(o => o.id === orgId);
}

export async function createClientWorkspace(payload: {
  name: string;
  slug?: string;
  plan?: 'starter' | 'growth' | 'enterprise';
  gstNumber?: string;
  panNumber?: string;
  drugLicenseNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  branchesCount?: number;
  ownerName?: string;
}): Promise<Organization> {
  const orgs = getCollectionData('organizations');
  const tenantId = 'org_' + generateMockId();
  const orgSlug = (payload.slug || payload.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const newOrg: Organization = {
    id: tenantId,
    name: payload.name.trim(),
    slug: orgSlug || 'pharmacy-workspace',
    plan: payload.plan || 'growth',
    ownerId: mockAuthInstance?.currentUser?.uid || 'usr_' + generateMockId(),
    ownerName: payload.ownerName || mockAuthInstance?.currentUser?.displayName || 'Pharmacy Administrator',
    createdAt: Date.now(),
    status: 'active',
    branchesCount: payload.branchesCount || 1,
    gstNumber: payload.gstNumber || '',
    panNumber: payload.panNumber || '',
    drugLicenseNumber: payload.drugLicenseNumber || '',
    address: payload.address || '',
    phone: payload.phone || '',
    email: payload.email || '',
  };

  orgs.push(newOrg);
  saveCollectionData('organizations', orgs);

  // Seed inventory for this new workspace
  const products = getCollectionData('products');
  products.push(
    {
      id: 'p_' + generateMockId(),
      tenantId: tenantId,
      name: 'Paracetamol 650mg Tablets',
      genericName: 'Paracetamol / Acetaminophen',
      category: 'Analgesics',
      manufacturer: 'GSK Pharmaceuticals',
      hsnCode: '30049011',
      unit: 'Strip',
      purchasePrice: 15.0,
      mrp: 28.0,
      gstPercent: 12,
      stockQty: 80,
      reorderLevel: 20,
      rackLocation: 'A-01',
      supplierName: 'National Pharma Logistics',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'p_' + generateMockId(),
      tenantId: tenantId,
      name: 'Amoxicillin 500mg Caps',
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      manufacturer: 'Cipla Healthcare',
      hsnCode: '30041010',
      unit: 'Strip',
      purchasePrice: 48.0,
      mrp: 85.0,
      gstPercent: 12,
      stockQty: 50,
      reorderLevel: 15,
      rackLocation: 'B-02',
      supplierName: 'National Pharma Logistics',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'p_' + generateMockId(),
      tenantId: tenantId,
      name: 'Azithromycin 500mg Tablets',
      genericName: 'Azithromycin Dihydrate',
      category: 'Antibiotics',
      manufacturer: 'Sun Pharmaceuticals',
      hsnCode: '30042010',
      unit: 'Strip',
      purchasePrice: 65.0,
      mrp: 118.0,
      gstPercent: 12,
      stockQty: 40,
      reorderLevel: 10,
      rackLocation: 'B-03',
      supplierName: 'National Pharma Logistics',
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'p_' + generateMockId(),
      tenantId: tenantId,
      name: 'Pantoprazole 40mg Gastro-Resistant',
      genericName: 'Pantoprazole Sodium',
      category: 'Antacids',
      manufacturer: 'Alkem Labs',
      hsnCode: '30049033',
      unit: 'Strip',
      purchasePrice: 42.0,
      mrp: 89.0,
      gstPercent: 12,
      stockQty: 90,
      reorderLevel: 25,
      rackLocation: 'C-01',
      supplierName: 'National Pharma Logistics',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  );
  saveCollectionData('products', products);

  // Initialize salesCounter for this tenant
  const metadata = getCollectionData('metadata');
  metadata.push({ id: `${tenantId}_salesCounter`, tenantId, current: 0 });
  saveCollectionData('metadata', metadata);

  return newOrg;
}

export function switchWorkspace(targetTenantId: string): Organization {
  const orgs = getCollectionData('organizations');
  const org = orgs.find(o => o.id === targetTenantId);
  if (!org) {
    throw new Error('Workspace not found: ' + targetTenantId);
  }

  // Update mockAuthInstance
  if (mockAuthInstance.currentUser) {
    mockAuthInstance.currentUser.tenantId = targetTenantId;
    mockAuthInstance.currentUser.organizationName = org.name;
    mockAuthInstance.currentUser.organizationSlug = org.slug;
    mockAuthInstance.currentUser.plan = org.plan;
  }

  // Update localStorage meditrack-auth-storage
  try {
    const raw = localStorage.getItem('meditrack-auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state) {
        parsed.state.organization = org;
        if (parsed.state.user) {
          parsed.state.user.tenantId = targetTenantId;
          parsed.state.user.organizationName = org.name;
          parsed.state.user.organizationSlug = org.slug;
          parsed.state.user.plan = org.plan;
        }
        localStorage.setItem('meditrack-auth-storage', JSON.stringify(parsed));
      }
    }
  } catch (_) {}

  // Trigger all active Firestore snapshot listeners across the app
  dbEmitter.emit();

  return org;
}

export function updateClientWorkspace(orgId: string, updates: Partial<Organization>): Organization {
  const orgs = getCollectionData('organizations');
  const index = orgs.findIndex(o => o.id === orgId);
  if (index < 0) {
    throw new Error('Organization not found: ' + orgId);
  }

  const updatedOrg = { ...orgs[index], ...updates };
  orgs[index] = updatedOrg;
  saveCollectionData('organizations', orgs);

  // If active workspace, update mock auth user and localStorage
  if (getActiveTenantId() === orgId) {
    if (mockAuthInstance.currentUser) {
      if (updates.name) mockAuthInstance.currentUser.organizationName = updates.name;
      if (updates.slug) mockAuthInstance.currentUser.organizationSlug = updates.slug;
      if (updates.plan) mockAuthInstance.currentUser.plan = updates.plan;
    }
    try {
      const raw = localStorage.getItem('meditrack-auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          parsed.state.organization = updatedOrg;
          if (parsed.state.user) {
            if (updates.name) parsed.state.user.organizationName = updates.name;
            if (updates.slug) parsed.state.user.organizationSlug = updates.slug;
            if (updates.plan) parsed.state.user.plan = updates.plan;
          }
          localStorage.setItem('meditrack-auth-storage', JSON.stringify(parsed));
        }
      }
    } catch (_) {}
  }

  dbEmitter.emit();
  return updatedOrg;
}

export function getWorkspaceMembers(tenantId: string): User[] {
  const users = getCollectionData('users');
  return users.filter(u => u.tenantId === tenantId);
}

export async function addWorkspaceMember(payload: {
  tenantId: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: 'owner' | 'admin' | 'pharmacist' | 'staff';
  phone?: string;
}): Promise<User> {
  const users = getCollectionData('users');
  const normUsername = payload.username.trim().toLowerCase();
  const normEmail = payload.email.trim().toLowerCase();

  const existing = users.find(u => u.username?.toLowerCase() === normUsername);
  if (existing) {
    throw new Error(`Username "${normUsername}" is already taken.`);
  }

  const org = getOrganization(payload.tenantId);

  const newUser: User = {
    id: 'usr_' + generateMockId(),
    name: payload.name.trim(),
    username: normUsername,
    internalAuthEmail: normEmail,
    contactEmail: normEmail,
    role: payload.role,
    isActive: true,
    tenantId: payload.tenantId,
    organizationName: org?.name || 'Pharmacy Workspace',
    organizationSlug: org?.slug || 'workspace',
    plan: org?.plan || 'growth',
    phone: payload.phone || '',
    createdAt: Date.now(),
    createdBy: mockAuthInstance?.currentUser?.uid || 'workspace_admin',
    emailVerified: true
  };

  users.push(newUser);
  saveCollectionData('users', users);

  const pass = payload.password || 'meditrack123';
  saveStoredPassword(normUsername, pass);
  saveStoredPassword(normEmail, pass);

  dbEmitter.emit();
  return newUser;
}

export function deleteWorkspaceMember(userId: string) {
  const users = getCollectionData('users');
  const filtered = users.filter(u => u.id !== userId);
  saveCollectionData('users', filtered);
  dbEmitter.emit();
}

export function exportActiveTenantData(tenantId?: string) {
  const tid = tenantId || getActiveTenantId();
  const org = getOrganization(tid);
  const products = getCollectionData('products').filter(p => (p.tenantId || 'tenant_apex') === tid);
  const sales = getCollectionData('sales').filter(s => (s.tenantId || 'tenant_apex') === tid);
  const purchases = getCollectionData('purchases').filter(p => (p.tenantId || 'tenant_apex') === tid);
  const customers = getCollectionData('customers').filter(c => (c.tenantId || 'tenant_apex') === tid);
  const doctors = getCollectionData('doctors').filter(d => (d.tenantId || 'tenant_apex') === tid);
  const members = getWorkspaceMembers(tid);

  return {
    organization: org,
    exportedAt: new Date().toISOString(),
    version: '2.0.0-saas',
    data: {
      products,
      sales,
      purchases,
      customers,
      doctors,
      members: members.map(({ id, name, username, contactEmail, role, isActive }) => ({ id, name, username, contactEmail, role, isActive }))
    }
  };
}

export const updatePassword = async (user: any, pass: string) => {
  return Promise.resolve();
};

export const reauthenticateWithCredential = async (user: any, cred: any) => {
  return Promise.resolve();
};

export class EmailAuthProvider {
  static credential(email: string, pass: string) {
    return { email, pass };
  }
}

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}

// -------------------------------------------------------------
// FIREBASE FIRESTORE MOCK
// -------------------------------------------------------------
export const getFirestore = () => ({ type: '[MockFirestore]' });

export function writeBatch(db: any) {
  const operations: Array<() => Promise<void>> = [];
  return {
    set: (docRef: any, data: any) => {
      operations.push(async () => {
        await setDoc(docRef, data);
      });
    },
    update: (docRef: any, data: any) => {
      operations.push(async () => {
        await updateDoc(docRef, data);
      });
    },
    delete: (docRef: any) => {
      operations.push(async () => {
        await deleteDoc(docRef);
      });
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
    }
  };
}

export function collection(db: any, path: string) {
  return { type: 'collection', path };
}

export function doc(parent: any, ...segments: string[]) {
  let path = '';
  if (parent.type === 'collection') {
    path = `${parent.path}/${segments[0]}`;
  } else {
    path = segments.join('/');
  }
  
  const parts = path.split('/');
  const id = parts[parts.length - 1];
  const collectionPath = parts.slice(0, -1).join('/');

  return { type: 'document', path, id, collectionPath };
}

export function query(colRef: any, ...constraints: any[]) {
  return { type: 'query', colRef, constraints };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export async function getDoc(docRef: any) {
  const collectionName = docRef.collectionPath;
  const docs = getCollectionData(collectionName);
  const currentTenantId = getActiveTenantId();

  if (collectionName === 'metadata') {
    const scopedId = `${currentTenantId}_${docRef.id}`;
    const matched = docs.find(d => d.id === scopedId) || docs.find(d => d.id === docRef.id && (!d.tenantId || d.tenantId === currentTenantId));
    return {
      id: docRef.id,
      exists: () => !!matched,
      data: () => matched ? { ...matched } : undefined
    };
  }

  const matched = docs.find(d => {
    if (d.id !== docRef.id) return false;
    if (TENANT_ISOLATED_COLLECTIONS.has(collectionName)) {
      return (d.tenantId || 'tenant_apex') === currentTenantId;
    }
    return true;
  });

  return {
    id: docRef.id,
    exists: () => !!matched,
    data: () => matched ? { ...matched } : undefined
  };
}

export async function getDocs(queryOrColRef: any) {
  let colRef = queryOrColRef;
  let constraints: any[] = [];

  if (queryOrColRef.type === 'query') {
    colRef = queryOrColRef.colRef;
    constraints = queryOrColRef.constraints;
  }

  const collectionName = colRef.path;
  let items = [...getCollectionData(collectionName)];

  // Automatic tenant isolation:
  if (TENANT_ISOLATED_COLLECTIONS.has(collectionName)) {
    const currentTenantId = getActiveTenantId();
    items = items.filter(item => {
      const itemTenant = item.tenantId || 'tenant_apex';
      return itemTenant === currentTenantId;
    });
  }

  // Apply constraints
  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      const { field, op, value } = constraint;
      items = items.filter(item => {
        const itemVal = item[field];
        if (op === '==') return itemVal === value;
        if (op === '>=') return itemVal >= value;
        if (op === '<=') return itemVal <= value;
        if (op === '>') return itemVal > value;
        if (op === '<') return itemVal < value;
        if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(value);
        return true;
      });
    } else if (constraint.type === 'orderBy') {
      const { field, direction } = constraint;
      items.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (constraint.type === 'limit') {
      items = items.slice(0, constraint.value);
    }
  }

  const snapshotDocs = items.map(item => ({
    id: item.id,
    exists: () => true,
    data: () => ({ ...item })
  }));

  return {
    empty: snapshotDocs.length === 0,
    docs: snapshotDocs,
    forEach: (cb: (doc: any) => void) => {
      snapshotDocs.forEach(cb);
    }
  };
}

export async function setDoc(docRef: any, data: any) {
  const collectionName = docRef.collectionPath;
  const items = getCollectionData(collectionName);
  const currentTenantId = getActiveTenantId();

  let targetId = docRef.id;
  let itemData = { ...data };

  if (collectionName === 'metadata') {
    targetId = `${currentTenantId}_${docRef.id}`;
    itemData.tenantId = currentTenantId;
  } else if (TENANT_ISOLATED_COLLECTIONS.has(collectionName)) {
    if (!itemData.tenantId) {
      itemData.tenantId = currentTenantId;
    }
  }

  const index = items.findIndex(item => item.id === targetId || (item.id === docRef.id && item.tenantId === currentTenantId));
  
  const newItem = { ...itemData, id: targetId };
  if (index >= 0) {
    items[index] = newItem;
  } else {
    items.push(newItem);
  }

  saveCollectionData(collectionName, items);
}

export async function addDoc(colRef: any, data: any) {
  const collectionName = colRef.path;
  const items = getCollectionData(collectionName);
  const newId = generateMockId();
  const currentTenantId = getActiveTenantId();
  
  const newItem = { 
    ...data, 
    id: newId,
    ...(TENANT_ISOLATED_COLLECTIONS.has(collectionName) && !data.tenantId ? { tenantId: currentTenantId } : {})
  };
  items.push(newItem);

  saveCollectionData(collectionName, items);
  return { id: newId };
}

export async function updateDoc(docRef: any, data: any) {
  const collectionName = docRef.collectionPath;
  const items = getCollectionData(collectionName);
  const currentTenantId = getActiveTenantId();

  let targetId = docRef.id;
  if (collectionName === 'metadata') {
    targetId = `${currentTenantId}_${docRef.id}`;
  }

  const index = items.findIndex(item => item.id === targetId || item.id === docRef.id);

  if (index >= 0) {
    items[index] = { ...items[index], ...data };
    saveCollectionData(collectionName, items);
  } else {
    throw new Error(`Document with ID ${docRef.id} not found in ${collectionName}`);
  }
}

export async function deleteDoc(docRef: any) {
  const collectionName = docRef.collectionPath;
  const items = getCollectionData(collectionName);
  const currentTenantId = getActiveTenantId();

  let targetId = docRef.id;
  if (collectionName === 'metadata') {
    targetId = `${currentTenantId}_${docRef.id}`;
  }

  const filtered = items.filter(item => item.id !== targetId && item.id !== docRef.id);
  
  saveCollectionData(collectionName, filtered);
}

export const serverTimestamp = () => Date.now();

export async function runTransaction(db: any, updateFunction: (transaction: any) => Promise<any>) {
  const writes: Array<{ type: 'set' | 'update' | 'delete', docRef: any, data?: any, options?: any }> = [];

  const transaction = {
    get: async (docRef: any) => {
      return getDoc(docRef);
    },
    set: (docRef: any, data: any, options?: any) => {
      writes.push({ type: 'set', docRef, data, options });
    },
    update: (docRef: any, data: any) => {
      writes.push({ type: 'update', docRef, data });
    },
    delete: (docRef: any) => {
      writes.push({ type: 'delete', docRef });
    }
  };

  const result = await updateFunction(transaction);

  for (const write of writes) {
    if (write.type === 'set') {
      await setDoc(write.docRef, write.data);
    } else if (write.type === 'update') {
      await updateDoc(write.docRef, write.data);
    } else if (write.type === 'delete') {
      await deleteDoc(write.docRef);
    }
  }

  return result;
}

export function onSnapshot(ref: any, onNext: (snapshot: any) => void, onError?: (err: any) => void) {
  // Fire once immediately
  const trigger = async () => {
    try {
      if (ref.type === 'document') {
        const snap = await getDoc(ref);
        onNext(snap);
      } else {
        const snap = await getDocs(ref);
        onNext(snap);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  trigger();

  // Return unsubscribe
  return dbEmitter.subscribe(trigger);
}
