import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Lock } from 'lucide-react';
import { Logo } from '../../components/Logo';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                MediTrack Pharmacy
              </h1>
              <p className="text-xs text-slate-500">Privacy Policy & Data Protection</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Overview */}
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Last Updated: <strong>October 1, 2026</strong>
          </p>
          <p>
            MediTrack Pharmacy ERP ("we", "our", or "us") respects your privacy and is committed to protecting the personal data of pharmacy professionals, staff, and account holders who access our workspace management platform.
          </p>
        </div>

        {/* Section 1 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            1. Information We Collect
          </h2>
          <ul className="list-disc pl-5 text-sm space-y-2 text-slate-600 dark:text-slate-300">
            <li>
              <strong>Account & Profile Information:</strong> When you register or sign in using Facebook Login, Google, or Email, we collect your name, email address, profile picture, pharmacy/organization name, nationality, and phone number.
            </li>
            <li>
              <strong>Operational Pharmacy Data:</strong> Inventory listings, sales records, customer prescriptions, and supplier details entered to manage your pharmacy workspace.
            </li>
            <li>
              <strong>Authentication Tokens:</strong> Secure OAuth tokens used strictly to authenticate your identity with Facebook or Google.
            </li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-600" />
            2. How We Use Your Data
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            We use collected data solely to:
          </p>
          <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600 dark:text-slate-300">
            <li>Authenticate and maintain your secure pharmacy workspace session.</li>
            <li>Print invoices, receipts, and order logs under your pharmacy's registered name.</li>
            <li>Notify you regarding inventory alerts and account verification codes.</li>
            <li>We do not sell, rent, or monetize your personal or pharmacy data to third-party advertisers.</li>
          </ul>
        </div>

        {/* Section 3 - Required by Meta */}
        <div id="data-deletion" className="space-y-3 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            3. User Data Deletion Instructions (Meta / Facebook)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            In accordance with Facebook Platform rules, users have the right to request the deletion of their personal data collected via Facebook Login. If you wish to delete your account or any data associated with Facebook Login, you can do so by following these steps:
          </p>
          <ol className="list-decimal pl-5 text-sm space-y-2 text-slate-600 dark:text-slate-300 mt-2">
            <li>
              Go to your Facebook Profile's <strong>Settings & Privacy</strong> &gt; <strong>Settings</strong>.
            </li>
            <li>
              Look for <strong>Apps and Websites</strong> where you will see all apps connected to your Facebook account.
            </li>
            <li>
              Search for <strong>MediTrack Pharmacy</strong> in the search bar.
            </li>
            <li>
              Click <strong>Remove</strong> to revoke access.
            </li>
            <li>
              To request full deletion of your user account and workspace data from our servers, send an email to <strong className="text-slate-900 dark:text-white">subhadipmondal0101@gmail.com</strong> with the subject <em>"Data Deletion Request"</em>. Your request will be fulfilled within 48 business hours.
            </li>
          </ol>
        </div>

        {/* Section 4 */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-600" />
            4. Contact Us
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            If you have questions about this Privacy Policy or wish to exercise your data rights, please contact our data administrator at:
          </p>
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            subhadipmondal0101@gmail.com
          </p>
        </div>

      </div>
    </div>
  );
}
