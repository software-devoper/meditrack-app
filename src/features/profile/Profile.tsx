import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, updateDoc, collection, getDocs, writeBatch, deleteDoc, query, where } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { useAuthStore } from "../../store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "../../components/ui";
import { UserCircle, Lock, Mail, ShieldCheck, User, AlertTriangle, Trash2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAlertModal } from "../../context/AlertModalContext";

// Schemas for our forms
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username too long"),
  contactEmail: z.string().email("Invalid email address").or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function Profile() {
  const { user, setUser } = useAuthStore();
  const { confirm, alert: showAlert } = useAlertModal();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Setup Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
      contactEmail: user?.contactEmail || "",
    },
  });

  // Setup Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onUpdateProfile = async (data: ProfileFormValues) => {
    if (!user?.id || !db) return;
    setIsUpdatingProfile(true);
    try {
      // Check username uniqueness if changed
      if ((data.username || '').toLowerCase() !== (user?.username || '').toLowerCase()) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", (data.username || '').toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          throw new Error("Username is already taken by another user");
        }
      }

      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        name: data.name,
        username: data.username.toLowerCase(),
        contactEmail: data.contactEmail,
      });

      // Update local state
      setUser({ ...user, name: data.name, username: data.username.toLowerCase(), contactEmail: data.contactEmail });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onUpdatePassword = async (data: PasswordFormValues) => {
    if (!auth?.currentUser || !user?.internalAuthEmail) return;
    setIsUpdatingPassword(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.internalAuthEmail, data.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, data.newPassword);
      toast.success("Password updated successfully");
      resetPasswordForm();
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error("Invalid current password");
      } else if (error.code === 'auth/requires-recent-login') {
        await showAlert({
          title: "Security Verification Required",
          message: "For your protection, changing sensitive account settings (like your password) requires a recent login session.",
          problem: "Your current security session has expired for sensitive operations.",
          detail: "Please log out and log back in immediately to refresh your credentials, then try changing your password again.",
          variant: "warning",
          eyebrow: "SECURITY PROTOCOL",
          confirmText: "I Understand"
        });
      } else {
        toast.error(error.message || "Failed to update password");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!db) return;
    setIsResetting(true);
    try {
      const collectionsToReset = ['products', 'purchases', 'sales', 'customers', 'doctors', 'stockLedger'];
      for (const colName of collectionsToReset) {
        const snapshot = await getDocs(collection(db, colName));
        if (snapshot.empty) continue;

        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 400);
          chunk.forEach(docSnap => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      }

      // Reset billing invoice counter back to 1 (HCP-1)
      const counterRef = doc(db, 'metadata', 'salesCounter');
      await deleteDoc(counterRef).catch(() => {});

      toast.success("Factory reset completed successfully. All data and invoice counters have been reset.");
    } catch (error: any) {
      console.error("Factory reset error:", error);
      toast.error(error.message || "Failed to perform factory reset");
    } finally {
      setIsResetting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary-600/10 p-3 rounded-full text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
          <UserCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Account Profile</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your personal information and security settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  {...registerProfile("username")}
                  placeholder="Choose a username"
                />
                {profileErrors.username ? (
                  <p className="text-sm text-red-500 dark:text-red-400">{profileErrors.username.message}</p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">You can change your username for login.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Workspace & Role</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border text-sm font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{user.organizationName || 'MediTrack Cloud Pharmacy'}</span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300">
                      {user.plan || 'growth'} Plan
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
                    <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{user.role}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">ID: {user.tenantId || 'tenant_apex'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input {...registerProfile("name")} placeholder="Your full name" />
                {profileErrors.name && (
                  <p className="text-sm text-red-500 dark:text-red-400">{profileErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Contact Email
                </label>
                <Input
                  type="email"
                  {...registerProfile("contactEmail")}
                  placeholder="name@example.com (Optional)"
                />
                {profileErrors.contactEmail && (
                  <p className="text-sm text-red-500 dark:text-red-400">{profileErrors.contactEmail.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isUpdatingProfile} className="w-full">
                {isUpdatingProfile ? "Saving..." : "Save Profile Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security / Change Password Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit(onUpdatePassword)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    {...registerPassword("currentPassword")}
                    placeholder="Verify your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-500 dark:text-red-400">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    {...registerPassword("newPassword")}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-500 dark:text-red-400">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    {...registerPassword("confirmPassword")}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-500 dark:text-red-400">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="pt-2">
                <Button variant="default" type="submit" disabled={isUpdatingPassword} className="w-full">
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Factory Reset / Danger Zone Card */}
        <Card className="shadow-sm border-red-200 dark:border-red-900/50 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone - Factory Reset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Permanently clear all application data including products, purchases, sales, patients, and stock ledger records. This action is irreversible.
            </p>

            <Button 
              variant="destructive" 
              disabled={isResetting}
              onClick={async () => {
                const isConfirmed = await confirm({
                  title: "Factory Reset Application?",
                  message: "Are you absolutely sure? All inventory products, sales bills, patient records, doctor rosters, and purchase logs will be permanently deleted.",
                  confirmText: isResetting ? "Resetting Data..." : "Yes, Erase All Data",
                  cancelText: "Cancel & Abort",
                  variant: "danger",
                  eyebrow: "CRITICAL SYSTEM PURGE",
                  detail: "IRREVERSIBLE ACTION • INVOICE SEQUENCES WILL BE RE-INITIALIZED TO HCP-1"
                });

                if (isConfirmed) {
                  await handleFactoryReset();
                }
              }}
              className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4" />
              {isResetting ? "Resetting Data..." : "Factory Reset Application"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
