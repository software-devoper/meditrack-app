import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Mail, 
  Camera, 
  Upload, 
  Search, 
  X, 
  Loader2, 
  Check,
  Building2,
  Phone,
  User as UserIcon
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button, Input } from '../../components/ui';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { COUNTRIES, CountryInfo, getDialCodeForNationality } from './countries';
import { 
  findUserByEmail, 
  findOrganizationById, 
  registerWorkspaceUser, 
  sendEmailCode, 
  verifyCode
} from './authService';
import { switchWorkspace } from '../../lib/firebase-mock';
import { validateEmail } from '../../lib/emailValidation';

type ScreenState = 
  | 'initial'
  | 'more-methods'
  | 'email-input'
  | 'email-verify'
  | 'onboarding';

export function AuthPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  // Screen routing state
  const [screen, setScreen] = useState<ScreenState>('initial');
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  // Email authentication state
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Social account modal state (Google & Facebook authentication)
  const [activeSocialProvider, setActiveSocialProvider] = useState<'google' | 'facebook' | null>(null);
  const [customSocialEmail, setCustomSocialEmail] = useState('');
  const [customSocialName, setCustomSocialName] = useState('');

  // Unified 5-Step Onboarding state
  const [onboardingProvider, setOnboardingProvider] = useState<'google' | 'facebook' | 'email'>('google');
  const [onboardingEmail, setOnboardingEmail] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Nationality
  const [selectedNationality, setSelectedNationality] = useState<string>('Indian');
  const [nationalitySearch, setNationalitySearch] = useState('');

  // Step 2: Pharmacy / Organization Name
  const [organizationName, setOrganizationName] = useState('');

  // Step 3: Phone Number (country code automatically resolved from Step 1)
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 4: Full Name
  const [fullName, setFullName] = useState('');

  // Step 5: Profile Picture
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global submission loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check login/logout status on mount
  useEffect(() => {
    try {
      const loggedOut = localStorage.getItem('meditrack_has_logged_out');
      if (loggedOut === 'true') {
        setHasLoggedOut(true);
      }
    } catch (_) {}
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && user.registrationCompleted !== false) {
      navigate('/');
    }
  }, [user, navigate]);

  // Resend code countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clean up camera stream on unmount
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
        toast.info('Camera is not supported on this browser. Please upload an image file.');
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
      console.warn('Camera access denied or unavailable', err);
      toast.error('Camera access failed. Please upload a photo instead.');
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
      toast.success('Photo captured successfully');
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
        toast.success('Profile picture updated');
      }
    };
    reader.readAsDataURL(file);
  };

  // Trigger Google / Facebook authentication
  const handleSocialClick = (provider: 'google' | 'facebook') => {
    setActiveSocialProvider(provider);
    setCustomSocialEmail('');
    setCustomSocialName('');
  };

  // Complete Google / Facebook authentication
  const handleSocialFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customSocialEmail.trim().toLowerCase();
    const validation = validateEmail(cleanEmail);
    if (!validation.isValid) {
      toast.error(validation.error || 'Please enter a valid email address');
      return;
    }

    const provider = activeSocialProvider || 'google';
    setActiveSocialProvider(null);
    setIsSubmitting(true);

    try {
      const existingUser = await findUserByEmail(cleanEmail);
      if (existingUser && existingUser.registrationCompleted !== false) {
        // EXISTING USER -> Load account & enter existing workspace directly
        const org = await findOrganizationById(existingUser.tenantId);
        try {
          if (org) switchWorkspace(org.id);
        } catch (_) {}
        setUser(existingUser, existingUser.id, org);
        localStorage.removeItem('meditrack_has_logged_out');
        toast.success(`Welcome back, ${existingUser.name || 'User'}!`);
        navigate('/');
      } else {
        // NEW USER -> Begin 5-step onboarding flow
        setOnboardingProvider(provider);
        setOnboardingEmail(cleanEmail);
        if (customSocialName.trim()) {
          setFullName(customSocialName.trim());
        }
        setCurrentStep(1);
        setScreen('onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request 6-digit email OTP
  const handleGetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const validation = validateEmail(cleanEmail);
    if (!validation.isValid) {
      toast.error(validation.error || 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      sendEmailCode(cleanEmail);
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

  // Verify 6-digit email OTP
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      toast.error('Please enter the complete 6-digit verification code');
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

      // Check whether this email belongs to an existing registered user
      const existingUser = await findUserByEmail(email);

      if (existingUser && existingUser.registrationCompleted !== false) {
        // EXISTING USER -> Enter workspace directly
        const org = await findOrganizationById(existingUser.tenantId);
        try {
          if (org) switchWorkspace(org.id);
        } catch (_) {}
        setUser(existingUser, existingUser.id, org);
        localStorage.removeItem('meditrack_has_logged_out');
        toast.success(`Welcome back, ${existingUser.name || 'User'}!`);
        navigate('/');
      } else {
        // NEW USER -> Begin 5-step onboarding flow
        setOnboardingProvider('email');
        setOnboardingEmail(email.trim().toLowerCase());
        setCurrentStep(1);
        setScreen('onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Automatically determine country calling code based on selected nationality in Step 1
  const dialCode = getDialCodeForNationality(selectedNationality);

  // Advance through 5 onboarding steps with validation
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedNationality) {
        toast.error('Please select your nationality');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!organizationName.trim()) {
        toast.error('Please enter your Pharmacy or Organization name');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const cleanDigits = phoneNumber.replace(/\D/g, '');
      if (cleanDigits.length < 7) {
        toast.error('Please enter a valid phone number (at least 7 digits)');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!fullName.trim()) {
        toast.error('Please enter your full name');
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      handleCompleteOnboarding();
    }
  };

  // Complete registration and enter workspace automatically
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
      toast.success(`Registration complete! Welcome to ${createdOrg.name}`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete registration. Please try again.');
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
              MediTrack Pro
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            Manage your pharmacy, organization, medicines, and daily operations from one simple workspace.
          </p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* PART 1 — INITIAL AUTHENTICATION SCREEN               */}
        {/* ---------------------------------------------------- */}
        {screen === 'initial' && (
          <div className="space-y-3.5">
            {/* Continue with Google */}
            <button
              type="button"
              onClick={() => handleSocialClick('google')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.43 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.99 0 12s.45 3.84 1.24 5.41l4.04-3.13z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.57 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Continue with Facebook */}
            <button
              type="button"
              onClick={() => handleSocialClick('facebook')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>

            {/* More login methods (ONLY visible for returning/logged-out users) */}
            {hasLoggedOut && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setScreen('more-methods')}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>More login methods</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* PART 2 & 7 — MORE LOGIN METHODS (SECONDARY SCREEN)   */}
        {/* ---------------------------------------------------- */}
        {screen === 'more-methods' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen('initial')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center pb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                More login methods
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose an alternative authentication method.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScreen('email-input')}
              className="w-full h-11 px-4 flex items-center justify-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>Continue with Email</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* PART 4 — EMAIL AUTHENTICATION: ENTER EMAIL           */}
        {/* ---------------------------------------------------- */}
        {screen === 'email-input' && (
          <form onSubmit={handleGetCode} className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen(hasLoggedOut ? 'more-methods' : 'initial')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center pb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Please enter your email
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                We'll send a 6-digit verification code to sign in or register your workspace.
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
              className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
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
        {/* PART 5 — EMAIL VERIFICATION: VERIFY 6-DIGIT CODE     */}
        {/* ---------------------------------------------------- */}
        {screen === 'email-verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <button
              type="button"
              onClick={() => setScreen('email-input')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email</span>
            </button>

            <div className="text-center pb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Enter the 6-digit code
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sent to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>
              </p>
            </div>

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
                className="text-xs font-medium text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* PART 6 — 5-STEP ONBOARDING FLOW                      */}
        {/* ---------------------------------------------------- */}
        {screen === 'onboarding' && (
          <div className="space-y-5">
            {/* Step Navigation Header */}
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
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
                    What is your nationality?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select your nationality to configure your country calling code.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search nationality or country..."
                      value={nationalitySearch}
                      onChange={(e) => setNationalitySearch(e.target.value)}
                      className="h-10 pl-10 text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                    {filteredCountries.map((c) => {
                      const isSelected = selectedNationality.toLowerCase() === c.nationality.toLowerCase();
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => setSelectedNationality(c.nationality)}
                          className={`w-full px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{c.flag}</span>
                            <span>{c.nationality} ({c.name})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 text-[11px]">{c.dialCode}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!selectedNationality}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    This name will appear on your workspace, patient invoices, and sales receipts.
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
                      placeholder="e.g. CityCare Pharmacy"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!organizationName.trim()}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Country code <strong className="text-primary-600 dark:text-primary-400">{dialCode}</strong> is automatically assigned from your nationality ({selectedNationality}).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                    <span className="inline-flex items-center px-3.5 bg-slate-100 dark:bg-slate-800/80 border-r border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 select-none">
                      {dialCode}
                    </span>
                    <Input
                      type="tel"
                      required
                      autoFocus
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="h-11 border-0 focus-visible:ring-0 text-sm bg-transparent rounded-none"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={phoneNumber.replace(/\D/g, '').length < 7}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your official practitioner or pharmacy owner name.
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
                      placeholder="e.g. Dr. Alex Morgan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!fullName.trim()}
                  className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {/* STEP 5: PROFILE PICTURE */}
            {currentStep === 5 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Add your profile picture
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload an avatar or take a photo. You can also skip this step.
                  </p>
                </div>

                {/* Circular Preview */}
                <div className="flex flex-col items-center justify-center py-3">
                  <div className="w-24 h-24 rounded-full border-4 border-primary-100 dark:border-primary-900/60 bg-primary-50 dark:bg-primary-950/40 overflow-hidden shadow-md flex items-center justify-center font-bold text-3xl text-primary-600 dark:text-primary-300 mb-3">
                    {profilePicture ? (
                      <img 
                        src={profilePicture} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span>{fullName ? fullName.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Photo
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStartCamera}
                      className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Photo
                    </Button>
                  </div>
                </div>

                {/* Live Webcam Viewfinder */}
                {isCameraActive && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full max-w-xs mx-auto h-40 object-cover rounded-lg bg-black"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        type="button" 
                        onClick={handleCapturePhoto} 
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1" /> Capture & Save
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={stopCamera} 
                        className="h-8 text-xs cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={isSubmitting}
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Entering Workspace...
                      </span>
                    ) : (
                      <>
                        <span>Enter Workspace</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>

                  {!profilePicture && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleCompleteOnboarding}
                      className="w-full py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-center cursor-pointer"
                    >
                      Skip profile picture for now
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* ---------------------------------------------------- */}
      {/* SOCIAL ACCOUNT MODAL (GOOGLE & FACEBOOK AUTHENTICATION) */}
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
                  Continue with {activeSocialProvider}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSocialProvider(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sign in with your {activeSocialProvider === 'google' ? 'Google' : 'Facebook'} account:
            </p>

            <form onSubmit={handleSocialFormSubmit} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  autoFocus
                  placeholder={activeSocialProvider === 'google' ? 'doctor@gmail.com' : 'user@facebook.com'}
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
                  placeholder="e.g. Dr. Alex Morgan"
                  value={customSocialName}
                  onChange={(e) => setCustomSocialName(e.target.value)}
                  className="h-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 h-10 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm cursor-pointer"
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
                  className="h-10 text-xs rounded-xl cursor-pointer"
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
