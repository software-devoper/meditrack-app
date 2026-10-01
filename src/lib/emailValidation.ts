/**
 * Email and Credential Validation Utility for MediTrack SaaS
 * Provides enterprise-grade syntax, domain, and disposable-email checks.
 */

// Common disposable/temporary email domains that should be rejected in a B2B SaaS
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'getairmail.com',
  'dispostable.com',
  'mohmal.com',
  'crazymailing.com',
  'temp-mail.org',
  'mytemp.email',
  'dropmail.me',
  'generator.email',
  'emailondeck.com',
  'inboxkitten.com'
]);

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  domain?: string;
  isCorporate?: boolean;
}

/**
 * Validates email format, domain structure, and flags disposable email providers.
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is required.' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic length constraints
  if (trimmed.length < 5 || trimmed.length > 254) {
    return { isValid: false, error: 'Email must be between 5 and 254 characters.' };
  }

  // RFC 5322 compliant regex for standard emails
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email format (e.g. name@pharmacy.com).' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email format.' };
  }

  const [localPart, domain] = parts;

  // Local part validation
  if (localPart.length > 64) {
    return { isValid: false, error: 'The email username part is too long.' };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, error: 'Email username cannot start, end, or contain consecutive dots.' };
  }

  // Domain validation
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, error: 'Email domain must contain a valid extension (e.g., .com, .org).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return { isValid: false, error: 'Email top-level domain must be at least 2 characters.' };
  }

  // Check for disposable temporary email domains
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      domain,
      error: 'Disposable or temporary email addresses are not permitted. Please use your clinic, business, or primary email.'
    };
  }

  // Detect whether it's corporate / clinic custom domain
  const publicMailProviders = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me', 'protonmail.com']);
  const isCorporate = !publicMailProviders.has(domain);

  return {
    isValid: true,
    domain,
    isCorporate
  };
}

/**
 * Calculates password strength on a 0-100 scale with specific criteria feedback
 */
export interface PasswordStrengthResult {
  score: number; // 0 - 100
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Excellent';
  color: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (hasUppercase) score += 15;
  if (hasLowercase) score += 15;
  if (hasNumber) score += 15;
  if (hasSpecial) score += 15;

  score = Math.min(score, 100);

  let label: PasswordStrengthResult['label'] = 'Very Weak';
  let color = 'bg-rose-500';

  if (score >= 85) {
    label = 'Excellent';
    color = 'bg-emerald-500';
  } else if (score >= 65) {
    label = 'Strong';
    color = 'bg-teal-500';
  } else if (score >= 45) {
    label = 'Medium';
    color = 'bg-amber-500';
  } else if (score >= 25) {
    label = 'Weak';
    color = 'bg-orange-500';
  }

  return {
    score,
    label,
    color,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial
  };
}

// In-memory verification codes cache with 10-minute expiry
interface VerificationRecord {
  code: string;
  expiresAt: number;
}
const verificationCodesMap = new Map<string, VerificationRecord>();

/**
 * Generates and stores a 6-digit verification code for an email.
 */
export function issueEmailVerificationCode(email: string): string {
  const normalized = email.toLowerCase().trim();
  // 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodesMap.set(normalized, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });
  return code;
}

/**
 * Validates a verification code against an email.
 */
export function verifyEmailCode(email: string, code: string): { success: boolean; error?: string } {
  const normalized = email.toLowerCase().trim();
  const record = verificationCodesMap.get(normalized);

  if (!record) {
    return { success: false, error: 'No verification code requested for this email or it has expired.' };
  }

  if (Date.now() > record.expiresAt) {
    verificationCodesMap.delete(normalized);
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (record.code !== code.trim()) {
    return { success: false, error: 'Incorrect verification code. Please check and try again.' };
  }

  // Clear code after successful verification
  verificationCodesMap.delete(normalized);
  return { success: true };
}
