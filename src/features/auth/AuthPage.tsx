import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  Upload, 
  Search, 
  Loader2, 
  Check,
  Building2,
  Phone,
  User as UserIcon,
  Lock,
  Mail,
  AlertCircle
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button, Input } from '../../components/ui';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { COUNTRIES, getDialCodeForNationality } from './countries';
import { 
  findUserByEmail, 
  findUserByUsername,
  registerWorkspaceUser, 
  authenticateWithPassword 
} from './authService';
import { validateEmail } from '../../lib/emailValidation';

type AuthMode = 'signin' | 'signup' | 'onboarding';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuthStore();

  // Mode: Sign In, Sign Up, or Onboarding
  const [mode, setMode] = useState<AuthMode>(() => 
    location.pathname === '/signup' ? 'signup' : 'signin'
  );

  // Sync mode with URL if user navigates back/forward
  useEffect(() => {
    if (mode !== 'onboarding') {
      if (location.pathname === '/signup') {
        setMode('signup');
      } else if (location.pathname === '/login' || location.pathname === '/auth') {
        setMode('signin');
      }
    }
  }, [location.pathname]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && user.registrationCompleted !== false) {
      navigate('/');
    }
  }, [user, navigate]);

  // -------------------------------------------------------------
  // SIGN IN STATE
  // -------------------------------------------------------------
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // -------------------------------------------------------------
  // SIGN UP STATE
  // -------------------------------------------------------------
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupErrors, setSignupErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  // -------------------------------------------------------------
  // 5-STEP ONBOARDING STATE
  // -------------------------------------------------------------
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

  // Global loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // -------------------------------------------------------------
  // SIGN IN SUBMISSION
  // -------------------------------------------------------------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setLoginError('Please enter your username or email.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { user: authUser, organization: org } = await authenticateWithPassword(identifier, loginPassword);
      setUser(authUser, authUser.id, org);
      try {
        localStorage.removeItem('meditrack_has_logged_out');
      } catch (_) {}
      toast.success(`Welcome back, ${authUser.name || authUser.username}!`);
      navigate('/');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid username/email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SIGN UP SUBMISSION & VALIDATION
  // -------------------------------------------------------------
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof signupErrors = {};

    const cleanUsername = signupUsername.trim().toLowerCase();
    const cleanEmail = signupEmail.trim().toLowerCase();

    // Required fields check
    if (!cleanUsername) {
      newErrors.username = 'Username is required.';
    } else if (cleanUsername.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens.';
    }

    if (!cleanEmail) {
      newErrors.email = 'Email address is required.';
    } else {
      const emailValidation = validateEmail(cleanEmail);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error || 'Please enter a valid email address.';
      }
    }

    if (!signupPassword) {
      newErrors.password = 'Password is required.';
    } else if (signupPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!signupConfirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (signupPassword !== signupConfirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setSignupErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSignupErrors({});

    try {
      // Check username uniqueness
      const existingUserByUsername = await findUserByUsername(cleanUsername);
      if (existingUserByUsername) {
        setSignupErrors({ username: 'Username already exists.' });
        setIsSubmitting(false);
        return;
      }

      // Check email uniqueness
      const existingUserByEmail = await findUserByEmail(cleanEmail);
      if (existingUserByEmail) {
        setSignupErrors({ email: 'An account with this email already exists.' });
        setIsSubmitting(false);
        return;
      }

      // Validation passed -> proceed directly to Onboarding Step 1
      setIsSubmitting(false);
      setMode('onboarding');
      setCurrentStep(1);
    } catch (err: any) {
      setSignupErrors({ form: err.message || 'Unable to process sign up. Please try again.' });
      setIsSubmitting(false);
    }
  };

  // Dial code resolved from nationality
  const dialCode = getDialCodeForNationality(selectedNationality);

  // -------------------------------------------------------------
  // ONBOARDING STEP VALIDATION & NAVIGATION
  // -------------------------------------------------------------
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedNationality) {
        toast.error('Please select your nationality.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!organizationName.trim()) {
        toast.error('Pharmacy or Organization name is required.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const cleanDigits = phoneNumber.replace(/\D/g, '');
      if (cleanDigits.length < 7) {
        toast.error('Please enter a valid phone number (at least 7 digits).');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!fullName.trim()) {
        toast.error('Full Name is required.');
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      handleCompleteOnboarding();
    }
  };

  // -------------------------------------------------------------
  // COMPLETE REGISTRATION AND ENTER WORKSPACE
  // -------------------------------------------------------------
  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhone = `${dialCode} ${cleanPhone}`.trim();

      const { user: createdUser, organization: createdOrg } = await registerWorkspaceUser({
        username: signupUsername.trim().toLowerCase(),
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        nationality: selectedNationality,
        countryCode: dialCode,
        organizationName: organizationName.trim(),
        phone: fullPhone,
        fullName: fullName.trim(),
        avatarUrl: profilePicture,
        authProvider: 'password'
      });

      setUser(createdUser, createdUser.id, createdOrg);
      try {
        localStorage.removeItem('meditrack_has_logged_out');
      } catch (_) {}
      toast.success(`Registration complete! Welcome to ${createdOrg.name}`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered countries for Step 1
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
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            {mode === 'signin' && 'Sign in to your pharmacy workspace'}
            {mode === 'signup' && 'Create your pharmacy workspace account'}
            {mode === 'onboarding' && 'Complete your pharmacy setup'}
          </p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 1. SIGN IN SCREEN                                    */}
        {/* ---------------------------------------------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 text-left">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter username or email"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  className="h-11 pl-10 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !loginIdentifier.trim() || !loginPassword}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setLoginError('');
                  setMode('signup');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Don't have an account? <span className="font-semibold text-primary-600 dark:text-primary-400 underline">Sign Up</span>
              </button>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* 2. SIGN UP SCREEN                                    */}
        {/* ---------------------------------------------------- */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-left">
            {signupErrors.form && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{signupErrors.form}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. alexpharm"
                  value={signupUsername}
                  onChange={(e) => {
                    setSignupUsername(e.target.value);
                    if (signupErrors.username) {
                      setSignupErrors(prev => ({ ...prev, username: undefined }));
                    }
                  }}
                  className={`h-11 pl-10 text-sm bg-white dark:bg-slate-950 rounded-xl ${
                    signupErrors.username 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {signupErrors.username && (
                <p className="text-xs text-red-500 mt-0.5 font-medium">{signupErrors.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  required
                  placeholder="doctor@pharmacy.com"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    if (signupErrors.email) {
                      setSignupErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`h-11 pl-10 text-sm bg-white dark:bg-slate-950 rounded-xl ${
                    signupErrors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {signupErrors.email && (
                <p className="text-xs text-red-500 mt-0.5 font-medium">{signupErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value);
                    if (signupErrors.password) {
                      setSignupErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`h-11 pl-10 text-sm bg-white dark:bg-slate-950 rounded-xl ${
                    signupErrors.password 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {signupErrors.password && (
                <p className="text-xs text-red-500 mt-0.5 font-medium">{signupErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={signupConfirmPassword}
                  onChange={(e) => {
                    setSignupConfirmPassword(e.target.value);
                    if (signupErrors.confirmPassword) {
                      setSignupErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  className={`h-11 pl-10 text-sm bg-white dark:bg-slate-950 rounded-xl ${
                    signupErrors.confirmPassword 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {signupErrors.confirmPassword && (
                <p className="text-xs text-red-500 mt-0.5 font-medium">{signupErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Validating...
                </span>
              ) : (
                'Sign Up'
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setSignupErrors({});
                  setMode('signin');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Already have an account? <span className="font-semibold text-primary-600 dark:text-primary-400 underline">Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* ---------------------------------------------------- */}
        {/* 3. AFTER SIGN UP — 5-STEP ONBOARDING FLOW           */}
        {/* ---------------------------------------------------- */}
        {mode === 'onboarding' && (
          <div className="space-y-5">
            {/* Step Navigation Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep((prev) => (prev - 1) as any);
                  } else {
                    setMode('signup');
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{currentStep === 1 ? 'Back to Sign Up' : 'Back'}</span>
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
                    Nationality
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select your nationality to configure country-specific settings.
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

            {/* STEP 2: PHARMACY / ORGANIZATION */}
            {currentStep === 2 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Pharmacy / Organization
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter the official name of your pharmacy or organization.
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

            {/* STEP 3: PHONE NUMBER */}
            {currentStep === 3 && (
              <div className="space-y-4 text-left">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Phone Number
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Country calling code <strong className="text-primary-600 dark:text-primary-400">{dialCode}</strong> is automatically assigned from your nationality ({selectedNationality}).
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
                    Full Name
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter your official full name as the pharmacy owner/practitioner.
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
                    Profile Picture
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload an avatar or take a photo using your camera. You can also skip this step.
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
                      Upload Picture
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStartCamera}
                      className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Picture
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
    </div>
  );
}
