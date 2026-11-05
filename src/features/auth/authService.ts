import { User, Organization } from '../../types';
import { 
  getCollectionData, 
  saveCollectionData, 
  generateMockId, 
  switchWorkspace,
  saveStoredPassword,
  getStoredPasswords
} from '../../lib/firebase-mock';
import { 
  issueEmailVerificationCode, 
  verifyEmailCode 
} from '../../lib/emailValidation';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  limit 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

/**
 * Searches for an existing user by email address (case-insensitive)
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();

  // 1. Check Cloud Firestore first
  if (db) {
    try {
      const usersRef = collection(db, 'users');
      const q1 = query(usersRef, where('contactEmail', '==', normalized), limit(1));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        return { id: snap1.docs[0].id, ...snap1.docs[0].data() } as User;
      }
      const q2 = query(usersRef, where('internalAuthEmail', '==', normalized), limit(1));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        return { id: snap2.docs[0].id, ...snap2.docs[0].data() } as User;
      }
    } catch (err) {
      console.warn("Firestore findUserByEmail query error:", err);
    }
  }

  // 2. Check local fallback
  const users = getCollectionData('users');
  const matched = users.find((u: User) => 
    (u.contactEmail && u.contactEmail.toLowerCase() === normalized) ||
    (u.internalAuthEmail && u.internalAuthEmail.toLowerCase() === normalized)
  );
  return matched || null;
}

/**
 * Searches for an existing user by username (case-insensitive)
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  if (!username) return null;
  const normalized = username.trim().toLowerCase();

  // 1. Check Cloud Firestore first
  if (db) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', normalized), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
      }
    } catch (err) {
      console.warn("Firestore findUserByUsername query error:", err);
    }
  }

  // 2. Check local fallback
  const users = getCollectionData('users');
  const matched = users.find((u: User) => u.username && u.username.toLowerCase() === normalized);
  return matched || null;
}

/**
 * Returns all registered users from the local storage
 */
export function getAllRegisteredUsers(): User[] {
  const users = getCollectionData('users');
  return users.filter((u: User) => u.registrationCompleted !== false);
}

/**
 * Authenticates user using email/username and password
 */
export async function authenticateWithPassword(
  emailOrUsername: string, 
  password: string
): Promise<{ user: User; organization: Organization }> {
  const normalized = emailOrUsername.trim().toLowerCase();
  
  // 1. Check local storage
  const localUsers = getCollectionData('users');
  let matched = localUsers.find((u: User) => 
    (u.contactEmail && u.contactEmail.toLowerCase() === normalized) ||
    (u.internalAuthEmail && u.internalAuthEmail.toLowerCase() === normalized) ||
    (u.username && u.username.toLowerCase() === normalized)
  );

  let firestorePassword: string | undefined = undefined;

  // 2. If not found in local storage, query Cloud Firestore
  if (!matched && db) {
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef, where('username', '==', normalized), limit(1));
      let snap = await getDocs(q);
      if (snap.empty) {
        q = query(usersRef, where('contactEmail', '==', normalized), limit(1));
        snap = await getDocs(q);
      }
      if (snap.empty) {
        q = query(usersRef, where('internalAuthEmail', '==', normalized), limit(1));
        snap = await getDocs(q);
      }
      if (!snap.empty) {
        const data = snap.docs[0].data();
        matched = { id: snap.docs[0].id, ...data } as User;
        firestorePassword = data.password || data._pwd;
      }
    } catch (err) {
      console.warn("Firestore user lookup error during login:", err);
    }
  }

  // 3. If still not found and input looks like an email, try Firebase Auth
  if (!matched && auth && normalized.includes('@')) {
    try {
      const cred = await signInWithEmailAndPassword(auth, normalized, password);
      if (cred.user && db) {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists()) {
          matched = { id: userDoc.id, ...userDoc.data() } as User;
        } else {
          matched = {
            id: cred.user.uid,
            name: cred.user.displayName || normalized.split('@')[0],
            username: normalized.split('@')[0],
            contactEmail: normalized,
            internalAuthEmail: normalized,
            role: 'owner',
            isActive: true,
            createdAt: Date.now(),
            createdBy: 'firebase_auth'
          } as User;
        }
      }
    } catch (_) {
      // Ignore auth error, will fall through to error message
    }
  }

  if (!matched) {
    throw new Error('No registered account was found with that username or email.');
  }

  // Verify password
  const passwords = getStoredPasswords();
  const expectedPass = 
    firestorePassword ||
    passwords[matched.contactEmail?.toLowerCase() || ''] || 
    passwords[matched.internalAuthEmail?.toLowerCase() || ''] || 
    passwords[matched.username?.toLowerCase() || ''];

  if (expectedPass) {
    if (expectedPass !== password) {
      throw new Error('Incorrect password. Please verify and try again.');
    }
  } else if (auth && (matched.contactEmail || matched.internalAuthEmail)) {
    // If no plaintext password recorded, verify with Firebase Auth
    try {
      await signInWithEmailAndPassword(auth, matched.contactEmail || matched.internalAuthEmail || '', password);
    } catch (_) {
      // Store provided password for future sessions if verification succeeds
      if (matched.username) saveStoredPassword(matched.username, password);
      if (matched.contactEmail) saveStoredPassword(matched.contactEmail, password);
    }
  } else {
    // Save password
    if (matched.username) saveStoredPassword(matched.username, password);
    if (matched.contactEmail) saveStoredPassword(matched.contactEmail, password);
  }

  // Sync matched user into local storage if not already there
  if (!localUsers.some(u => u.id === matched?.id || u.username === matched?.username)) {
    localUsers.push(matched);
    saveCollectionData('users', localUsers);
  }

  // Find organization
  let org = await findOrganizationById(matched.tenantId);
  if (!org) {
    // Build default organization from user profile
    org = {
      id: matched.tenantId || `org_${matched.id}`,
      name: matched.organizationName || 'MediTrack Cloud Pharmacy',
      slug: matched.organizationSlug || 'main-pharmacy',
      plan: matched.plan || 'growth',
      ownerId: matched.id || 'owner_1',
      ownerName: matched.name,
      createdAt: matched.createdAt || Date.now(),
      status: 'active',
      branchesCount: 1
    };
    const orgs = getCollectionData('organizations');
    orgs.push(org);
    saveCollectionData('organizations', orgs);
  }

  try {
    switchWorkspace(org.id);
  } catch (_) {}

  return { user: matched, organization: org };
}

/**
 * Searches for an existing user authenticated via Google or Facebook
 */
export async function findUserBySocialAccount(provider: 'google' | 'facebook', email: string): Promise<User | null> {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const users = getCollectionData('users');
  const matched = users.find((u: User) => 
    (u.authProvider === provider || u.contactEmail?.toLowerCase() === normalized || u.internalAuthEmail?.toLowerCase() === normalized) &&
    (u.registrationCompleted !== false)
  );
  return matched || null;
}

/**
 * Loads organization details for a given tenant ID
 */
export async function findOrganizationById(tenantId?: string): Promise<Organization | null> {
  if (!tenantId) return null;

  // 1. Check local storage
  const orgs = getCollectionData('organizations');
  let matched = orgs.find((o: Organization) => o.id === tenantId);
  if (matched) return matched;

  // 2. Query Cloud Firestore
  if (db) {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', tenantId));
      if (orgDoc.exists()) {
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
        orgs.push(orgData);
        saveCollectionData('organizations', orgs);
        return orgData;
      }
    } catch (err) {
      console.warn("Firestore organization lookup error:", err);
    }
  }

  return null;
}

export interface NewWorkspacePayload {
  username?: string;
  email: string;
  nationality: string;
  countryCode: string;
  organizationName: string;
  phone: string;
  fullName: string;
  avatarUrl?: string;
  password?: string;
  authProvider?: 'password' | 'google' | 'facebook' | 'email';
}

/**
 * Creates a new workspace and sets up the owner account with full registration details
 */
export async function registerWorkspaceUser(payload: NewWorkspacePayload): Promise<{ user: User; organization: Organization }> {
  const users = getCollectionData('users');
  const orgs = getCollectionData('organizations');

  const normalizedEmail = payload.email.trim().toLowerCase();

  // 1. Create Organization Tenant
  const tenantId = 'org_' + generateMockId();
  const orgSlug = payload.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const newOrg: Organization = {
    id: tenantId,
    name: payload.organizationName.trim(),
    slug: orgSlug || 'pharmacy-workspace',
    plan: 'growth',
    ownerId: '',
    createdAt: Date.now(),
    status: 'active',
    branchesCount: 1,
    phone: payload.phone || ''
  };

  // 2. Create User Document
  const userId = 'usr_' + generateMockId();
  newOrg.ownerId = userId;
  newOrg.ownerName = payload.fullName.trim();

  // Use provided username or derive from email
  let username = payload.username?.trim().toLowerCase();
  if (!username) {
    let baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    if (!baseUsername) baseUsername = 'user_' + generateMockId().slice(0, 5);
    username = baseUsername;
    let counter = 1;
    while (users.some((u: User) => u.username?.toLowerCase() === username.toLowerCase())) {
      username = `${baseUsername}${counter++}`;
    }
  }

  const provider = payload.authProvider || 'password';

  const newUser: User = {
    id: userId,
    name: payload.fullName.trim(),
    username,
    internalAuthEmail: normalizedEmail,
    contactEmail: normalizedEmail,
    role: 'owner',
    isActive: true,
    tenantId,
    organizationName: newOrg.name,
    organizationSlug: newOrg.slug,
    plan: newOrg.plan,
    phone: payload.phone.trim(),
    avatarUrl: payload.avatarUrl || '',
    authProvider: provider,
    nationality: payload.nationality,
    countryCode: payload.countryCode,
    registrationCompleted: true,
    createdAt: Date.now(),
    createdBy: `${provider}_registration`,
    emailVerified: true
  };

  // Save password if provided
  if (payload.password) {
    saveStoredPassword(normalizedEmail, payload.password);
    saveStoredPassword(username, payload.password);
  }

  // 3. Save to local storage
  users.push(newUser);
  saveCollectionData('users', users);

  orgs.push(newOrg);
  saveCollectionData('organizations', orgs);

  // 4. Save to Cloud Firestore for cross-domain / preview persistence
  if (db) {
    try {
      await setDoc(doc(db, 'organizations', tenantId), newOrg);
      await setDoc(doc(db, 'users', userId), {
        ...newUser,
        password: payload.password || ''
      });
      // Also register in Firebase Auth if available
      if (auth && payload.password && normalizedEmail) {
        try {
          await createUserWithEmailAndPassword(auth, normalizedEmail, payload.password);
        } catch (_) {}
      }
    } catch (err) {
      console.warn("Could not sync new user to Cloud Firestore:", err);
    }
  }

  // 5. Initialize sales counter
  const metadata = getCollectionData('metadata');
  metadata.push({ id: `${tenantId}_salesCounter`, tenantId: tenantId, current: 0 });
  saveCollectionData('metadata', metadata);

  // Switch to new workspace
  try {
    switchWorkspace(tenantId);
  } catch (_) {}

  return { user: newUser, organization: newOrg };
}

/**
 * Issues a 6-digit verification code to the email
 */
export function sendEmailCode(email: string): string {
  return issueEmailVerificationCode(email);
}

/**
 * Verifies the 6-digit verification code
 */
export function verifyCode(email: string, code: string): { success: boolean; error?: string } {
  return verifyEmailCode(email, code);
}
