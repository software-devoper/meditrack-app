import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  User as UserIcon, 
  Camera, 
  Upload, 
  Check, 
  Search, 
  X, 
  Loader2, 
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  LogIn
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button, Input } from '../../components/ui';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { COUNTRIES, CountryInfo, findCountry, getDialCodeForNationality } from './countries';
import { 
  findUserByEmail, 
  findOrganizationById, 
  registerWorkspaceUser, 
  sendEmailCode, 
  verifyCode,
  authenticateWithPassword,
  getAllRegisteredUsers
} from './authService';
import { User, Organization } from '../../types';

type ScreenState = 
  | 'initial'
  | 'email-input'
  | 'email-verify'
  | 'onboarding';

export function AuthPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  // Tab State: 'signin' for existing users, 'register' for creating new workspace
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [existingUsers, setExistingUsers] = useState<User[]>([]);

  // Screen routing
  const [screen, setScreen] = useState<ScreenState>('initial');
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  // Email authentication state (code verification)
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Social account modal state
  const [activeSocialProvider, setActiveSocialProvider] = useState<'google' | 'facebook' | null>(null);
  const [customSocialEmail, setCustomSocialEmail] = useState('');
  const [customSocialName, setCustomSocialName] = useState('');

  // Onboarding state
  const [onboardingProvider, setOnboardingProvider] = useState<'google' | 'facebook' | 'email'>('email');
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Nationality
  const [selectedNationality, setSelectedNationality] = useState<string>('Indian');
  const [nationalitySearch, setNationalitySearch] = useState('');

  // Step 2: Pharmacy / Organization Name
  const [organizationName, setOrganizationName] = useState('');

  // Step 3: Phone Number
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 4: Full Name & Account Password
  const [fullName, setFullName] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Step 5: Profile Picture
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing registered users & check logout status on mount
  useEffect(() => {
    const users = getAllRegisteredUsers();
    setExistingUsers(users);

    const loggedOut = localStorage.getItem('meditrack_has_logged_out');
    const lastEmail = localStorage.getItem('meditrack_last_logged_out_email');

    if (loggedOut === 'true' || users.length > 0) {
      setHasLoggedOut(true);
      setAuthTab('signin'); // When logged out, ALWAYS show sign-in, never registration!
      if (lastEmail) {
        setEmail(lastEmail);
      } else if (users.length > 0 && users[0].contactEmail) {
        setEmail(users[0].contactEmail);
      }
    } else {
      // First time fresh visitor with 0 users: show register tab
      setAuthTab('register');
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && user.registrationCompleted !== false) {
      navigate('/');
    }
  }, [user, navigate]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Stop camera when unmounted
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleStartCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.info("Camera not supported on this browser. Please upload an image file.");
        fileInputRef.current?.click();
        return;
      }
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable", err);
      toast.error("Camera access failed. Please upload a photo instead.");
      setIsCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setProfilePicture(dataUrl);
      toast.success("Photo captured successfully");
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfilePicture(event.target.result as string);
        toast.success("Profile picture updated");
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick 1-Click login for an existing registered account
  const handleQuickLogin = async (targetUser: User) => {
    setIsSubmitting(true);
    try {
      const org = await findOrganizationById(targetUser.tenantId);
      if (!org) {
        toast.error('Workspace data not found. Please log in with your credentials.');
        return;
      }
      setUser(targetUser, targetUser.id, org);
      localStorage.removeItem('meditrack_has_logged_out');
      localStorage.setItem('meditrack_last_logged_out_email', targetUser.contactEmail || '');
      toast.success(`Welcome back, ${targetUser.name || 'Doctor'}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign into workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request 6-digit email code from Sign In page
  const handleGetSignInCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Please enter a valid email address (e.g. doctor@pharmacy.com)');
      return;
    }

    setIsSubmitting(true);
    try {
      const existingUser = await findUserByEmail(cleanEmail);

      if (existingUser && existingUser.registrationCompleted !== false) {
        // User IS REGISTERED -> send 6-digit code for sign in
        const code = sendEmailCode(cleanEmail);
        setSentCode(code);
        setResendTimer(60);
        setVerificationCode('');
        setScreen('email-verify');

        toast.success(`Verification code generated: ${code}`, {
          duration: 15000,
          description: `6-digit security code sent to ${cleanEmail}. Click Auto-Fill to apply.`
        });
      } else {
        // User is UNREGISTERED -> Notify and redirect to sign up flow
        toast.info("No existing workspace found with this email. Redirecting you to set up your pharmacy workspace...", {
          duration: 6000,
          description: "Let's set up your clinic, stock records, and billing in under 2 minutes."
        });

        setOnboardingProvider('email');
        setOnboardingEmail(cleanEmail);

        // Also generate code so user can verify and proceed with onboarding immediately
        const code = sendEmailCode(cleanEmail);
        setSentCode(code);
        setResendTimer(60);
        setVerificationCode('');
        setScreen('email-verify');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google / Facebook sign-in trigger
  const handleSocialClick = (provider: 'google' | 'facebook') => {
    setActiveSocialProvider(provider);
    setCustomSocialEmail('');
    setCustomSocialName('');
  };

  // Submit Social modal form
  const handleSocialFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customSocialEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    const provider = activeSocialProvider || 'google';
    setActiveSocialProvider(null);
    setIsSubmitting(true);

    try {
      const existingUser = await findUserByEmail(cleanEmail);
      if (existingUser && existingUser.registrationCompleted !== false) {
        // Registered User -> Go directly to existing workspace!
        const org = await findOrganizationById(existingUser.tenantId);
        setUser(existingUser, existingUser.id, org);
        localStorage.removeItem('meditrack_has_logged_out');
        localStorage.setItem('meditrack_last_logged_out_email', cleanEmail);
        toast.success(`Welcome back, ${existingUser.name || 'Doctor'}!`);
        navigate('/');
      } else {
        // New User -> Begin Onboarding Flow
        setOnboardingProvider(provider);
        setOnboardingEmail(cleanEmail);
        setFullName(customSocialName.trim() || cleanEmail.split('@')[0]);
        setCurrentStep(1);
        setScreen('onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request 6-digit email code
  const handleGetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Please enter a valid email address (e.g. doctor@pharmacy.com)');
      return;
    }

    setIsSubmitting(true);
    try {
      const code = sendEmailCode(cleanEmail);
      setSentCode(code);
      setResendTimer(60);
      setVerificationCode('');
      setScreen('email-verify');

      // Trigger high-visibility toast notification with the code
      toast.success(`Verification code generated: ${code}`, {
        duration: 15000,
        description: 'Code displayed on screen. Click Auto-Fill to apply it.'
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify 6-digit email code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      toast.error('Please enter the full 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const result = verifyCode(email, cleanCode);
      if (!result.success) {
        toast.error(result.error || 'Incorrect verification code. Please check and try again.');
        setIsVerifying(false);
        return;
      }

      // Check if email already belongs to a registered workspace owner
      const existingUser = await findUserByEmail(email);

      if (existingUser && existingUser.registrationCompleted !== false) {
        // User already has a registered workspace -> log straight in!
        const org = await findOrganizationById(existingUser.tenantId);
        setUser(existingUser, existingUser.id, org);
        localStorage.removeItem('meditrack_has_logged_out');
        localStorage.setItem('meditrack_last_logged_out_email', existingUser.contactEmail || '');
        toast.success(`Welcome back, ${existingUser.name || 'Doctor'}! Entered ${org?.name || 'Workspace'}`);
        navigate('/');
      } else {
        // Brand new email -> proceed to onboarding setup
        setOnboardingProvider('email');
        setOnboardingEmail(email.trim().toLowerCase());
        setFullName(existingUser?.name || '');
        setCurrentStep(1);
        setScreen('onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Nationality dial code
  const dialCode = getDialCodeForNationality(selectedNationality);

  // Complete onboarding and enter workspace
  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhone = `${dialCode} ${cleanPhone}`;

      const { user: createdUser, organization: createdOrg } = await registerWorkspaceUser({
        authProvider: onboardingProvider,
        email: onboardingEmail,
        nationality: selectedNationality,
        countryCode: dialCode,
        organizationName: organizationName.trim(),
        phone: fullPhone,
        fullName: fullName.trim(),
        avatarUrl: profilePicture,
        password: newAccountPassword.trim() || undefined
      });

      setUser(createdUser, createdUser.id, createdOrg);
      localStorage.removeItem('meditrack_has_logged_out');
      localStorage.setItem('meditrack_last_logged_out_email', createdUser.contactEmail || '');
      toast.success(`Workspace created! Welcome to ${createdOrg.name}`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete workspace registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered countries for nationality search
  const filteredCountries = COUNTRIES.filter(c => {
    if (!nationalitySearch.trim()) return true;
    const q = nationalitySearch.toLowerCase().trim();
    return c.nationality.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-all">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              MediTrack
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            Pharmacy ERP & Workspace Management Platform
          </p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB SWITCHER: SIGN IN vs REGISTER WORKSPACE          */}
        {/* ---------------------------------------------------- */}
        {screen === 'initial' && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-5">
            <button
              type="button"
              onClick={() => setAuthTab('signin')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authTab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Register Workspace</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 1: INITIAL SCREEN (SIGN IN OR REGISTER)       */}
        {/* ---------------------------------------------------- */}
        {screen === 'initial' && authTab === 'signin' && (
          <div className="space-y-4">
            
            {/* Quick Login if accounts already exist on this device */}
            {existingUsers.length > 0 && (
              <div className="p-3.5 rounded-xl border border-primary-200 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-950/20 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                    Existing Workspace Found
                  </span>
                  <span className="text-[10px] bg-primary-100 dark:bg-primary-900/60 text-primary-800 dark:text-primary-200 px-2 py-0.5 rounded-full font-semibold">
                    Ready
                  </span>
                </div>

                {existingUsers.slice(0, 2).map((u) => (
                  <div key={u.id} className="flex items-center justify-between pt-1">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {u.organizationName || 'Pharmacy Workspace'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {u.name} ({u.contactEmail || u.internalAuthEmail})
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleQuickLogin(u)}
                      disabled={isSubmitting}
                      className="h-8 text-xs font-semibold px-3 shrink-0 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
                    >
                      Sign In
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Social Sign-In Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSocialClick('google')}
                className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.43 7.31 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.99 0 12s.45 3.84 1.24 5.41l4.04-3.13z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.57 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialClick('facebook')}
                className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Continue with Facebook</span>
              </button>
            </div>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">or sign in with email code</span>
              </div>
            </div>

            {/* Email OTP Code Sign In Form */}
            <form onSubmit={handleGetSignInCode} className="space-y-3 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    required
                    placeholder="doctor@pharmacy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enter your email to receive a 6-digit verification code. If your email is not registered yet, you'll be redirected to register.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full h-11 text-xs font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking & Sending Code...
                  </span>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Get Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </form>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 1: REGISTER WORKSPACE TAB                     */}
        {/* ---------------------------------------------------- */}
        {screen === 'initial' && authTab === 'register' && (
          <div className="space-y-3 pt-1">
            <div className="text-center pb-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Register a New Pharmacy Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set up your clinic, stock records, and billing in under 2 minutes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSocialClick('google')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.43 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.99 0 12s.45 3.84 1.24 5.41l4.04-3.13z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.57 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialClick('facebook')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScreen('email-input')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Register with Email</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 2: EMAIL INPUT (GET 6-DIGIT CODE)             */}
        {/* ---------------------------------------------------- */}
        {screen === 'email-input' && (
          <form onSubmit={handleGetCode} className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen('initial')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center pb-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Enter your email address
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                We'll issue a 6-digit verification code to confirm your identity.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email address <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                required
                autoFocus
                placeholder="doctor@pharmacy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating Code...
                </span>
              ) : (
                'Get Verification Code'
              )}
            </Button>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 3: EMAIL CODE VERIFICATION                    */}
        {/* ---------------------------------------------------- */}
        {screen === 'email-verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen('email-input')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email</span>
            </button>

            <div className="text-center pb-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Enter the 6-Digit Code
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sent for <strong className="text-slate-800 dark:text-slate-200">{email}</strong>
              </p>
            </div>

            {/* Prominent On-Screen Verification Code Display */}
            {sentCode && (
              <div className="p-3.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-primary-900 dark:text-primary-200">
                    <ShieldCheck className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-bold">Verification Code</span>
                  </div>
                  <span className="font-mono text-base font-extrabold tracking-widest bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 shadow-2xs">
                    {sentCode}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                  <span>Enter the code below to verify:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationCode(sentCode);
                      toast.success(`Code ${sentCode} auto-filled!`);
                    }}
                    className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 underline cursor-pointer"
                  >
                    Auto-Fill Code
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                6-digit code
              </label>
              <Input
                type="text"
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-center font-mono tracking-widest text-xl font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={isVerifying || verificationCode.trim().length !== 6}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code...
                </span>
              ) : (
                'Continue'
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={handleGetCode}
                className="text-xs font-medium text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 4: ONBOARDING PROCESS (5 STEPS)               */}
        {/* ---------------------------------------------------- */}
        {screen === 'onboarding' && (
          <div className="space-y-5">
            {/* Header with Step Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep((prev) => (prev - 1) as any);
                  } else {
                    setScreen('initial');
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      s === currentStep
                        ? 'w-6 bg-primary-600'
                        : s < currentStep
                        ? 'w-2 bg-emerald-500'
                        : 'w-2 bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
                <span className="text-[11px] font-semibold text-slate-400 ml-1">
                  Step {currentStep} of 5
                </span>
              </div>
            </div>

            {/* STEP 1: NATIONALITY */}
            {currentStep === 1 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Where is your pharmacy registered?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select your country for local taxes, currency, and dialing codes.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search country or nationality..."
                    value={nationalitySearch}
                    onChange={(e) => setNationalitySearch(e.target.value)}
                    className="h-10 pl-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-slate-100 dark:border-slate-800/80 rounded-xl p-1 bg-slate-50/50 dark:bg-slate-950/30">
                  {filteredCountries.map((c) => {
                    const isSelected = selectedNationality === c.nationality;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSelectedNationality(c.nationality)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white font-semibold shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{c.name}</span>
                          <span className={isSelected ? 'text-primary-100' : 'text-slate-400'}>
                            ({c.nationality})
                          </span>
                        </div>
                        <span className={`font-mono text-[11px] shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          {c.dialCode}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  Next: Pharmacy Name
                </Button>
              </div>
            )}

            {/* STEP 2: PHARMACY / ORGANIZATION NAME */}
            {currentStep === 2 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    What is your pharmacy workspace name?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    This appears on receipts, invoice headers, and audit reports.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pharmacy / Organization Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. MedPlus Pharmacy"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!organizationName.trim()) {
                      toast.error('Please enter your pharmacy name');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  disabled={!organizationName.trim()}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  Next: Phone Number
                </Button>
              </div>
            )}

            {/* STEP 3: PHONE NUMBER */}
            {currentStep === 3 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Enter your contact phone number
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Used for critical low-stock alerts, login recovery, and SMS invoices.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                    <div className="px-3.5 h-full bg-slate-50 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                      {dialCode}
                    </div>
                    <input
                      type="tel"
                      required
                      autoFocus
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-full px-3 text-sm bg-transparent outline-hidden font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    const clean = phoneNumber.replace(/\D/g, '');
                    if (!clean || clean.length < 7) {
                      toast.error('Please enter a valid phone number (at least 7 digits)');
                      return;
                    }
                    setCurrentStep(4);
                  }}
                  disabled={phoneNumber.replace(/\D/g, '').length < 7}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  Next: Admin Name & Password
                </Button>
              </div>
            )}

            {/* STEP 4: FULL NAME & CREATE PASSWORD */}
            {currentStep === 4 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Admin Profile & Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your practitioner name and secure password for logging back in anytime.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={newAccountPassword}
                      onChange={(e) => setNewAccountPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    You can use this password to sign back in quickly whenever you log out.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!fullName.trim()) {
                      toast.error('Please enter your full name');
                      return;
                    }
                    if (newAccountPassword && newAccountPassword.length < 6) {
                      toast.error('Password must be at least 6 characters');
                      return;
                    }
                    setCurrentStep(5);
                  }}
                  disabled={!fullName.trim()}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  Next: Profile Picture
                </Button>
              </div>
            )}

            {/* STEP 5: PROFILE PICTURE */}
            {currentStep === 5 && (
              <div className="space-y-4 text-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Add a profile photo (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload an avatar or snap a quick webcam photo for your pharmacy badge.
                  </p>
                </div>

                {/* Avatar Display */}
                <div className="flex justify-center my-3">
                  <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 overflow-hidden shadow-inner">
                    {profilePicture ? (
                      <img 
                        src={profilePicture} 
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    )}

                    {profilePicture && (
                      <button
                        type="button"
                        onClick={() => setProfilePicture('')}
                        className="absolute bottom-1 right-1 p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Camera View */}
                {isCameraActive && (
                  <div className="space-y-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-44 object-cover rounded-lg bg-black"
                    />
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button 
                        type="button" 
                        onClick={handleCapturePhoto} 
                        className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1.5" /> Capture Photo
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={stopCamera} 
                        className="h-9 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!isCameraActive && (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                )}

                {/* Final Enter Workspace Button */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={isSubmitting}
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating Workspace...
                      </span>
                    ) : (
                      'Complete & Enter Workspace'
                    )}
                  </Button>

                  {!profilePicture && (
                    <button
                      type="button"
                      onClick={handleCompleteOnboarding}
                      disabled={isSubmitting}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors block w-full py-1"
                    >
                      Skip photo & enter workspace
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Privacy Link */}
        <div className="mt-5 pt-3 text-center border-t border-slate-100 dark:border-slate-800">
          <a
            href="/privacy"
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Privacy Policy & Data Deletion
          </a>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* SOCIAL ACCOUNT PROMPT MODAL (GOOGLE & FACEBOOK)      */}
      {/* ---------------------------------------------------- */}
      {activeSocialProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {activeSocialProvider === 'google' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.43 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.99 0 12s.45 3.84 1.24 5.41l4.04-3.13z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.57 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  Sign in with {activeSocialProvider}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSocialProvider(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your {activeSocialProvider === 'google' ? 'Google' : 'Facebook'} account email to sign in or register:
            </p>

            <form onSubmit={handleSocialFormSubmit} className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  autoFocus
                  placeholder={activeSocialProvider === 'google' ? 'doctor@gmail.com' : 'user@example.com'}
                  value={customSocialEmail}
                  onChange={(e) => setCustomSocialEmail(e.target.value)}
                  className="h-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Your Full Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customSocialName}
                  onChange={(e) => setCustomSocialName(e.target.value)}
                  className="h-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 h-10 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                >
                  {isSubmitting ? 'Verifying...' : 'Continue'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setActiveSocialProvider(null);
                    setCustomSocialEmail('');
                    setCustomSocialName('');
                  }} 
                  className="h-10 text-xs rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
