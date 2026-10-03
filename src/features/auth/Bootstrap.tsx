import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, getDocs, limit, query, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Skeleton } from '../../components/ui';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores allowed'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export function Bootstrap() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setNeedsBootstrap(true);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error("Error checking setup:", error);
        toast.error("Failed to connect to database");
      } finally {
        setLoading(false);
      }
    };
    checkSetup();
  }, [navigate]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!auth || !db) return;
    try {
      const internalEmail = `${data.username}@meditrack.local`;
      const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, data.password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: data.name,
        username: data.username,
        internalAuthEmail: internalEmail,
        role: 'admin',
        isActive: true,
        createdAt: Date.now(),
        createdBy: 'system',
      });
      
      toast.success('Admin account created! You can now log in.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create admin account');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
          <Skeleton className="w-12 h-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md mt-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!needsBootstrap) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-blue-600 bg-white dark:bg-slate-850">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Initial Setup</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">Create the first Admin account to initialize MediTrack Pro.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Full Name</label>
              <Input {...register('name')} placeholder="e.g. System Admin" className="bg-slate-50 dark:bg-slate-800" />
              {errors.name && <p className="text-sm text-red-600 font-bold">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Username (lowercase)</label>
              <Input {...register('username')} placeholder="admin" disableAutoCapitalize={true} className="bg-slate-50 dark:bg-slate-800" />
              {errors.username && <p className="text-sm text-red-600 font-bold">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Password</label>
              <Input type="password" {...register('password')} placeholder="••••••••" disableAutoCapitalize={true} className="bg-slate-50 dark:bg-slate-800" />
              {errors.password && <p className="text-sm text-red-600 font-bold">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11 font-bold mt-2" disabled={isSubmitting}>
              {isSubmitting ? 'Initializing...' : 'Create Admin Account'}
              {!isSubmitting && <ShieldCheck className="ml-2 w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
