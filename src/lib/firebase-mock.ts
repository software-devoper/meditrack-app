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
// Purge legacy demo data on load to guarantee pristine registration state
(function purgeLegacyDemoData() {
  try {
    const PURGE_KEY = 'meditrack_clean_zero_demo_v5';
    if (typeof localStorage !== 'undefined' && localStorage.getItem(PURGE_KEY) !== 'true') {
      const keysToClear = [
        'meditrack_mock_organizations',
        'meditrack_mock_users',
        'meditrack_mock_products',
        'meditrack_mock_customers',
        'meditrack_mock_doctors',
        'meditrack_mock_sales',
        'meditrack_mock_purchases',
        'meditrack_mock_purchase',
        'meditrack_mock_stockLedger',
        'meditrack_mock_metadata',
        'meditrack_mock_auditLogs',
        'meditrack_mock_passwords',
        'meditrack-auth-storage',
        'meditrack_has_logged_out'
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(PURGE_KEY, 'true');
    }
  } catch (_) {}
})();

// Clean initial empty database state
const SEED_DATA: Record<string, any[]> = {
  organizations: [],
  users: [],
  products: [],
  customers: [],
  doctors: [],
  sales: [],
  purchases: [],
  stockLedger: [],
  metadata: []
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
  return '';
}

// Helper to get collection from localStorage
export function getCollectionData(collectionName: string): any[] {
  const key = `meditrack_mock_${collectionName}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {}
  }
  const empty: any[] = [];
  localStorage.setItem(key, JSON.stringify(empty));
  return empty;
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
export function getStoredPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem('meditrack_mock_passwords');
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export function saveStoredPassword(key: string, pass: string) {
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
            uid: user.id || '',
            email: user.internalAuthEmail || user.contactEmail || '',
            emailVerified: true,
            displayName: user.name || 'Pharmacy Administrator',
            tenantId: user.tenantId || '',
            organizationName: user.organizationName || ''
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
export async function signInWithGoogleSaaS(organizationName = 'My Pharmacy Workspace', userEmail = 'user@gmail.com', userName = 'Pharmacy Owner') {
  const users = getCollectionData('users');
  const orgs = getCollectionData('organizations');

  const googleEmail = userEmail.toLowerCase().trim();
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
