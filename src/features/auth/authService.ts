import { User, Organization } from '../../types';
import { 
  getCollectionData, 
  saveCollectionData, 
  generateMockId, 
  switchWorkspace 
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
  authProvider: 'google' | 'facebook' | 'email';
  email: string;
  nationality: string;
  countryCode: string;
  organizationName: string;
  phone: string;
  fullName: string;
  avatarUrl?: string;
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

  // Base username from email local part or clean name
  let baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
  if (!baseUsername) baseUsername = 'user_' + generateMockId().slice(0, 5);
  
  // Ensure username uniqueness
  let username = baseUsername;
  let counter = 1;
  while (users.some((u: User) => u.username?.toLowerCase() === username.toLowerCase())) {
    username = `${baseUsername}${counter++}`;
  }

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
    authProvider: payload.authProvider,
    nationality: payload.nationality,
    countryCode: payload.countryCode,
    registrationCompleted: true,
    createdAt: Date.now(),
    createdBy: `${payload.authProvider}_registration`,
    emailVerified: true
  };

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
