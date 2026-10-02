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
  Sparkles,
  RotateCcw
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
  verifyCode 
} from './authService';

type ScreenState = 
  | 'initial'
  | 'more-methods'
  | 'email-input'
  | 'email-verify'
  | 'onboarding';

interface SocialAccountOption {
  email: string;
  name: string;
  isExisting: boolean;
  avatar?: string;
  pharmacyName?: string;
}

export function AuthPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  // Screen routing
  const [screen, setScreen] = useState<ScreenState>('initial');
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  // Email authentication state
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Social account modal simulation
  const [activeSocialProvider, setActiveSocialProvider] = useState<'google' | 'facebook' | null>(null);
  const [customSocialEmail, setCustomSocialEmail] = useState('');
  const [customSocialName, setCustomSocialName] = useState('');
  const [isCustomSocialOpen, setIsCustomSocialOpen] = useState(false);

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

  // Step 4: Full Name
  const [fullName, setFullName] = useState('');

  // Step 5: Profile Picture
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    if (user && user.registrationCompleted !== false) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check if user has previously logged out
  useEffect(() => {
    const loggedOut = localStorage.getItem('meditrack_has_logged_out');
    if (loggedOut === 'true') {
      setHasLoggedOut(true);
    }
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Stop camera when unmounted or camera deactivated
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
        toast.info("Camera not supported on this browser. Please select an image file.");
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
      console.warn("Camera access denied or unavailable:", err);
      toast.info("Camera unavailable. You can upload a photo from your device.");
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

  // Google / Facebook sign-in trigger
  const handleSocialClick = (provider: 'google' | 'facebook') => {
    setActiveSocialProvider(provider);
    setIsCustomSocialOpen(false);
  };

  const handleSelectSocialAccount = async (account: SocialAccountOption) => {
    setActiveSocialProvider(null);
    setIsSubmitting(true);

    try {
      // Check if user is registered in system
      const existingUser = await findUserByEmail(account.email);
      
      if (existingUser && existingUser.registrationCompleted !== false) {
        // Registered User -> Go directly to existing workspace
        const org = await findOrganizationById(existingUser.tenantId);
        setUser(existingUser, existingUser.id, org);
        localStorage.removeItem('meditrack_has_logged_out');
        toast.success(`Welcome back, ${existingUser.name || 'Doctor'}!`);
        navigate('/');
      } else {
        // New User -> Begin Onboarding Flow
        setOnboardingProvider(activeSocialProvider || 'google');
        setOnboardingEmail(account.email);
        setFullName(account.name || '');
        if (account.avatar) setProfilePicture(account.avatar);
        if (account.pharmacyName) setOrganizationName(account.pharmacyName);
        setCurrentStep(1);
        setScreen('onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSocialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSocialEmail.trim() || !customSocialEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    handleSelectSocialAccount({
      email: customSocialEmail.trim(),
      name: customSocialName.trim() || customSocialEmail.split('@')[0],
      isExisting: false
    });
  };

  // Email authentication submission: Request 6-digit code
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
      toast.success(`Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email verification submission: Verify 6-digit code
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

      // Code is valid! Check if this email is already registered
      const existingUser = await findUserByEmail(email);

      if (existingUser && existingUser.registrationCompleted !== false) {
        // REGISTERED USER -> Take them directly to their previously registered workspace!
        const org = await findOrganizationById(existingUser.tenantId);
        setUser(existingUser, existingUser.id, org);
        localStorage.removeItem('meditrack_has_logged_out');
        toast.success(`Welcome back, ${existingUser.name || 'Doctor'}!`);
        navigate('/');
      } else {
        // NEW EMAIL -> Treat as new registration and start 5-step onboarding
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

  // Country calling code automatically determined by selected nationality
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
        avatarUrl: profilePicture
      });

      setUser(createdUser, createdUser.id, createdOrg);
      localStorage.removeItem('meditrack_has_logged_out');
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
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              MediTrack
            </span>
          </div>
          
          {screen === 'initial' && (
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
              Manage your pharmacy, organization, medicines, and daily operations from one simple workspace.
            </p>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* SCREEN 1: INITIAL AUTHENTICATION SCREEN              */}
        {/* ---------------------------------------------------- */}
        {screen === 'initial' && (
          <div className="space-y-3.5 pt-2">
            <button
              type="button"
              onClick={() => handleSocialClick('google')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              {/* Google G Logo */}
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
              {/* Facebook Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>

            {/* When user has logged out, offer "More login methods" */}
            {hasLoggedOut && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setScreen('more-methods')}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  More login methods
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 2: MORE LOGIN METHODS                         */}
        {/* ---------------------------------------------------- */}
        {screen === 'more-methods' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen('initial')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center pb-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                More login methods
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setScreen('email-input')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99]"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Continue with Email</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 3: EMAIL INPUT                                */}
        {/* ---------------------------------------------------- */}
        {screen === 'email-input' && (
          <form onSubmit={handleGetCode} className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen('more-methods')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center pb-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Please enter your email
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                We'll send a 6-digit verification code to this address.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <Input
                type="email"
                required
                autoFocus
                placeholder="name@pharmacy.com"
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Code...
                </span>
              ) : (
                'Get Code'
              )}
            </Button>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* SCREEN 4: EMAIL CODE VERIFICATION                    */}
        {/* ---------------------------------------------------- */}
        {screen === 'email-verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen('email-input')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center pb-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Enter the 6-digit code
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sent to <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
              </p>
            </div>

            {/* Quick Helper for immediate review/testing */}
            {sentCode && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                <span className="text-emerald-800 dark:text-emerald-300">
                  Verification Code: <strong className="font-mono tracking-widest">{sentCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setVerificationCode(sentCode)}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold text-[11px]"
                >
                  Use Code
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                6-digit verification code
              </label>
              <Input
                type="text"
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="h-11 text-center font-mono tracking-widest text-lg bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={isVerifying || verificationCode.trim().length !== 6}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </span>
              ) : (
                'Verify & Continue'
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
        {/* SCREEN 5: ONBOARDING PROCESS (5 CLEAN STEPS)         */}
        {/* ---------------------------------------------------- */}
        {screen === 'onboarding' && (
          <div className="space-y-5">
            {/* Header with Step Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep((currentStep - 1) as any);
                  } else {
                    setScreen('initial');
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                Step {currentStep} of 5
              </span>
            </div>

            {/* STEP 1: NATIONALITY */}
            {currentStep === 1 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    What is your nationality?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select your nationality to automatically set your regional country code and compliance.
                  </p>
                </div>

                {/* Country Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search nationality or country..."
                    value={nationalitySearch}
                    onChange={(e) => setNationalitySearch(e.target.value)}
                    className="h-9 pl-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>

                {/* Nationalities List */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50/50 dark:bg-slate-950/50">
                  {filteredCountries.map((c) => {
                    const isSelected = selectedNationality.toLowerCase() === c.nationality.toLowerCase();
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSelectedNationality(c.nationality)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left ${
                          isSelected
                            ? 'bg-primary-600 text-white font-semibold shadow-xs'
                            : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-base">{c.flag}</span>
                          <span className="truncate">{c.nationality}</span>
                          <span className={`text-[11px] ${isSelected ? 'text-primary-100' : 'text-slate-400'}`}>
                            ({c.name})
                          </span>
                        </div>
                        <span className={`font-mono text-[11px] font-semibold ${isSelected ? 'text-primary-100' : 'text-slate-400'}`}>
                          {c.dialCode}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedNationality}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  Next Step
                </Button>
              </div>
            )}

            {/* STEP 2: PHARMACY / ORGANIZATION NAME */}
            {currentStep === 2 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    What is your Pharmacy or Organization name?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    This will be the title of your pharmacy workspace and will appear on sales bills and invoices.
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
                      placeholder="e.g. Apex Care Pharmacy & Medicals"
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
                      toast.error('Please enter your Pharmacy or Organization name');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  disabled={!organizationName.trim()}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  Next Step
                </Button>
              </div>
            )}

            {/* STEP 3: PHONE NUMBER (AUTOMATIC COUNTRY CODE) */}
            {currentStep === 3 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    What is your phone number?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    The country code is automatically set to <span className="font-semibold">{dialCode}</span> based on your nationality ({selectedNationality}).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all overflow-hidden h-11">
                    <div className="h-full px-3.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 flex items-center justify-center font-mono font-semibold text-sm text-slate-800 dark:text-slate-200 shrink-0 select-none">
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
                  Next Step
                </Button>
              </div>
            )}

            {/* STEP 4: FULL NAME */}
            {currentStep === 4 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    What is your full name?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your name as the registered pharmacy owner or lead practitioner.
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
                      placeholder="e.g. Dr. Sarah Jenkins"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!fullName.trim()) {
                      toast.error('Please enter your full name');
                      return;
                    }
                    setCurrentStep(5);
                  }}
                  disabled={!fullName.trim()}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                >
                  Next Step
                </Button>
              </div>
            )}

            {/* STEP 5: PROFILE PICTURE */}
            {currentStep === 5 && (
              <div className="space-y-5 text-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Add your profile picture
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload an avatar or take a photo. You can also skip this step.
                  </p>
                </div>

                {/* Circular Profile Preview */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 p-1 flex items-center justify-center bg-slate-50 dark:bg-slate-800 overflow-hidden shadow-inner">
                    {profilePicture ? (
                      <img 
                        src={profilePicture} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover rounded-full" 
                      />
                    ) : (
                      <UserIcon className="w-10 h-10 text-slate-400" />
                    )}

                    {profilePicture && (
                      <button
                        type="button"
                        onClick={() => setProfilePicture('')}
                        title="Remove photo"
                        className="absolute inset-0 bg-black/40 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-full"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Camera Stream View if active */}
                {isCameraActive && (
                  <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full max-h-48 rounded-lg object-cover bg-black" 
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        onClick={handleCapturePhoto} 
                        className="flex-1 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Capture Photo
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

                {/* Final Next Step / Enter Workspace */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={isSubmitting}
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Entering Workspace...
                      </span>
                    ) : (
                      'Next Step'
                    )}
                  </Button>

                  {!profilePicture && (
                    <button
                      type="button"
                      onClick={handleCompleteOnboarding}
                      disabled={isSubmitting}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors block w-full py-1"
                    >
                      Skip for now
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
      {/* SOCIAL ACCOUNT SELECTION MODAL (GOOGLE & FACEBOOK)   */}
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
              Select an account to continue to MediTrack Pharmacy Workspace:
            </p>

            {/* Account List */}
            <div className="space-y-2">
              {(activeSocialProvider === 'google' ? [
                {
                  email: 'doctor.partner@gmail.com',
                  name: 'Dr. Gregory House',
                  isExisting: false,
                  pharmacyName: 'Apex Health & Pharmacy Cloud'
                },
                {
                  email: 'sarah.mitchell@apexrx.health',
                  name: 'Dr. Sarah Mitchell',
                  isExisting: true,
                  pharmacyName: 'Apex Health & Pharmacy Cloud'
                }
              ] : [
                {
                  email: 'david.miller@facebook.com',
                  name: 'David Miller',
                  isExisting: false,
                  pharmacyName: 'Miller Care Pharmacy'
                },
                {
                  email: 'marcus.v@metrocare.org',
                  name: 'Marcus Vance, PharmD',
                  isExisting: true,
                  pharmacyName: 'Metro Care Multi-Specialty Clinic'
                }
              ]).map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectSocialAccount(acc)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 transition-all flex items-center justify-between text-left"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {acc.email}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    acc.isExisting 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {acc.isExisting ? 'Existing Workspace' : 'New Account'}
                  </span>
                </button>
              ))}

              {/* Use custom account */}
              {!isCustomSocialOpen ? (
                <button
                  type="button"
                  onClick={() => setIsCustomSocialOpen(true)}
                  className="w-full py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                >
                  + Use another {activeSocialProvider} account
                </button>
              ) : (
                <form onSubmit={handleCustomSocialSubmit} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-left">
                  <Input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={customSocialEmail}
                    onChange={(e) => setCustomSocialEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Input
                    type="text"
                    placeholder="Your Full Name (optional)"
                    value={customSocialName}
                    onChange={(e) => setCustomSocialName(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" size="sm" className="flex-1 h-8 text-xs font-semibold">
                      Continue
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsCustomSocialOpen(false)} 
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
