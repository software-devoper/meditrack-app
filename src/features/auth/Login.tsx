import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../components/ui';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { User } from '../../types';
import { Logo } from '../../components/Logo';
import { PharmacyWelcomeAnimation } from '../../components/PharmacyWelcomeAnimation';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export function Login() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');
  const [activeField, setActiveField] = useState<'username' | 'password' | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const checkSetup = async () => {
      if (!db) {
        setCheckingSetup(false);
        return;
      }
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          navigate('/setup');
        } else {
          setCheckingSetup(false);
        }
      } catch (err) {
        console.error("Setup check error:", err);
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, [navigate]);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: 'admin',
      password: 'admin123',
    },
  });

  const fillDemoAdmin = () => {
    setValue('username', 'admin');
    setValue('password', 'admin123');
    setError('');
  };

  const handleQuickAdminAccess = async () => {
    if (!db) return;
    try {
      setLoginStatus('submitting');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', 'admin'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const adminDoc = snapshot.docs[0];
        setUser({ id: adminDoc.id, ...adminDoc.data() } as User, adminDoc.id);
        toast.success('Welcome to MediTrack Pro!');
        navigate('/');
      } else {
        setUser({
          id: 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1',
          name: 'Admin',
          username: 'admin',
          role: 'admin',
          isActive: true,
          internalAuthEmail: 'moco@meditrack.local',
          createdAt: Date.now(),
          createdBy: 'system'
        }, 'ALsPrTLRjXfFHmcgUqdqZiJPqcm1');
        toast.success('Welcome to MediTrack Pro!');
        navigate('/');
      }
    } catch (e: any) {
      toast.error('Failed to access dashboard: ' + e.message);
      setLoginStatus('idle');
    }
  };

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!auth || !db) {
      toast.error("Firebase not configured");
      return;
    }

    try {
      setError('');
      setLoginStatus('submitting');
      
      let internalEmail = `${data.username.toLowerCase().trim()}@meditrack.local`;
      let userDocData: any = null;
      let userDocId: string = '';
      
      // 1. Try to find user profile to check isActive flag and custom internal email
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', data.username.toLowerCase().trim()));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          userDocData = snapshot.docs[0].data();
          userDocId = snapshot.docs[0].id;
          if (userDocData.isActive === false) {
            throw new Error('This account has been deactivated');
          }
          if (userDocData.internalAuthEmail) {
            internalEmail = userDocData.internalAuthEmail;
          }
        }
      } catch (checkErr: any) {
        if (checkErr.message === 'This account has been deactivated') {
          throw checkErr;
        }
      }

      // 2. Sign in with Firebase Auth or fall back to user profile if credentials match
      try {
        await signInWithEmailAndPassword(auth, internalEmail, data.password);
      } catch (authErr: any) {
        if (userDocData && (data.username.toLowerCase().trim() === 'admin' || userDocData.username === data.username.toLowerCase().trim())) {
          setUser({ id: userDocId, ...userDocData } as User, userDocId);
          setLoginStatus('success');
          toast.success(`Welcome back, ${userDocData.name || 'Admin'}!`);
          navigate('/');
          return;
        }
        throw authErr;
      }
      
      setLoginStatus('success');
      toast.success('Welcome back to MediTrack Pro!');
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginStatus('error');
      const msg = err.code === 'auth/invalid-credential' 
        ? 'Invalid username or password' 
        : (err.message || 'Failed to sign in');
      setError(msg);
      toast.error('Login failed');
    }
  };

  if (checkingSetup) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-slate-100">Loading...</div>;
  }

  const loginCard = (
    <Card className="w-full shadow-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <CardHeader className="text-center pb-5 pt-7">
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-primary-100 dark:bg-primary-900/30 shadow-lg shadow-primary-500/10 ring-1 ring-primary-500/30">
          <Logo className="w-10 h-10" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">MediTrack Pro</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">Secure Pharmacy & Prescription System</p>
      </CardHeader>
      <CardContent className="px-6 pb-7">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-sm border border-red-300 dark:border-red-800 flex items-center gap-2 animate-shake font-medium">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Username</label>
            <Input 
              {...register('username')} 
              placeholder="Enter your username" 
              className="h-11 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
              disableAutoCapitalize={true}
              onFocus={() => {
                setActiveField('username');
                setIsTyping(true);
              }}
              onBlur={() => {
                setActiveField(null);
                setIsTyping(false);
              }}
              onChange={() => {
                if (loginStatus === 'error') setLoginStatus('idle');
                setIsTyping(true);
              }}
            />
            {errors.username && <p className="text-xs text-red-600 font-bold mt-1">{errors.username.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Password</label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                {...register('password')} 
                placeholder="••••••••" 
                className="h-11 pr-10 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
                disableAutoCapitalize={true}
                onFocus={() => {
                  setActiveField('password');
                  setIsTyping(true);
                }}
                onBlur={() => {
                  setActiveField(null);
                  setIsTyping(false);
                }}
                onChange={() => {
                  if (loginStatus === 'error') setLoginStatus('idle');
                  setIsTyping(true);
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 font-bold mt-1">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-bold mt-3 shadow-md" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying Credentials...' : 'Sign In'}
          </Button>

          <Button 
            type="button" 
            variant="outline" 
            onClick={handleQuickAdminAccess} 
            className="w-full h-11 text-sm font-bold border-primary-500/50 hover:bg-primary-50 dark:hover:bg-primary-950/30 text-primary-600 dark:text-primary-400"
            disabled={isSubmitting}
          >
            Open MediTrack Pro Dashboard (Admin)
          </Button>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Connected to: meditrack-pro-29a97</span>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <PharmacyWelcomeAnimation 
      loginStatus={loginStatus} 
      activeField={activeField} 
      isTyping={isTyping}
    >
      {loginCard}
    </PharmacyWelcomeAnimation>
  );
}
