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

/**
 * Searches for an existing user by email address (case-insensitive)
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
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
  const users = getCollectionData('users');
  const matched = users.find((u: User) => 
    (u.contactEmail && u.contactEmail.toLowerCase() === normalized) ||
    (u.internalAuthEmail && u.internalAuthEmail.toLowerCase() === normalized) ||
    (u.username && u.username.toLowerCase() === normalized)
  );

  if (!matched) {
    throw new Error('No registered account was found with that username or email.');
  }

  const passwords = getStoredPasswords();
  const expectedPass = 
    passwords[matched.contactEmail?.toLowerCase() || ''] || 
    passwords[matched.internalAuthEmail?.toLowerCase() || ''] || 
    passwords[matched.username?.toLowerCase() || ''];

  if (expectedPass) {
    if (expectedPass !== password) {
      throw new Error('Incorrect password. Please verify and try again.');
    }
  } else {
    // If no password set yet, store it
    if (matched.username) saveStoredPassword(matched.username, password);
    if (matched.contactEmail) saveStoredPassword(matched.contactEmail, password);
  }

  const org = await findOrganizationById(matched.tenantId);
  if (!org) {
    throw new Error('Workspace details could not be found.');
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
  const orgs = getCollectionData('organizations');
  const matched = orgs.find((o: Organization) => o.id === tenantId);
  return matched || null;
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

  // 3. Save to storage
  users.push(newUser);
  saveCollectionData('users', users);

  orgs.push(newOrg);
  saveCollectionData('organizations', orgs);

  // 4. Initialize sales counter
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
