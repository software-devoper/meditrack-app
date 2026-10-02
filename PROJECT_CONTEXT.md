# PROJECT_CONTEXT.md — MediTrack Pro

## 1. Project Identity

* **Project Name**: MediTrack Pro (Workspace & Pharmacy ERP Platform)
* **Application Purpose**: An enterprise-grade, multi-client Pharmacy ERP & Workspace Management SaaS application. Enables pharmacy owners, pharmacists, and clinic managers to oversee daily Point-of-Sale (POS) transactions, inventory management, purchase orders, patient/customer records, supplier relations, doctor prescribers, multi-tenant workspace switching, and financial reporting.
* **Main Users**: Pharmacy Owners, Administrators, Staff Pharmacists, Inventory Clerks.
* **Current Development Status**: Fully functional, production-ready React 19 single-page application. **IMPORTANT**: The application runs exclusively on a high-fidelity in-memory/localStorage mock database engine. All Firebase SDK imports are aliased to `src/lib/firebase-mock.ts` via `vite.config.ts` — real Firestore/Firebase Auth are never called at runtime. Includes multi-tenant workspace switching, dark/light theme engine, PDF invoice generation, QR payment generation, and 6-digit email OTP authentication.
* **Major Features**:
  1. **Authentication & Onboarding**: Passwordless 6-digit Email OTP verification, simulated Google & Facebook social authentication (resolved locally via mock engine, not real OAuth), password-based login, 5-step interactive workspace onboarding flow (Nationality, Pharmacy Name, Phone with auto country calling code, Full Name, Profile Picture upload & webcam capture).
  2. **Dashboard & Analytics**: Real-time POS sales counters, purchase expenditure metrics, low stock warnings, reorder alerts, stock valuation, and activity audit feed.
  3. **Point of Sale (POS) & Billing**: Fast barcode/autocomplete billing, batch price lookups, GST calculations, custom discounts, invoice PDF rendering & print modal, UPI QR code generator (PhonePe integration), credit/due tracking, and sales history.
  4. **Inventory & Purchase Orders**: Stock purchase entry, supplier bill logging, batch stock ledger updates, low-stock reorder thresholds, rack locations, and MRP vs Purchase Price calculations.
  5. **Patient & Customer Management**: Patient directory, contact records, default discounts, medical history logs, outstanding balances, and associated doctor prescribers.
  6. **Supplier Management**: Vendor directory, GST numbers, outstanding payables, and bill history.
  7. **Doctor Directory**: Prescribing doctor registry, clinic contact info, and patient linkage. NOTE: `/doctors` route redirects to `/patients`; doctor management is within the Patients page.
  8. **User Profile & Avatar Management**: Profile info editor, avatar picture upload, webcam snapshot integration, and workspace identity management.
  9. **Workspace & Settings**: Multi-tenant workspace switcher (`tenantId` scoped), workspace details editor, UI density/font/color customization.

---

## 2. Technology Stack

```text
Frontend Framework:
React 19.0.1 + TypeScript 5.8.2

Build & Bundler:
Vite 6.2.3 + @tailwindcss/vite 4.1.14

Styling & Icons:
Tailwind CSS 4.1.14 + Lucide React 1.41.0 + clsx + tailwind-merge

Routing:
React Router DOM 7.18.3

State Management:
Zustand 5.0.15 (Persisted stores for Auth & UI Settings)

Forms & Validation:
React Hook Form 7.87.0 + Zod 4.5.4 + @hookform/resolvers 5.9.1

Backend & Database:
CRITICAL: All Firebase SDK imports (firebase/app, firebase/auth, firebase/firestore)
are aliased via vite.config.ts to src/lib/firebase-mock.ts at build time.
The application EXCLUSIVELY uses the local localStorage-backed mock engine.
firebase package 12.18.0 is installed but its SDK calls resolve to the mock.

Date Utilities:
date-fns 4.4.0

PDF & Document Export:
jsPDF 4.2.1 + html2canvas-pro 2.4.3 + QR Code 1.5.4

NOT ACTIVELY USED (installed in package.json only):
@google/genai 2.4.0 — installed but NOT imported or used in any src/ file
html2canvas 1.4.1 — legacy; active imports use html2canvas-pro only

Notifications & UI Components:
Sonner 2.0.8 + Motion 12.23.24 + Recharts 3.10.1 + Three.js 0.186.0

Deployment:
Vercel (Single Page App with index.html rewrites)

Source Control:
GitHub
```

---

## 3. Project Structure

```text
/
├── index.html                  # HTML entry point with meta tags & title
├── package.json                # Dependencies, scripts (dev, build, lint)
├── vite.config.ts              # CRITICAL: Firebase mock aliases + Tailwind CSS + versionPlugin
├── vercel.json                 # Vercel SPA routing rewrite rules
├── firestore.rules             # Firestore security rules (reference only — mock engine active)
├── DRAFT_firestore.rules       # Draft/alternate Firestore security rules
├── firebase-blueprint.json     # Firestore entity schema definitions
├── security_spec.md            # Security specification document
├── tsconfig.json               # TypeScript compiler configuration
├── .env.example                # Template for Firebase env vars (not read at runtime)
└── src/
    ├── main.tsx                # React application DOM mounting entry point
    ├── App.tsx                 # Root router, global theme provider, Firebase auth observer
    ├── index.css               # Global CSS & Tailwind CSS directives
    ├── assets/                 # Brand logos, PhonePe QR image, static assets
    ├── components/
    │   ├── Logo.tsx            # MediTrack SVG Logo component
    │   ├── PharmacyWelcomeAnimation.css / .jsx # Animated welcome effect
    │   ├── UpdateNotificationCard.tsx # PWA / app update notifier
    │   ├── doctor/             # 3D Doctor animation state machine & controllers
    │   ├── layout/
    │   │   ├── Layout.tsx      # Main application shell, top header, sidebars
    │   │   └── WorkspaceSwitcher.tsx # Multi-tenant workspace switcher modal
    │   └── ui/                 # Reusable UI primitives (Button, Input, Card, Badge, Textarea, PremiumAlertDialog)
    ├── context/
    │   └── AlertModalContext.tsx # Global modal & confirmation dialog context
    ├── features/
    │   ├── auth/               # AuthPage, Login, Bootstrap, authService, countries
    │   ├── dashboard/          # Real-time metrics dashboard & summary cards
    │   ├── doctors/            # Prescribing doctor management
    │   ├── customers/          # Legacy customer redirects
    │   ├── patients/           # Patient directory & balance tracking
    │   ├── profile/            # User account profile, avatar upload, webcam capture
    │   ├── purchase/           # Inventory stock entry & supplier bill logging
    │   ├── sales/              # POS billing, customer autocomplete, PDF invoice printing
    │   ├── settings/           # UI customization (theme, color, font) & workspace details
    │   ├── suppliers/          # Supplier directory & vendor balance management
    │   └── legal/              # Privacy Policy & Data Deletion policy pages
    ├── hooks/
    │   └── useAppUpdate.ts     # PWA update checker hook (reads /public/version.json)
    ├── lib/
    │   ├── firebase.ts         # Firebase SDK init (aliased at build; db/auth objects unused in practice)
    │   ├── firebase-mock.ts    # PRIMARY DATABASE ENGINE — localStorage + MockDatabaseEmitter
    │   ├── emailValidation.ts  # Email syntax validation & 6-digit OTP code generator
    │   ├── firestore-errors.ts # Firestore error boundary formatter
    │   ├── currencyWords.ts    # Number to Indian Rupee text converter for invoices
    │   └── utils.ts            # Tailwind class merging utilities
    ├── store/
    │   ├── useAuthStore.ts     # Zustand store for user session & active workspace
    │   └── useSettingsStore.ts # Zustand store for theme, font size, density
    └── types/
        ├── index.ts            # Core TypeScript interface definitions (User, Organization, Product, Sale, Purchase, etc.)
        └── vite-env.d.ts       # Vite client env type definitions
```

---

## 4. Important Files

* **`vite.config.ts`**: Most critical config file — contains the Firebase mock aliases and custom `versionPlugin()` that writes `public/version.json` at build time.
* **`src/App.tsx`**: Central routing entry point, global theme initializer, Firebase auth listener (effectively no-op due to aliases), and protected route wrapper (`ProtectedRoute`).
* **`src/lib/firebase.ts`**: Firebase SDK initialization. Has `isFirebaseConfigured = true` hardcoded. Aliased away at build — its `db`/`auth` exports are never reached in practice.
* **`src/lib/firebase-mock.ts`**: **The primary and only database engine.** Complete reactive `localStorage`-backed mock engine with `MockDatabaseEmitter`. All CRUD, workspace switching, and password storage route through this file.
* **`src/features/auth/AuthPage.tsx`**: Main authentication & onboarding interface featuring passwordless 6-digit email OTP, simulated Google/Facebook social auth (local mock), and 5-step registration onboarding.
* **`src/features/auth/authService.ts`**: Authentication business logic. Uses `firebase-mock.ts` exclusively. Includes `authenticateWithPassword()` in addition to OTP and social login.
* **`src/store/useAuthStore.ts`**: Zustand state store persisting authenticated user, active tenant/organization, and workspace switcher state to `localStorage`.
* **`src/components/layout/Layout.tsx`**: Core layout container with responsive sidebar, collapsible navigation, header bar with user profile picture, and mobile bottom bar.
* **`src/features/sales/Sales.tsx`**: POS terminal orchestrating billing tabs, item selection, tax calculations, invoice modal, and sale completion.
* **`src/features/sales/InvoicePrintTemplate.tsx`**: HTML/CSS invoice layout optimized for print and PDF downloading via `html2canvas-pro` + `jspdf`.
* **`src/features/purchase/Purchase.tsx`**: Minimal wrapper entry point for the Purchase feature (tabs are in `ProductsTab.tsx` and `HistoryTab.tsx`).
* **`src/features/profile/Profile.tsx`**: User profile management card featuring live avatar preview, image file uploader, and webcam photo capture.
* **`src/types/index.ts`**: Shared data contracts (`Organization`, `User`, `Product`, `Patient`, `Supplier`, `Doctor`, `Sale`, `Purchase`, `StockLedgerEntry`).
* **`firestore.rules`**: Firestore security rules (reference document only — not active since the mock engine is used at runtime).

---

## 5. Firebase Architecture (ACTUAL)

* **CRITICAL: Vite alias interception**: `vite.config.ts` aliases `firebase/app`, `firebase/auth`, and `firebase/firestore` all to `src/lib/firebase-mock.ts`. Real Firebase SDK calls are never made.
* **Actual DB Engine**: `src/lib/firebase-mock.ts` — `localStorage`-backed reactive engine with `MockDatabaseEmitter` for real-time query subscriptions.
* **`src/lib/firebase.ts`**: Still present; initializes SDK objects with `isFirebaseConfigured = true` (hardcoded). But these objects are never reached at runtime due to alias interception.
* **Mock localStorage keys**: `meditrack_mock_organizations`, `meditrack_mock_users`, `meditrack_mock_products`, `meditrack_mock_customers`, `meditrack_mock_doctors`, `meditrack_mock_sales`, `meditrack_mock_purchases`, `meditrack_mock_stockLedger`, `meditrack_mock_metadata`, `meditrack_mock_auditLogs`, `meditrack_mock_passwords`.
* **Real Firebase re-enablement**: Would require removing the Vite aliases and providing valid `.env` values.

---

## 6. Authentication Architecture

* **All auth operations use `firebase-mock.ts` exclusively — no real Firebase Auth SDK calls.**
* **Methods**:
  1. **Social Login (Google & Facebook)**: UI prompts for email + display name → resolved against mock `users` collection. NOT real OAuth.
  2. **Passwordless Email OTP**: User enters email → `sendEmailCode()` issues 6-digit code (stored in memory) → `verifyCode()` validates:
     * Registered email → Opens existing workspace.
     * New email → Proceeds to 5-step onboarding.
  3. **Password-based**: `authenticateWithPassword()` → checks `getStoredPasswords()` from mock engine.
  4. **5-Step Onboarding**: Nationality → Org Name → Phone → Full Name → Profile Picture → `registerWorkspaceUser()`.
* **Session Persistence**: Zustand `useAuthStore` → `localStorage` key `meditrack-auth-storage`.

---

## 7. Firestore Collections & Schema

1. **`users`**: `id`, `name`, `username`, `internalAuthEmail`, `contactEmail`, `role`, `tenantId`, `organizationName`, `organizationSlug`, `plan`, `phone`, `avatarUrl`, `nationality`, `countryCode`, `authProvider`, `registrationCompleted`, `isActive`, `createdAt`, `createdBy`.
2. **`organizations`**: `id`, `name`, `slug`, `plan`, `ownerId`, `ownerName`, `createdAt`, `status`, `branchesCount`, `gstNumber`, `panNumber`, `drugLicenseNumber`, `address`, `phone`, `email`, `currency`.
3. **`products`**: `id`, `name`, `genericName`, `category`, `manufacturer`, `hsnCode`, `unit`, `purchasePrice`, `mrp`, `discount`, `gstPercent`, `stockQty`, `reorderLevel`, `rackLocation`, `imageUrl`, `supplierName`, `createdAt`, `updatedAt`.
4. **`customers`**: Unified collection holding both Patients (`type: 'sale'`) and Suppliers (`type: 'purchase'`). Fields: `name`, `phone`, `email`, `address`, `outstandingBalance`, `defaultDiscount`, `doctors`.
5. **`doctors`**: `id`, `name`, `phone`, `email`, `address`, `createdAt`, `createdBy`.
6. **`sales`**: `invoiceNo`, `billTo`, `patientName`, `patientPhone`, `doctorName`, `items`, `subtotal`, `discountTotal`, `gstTotal`, `grandTotal`, `paymentMode`, `date`, `createdBy`, `status`.
7. **`purchases`**: `supplierId`, `supplierName`, `items`, `subtotal`, `gstTotal`, `grandTotal`, `paymentStatus`, `amountPaid`, `date`, `createdBy`.
8. **`stockLedger`**: IMMUTABLE. `productId`, `type`, `qtyChange`, `refCollection`, `refId`, `reason`, `date`, `createdBy`. No update/delete ever.
9. **`metadata`**: Invoice sequence counters. Document ID format: `${tenantId}_salesCounter`. Fields: `tenantId`, `current`.

---

## 8. Application Feature-to-File Mapping

```text
Authentication & Workspace Onboarding
├── src/features/auth/AuthPage.tsx
├── src/features/auth/authService.ts
├── src/features/auth/countries.ts
├── src/lib/emailValidation.ts
└── src/store/useAuthStore.ts

POS Sales & Billing Terminal
├── src/features/sales/Sales.tsx
├── src/features/sales/NewSaleTab.tsx
├── src/features/sales/SalesHistoryTab.tsx
├── src/features/sales/ProductAutocomplete.tsx
├── src/features/sales/CustomerAutocomplete.tsx
├── src/features/sales/DoctorAutocomplete.tsx
├── src/features/sales/EditSaleModal.tsx
├── src/features/sales/PatientDoctorSelectModal.tsx
├── src/features/sales/NewCustomerDoctorModal.tsx  [previously undocumented]
├── src/features/sales/InvoicePrintTemplate.tsx
├── src/assets/phonepeQrData.ts
└── src/assets/phonepe-qr.png

Inventory & Purchase Management
├── src/features/purchase/Purchase.tsx
├── src/features/purchase/ProductsTab.tsx
├── src/features/purchase/HistoryTab.tsx
├── src/features/purchase/ProductFormModal.tsx
├── src/features/purchase/ProductValuesModal.tsx
├── src/features/purchase/SupplierSuggestionInput.tsx
└── src/features/purchase/ProductSuggestionInput.tsx

Patient Directory
├── src/features/patients/Patients.tsx  (~74KB single file)
└── src/features/sales/PatientDoctorSelectModal.tsx

Supplier Directory
└── src/features/suppliers/Suppliers.tsx  (~60KB single file)

Doctor Directory
└── src/features/doctors/Doctors.tsx  (~17KB)
   NOTE: /doctors route -> Navigate to /patients (doctors managed inside Patients page)

User Profile & Avatar Management
├── src/features/profile/Profile.tsx
└── src/components/layout/Layout.tsx

Application Settings & Customization
├── src/features/settings/Settings.tsx
└── src/store/useSettingsStore.ts

Multi-Tenant Workspace Switcher
└── src/components/layout/WorkspaceSwitcher.tsx
```

---

## 9. External APIs

* **Google GenAI API** (`@google/genai` v2.4.0): `UNKNOWN — VERIFY BEFORE MODIFYING`. Package installed but NOT imported or used in any `src/` file. May be planned but not yet implemented.
* **PhonePe UPI QR Integration**: Client-side QR generation for POS digital payments.

---

## 10. Environment Variables

Client-side environment variables defined in `.env.example`:

* `VITE_FIREBASE_API_KEY`
* `VITE_FIREBASE_AUTH_DOMAIN`
* `VITE_FIREBASE_PROJECT_ID`
* `VITE_FIREBASE_STORAGE_BUCKET`
* `VITE_FIREBASE_MESSAGING_SENDER_ID`
* `VITE_FIREBASE_APP_ID`

*Note: These variables are NOT read at runtime due to the Vite Firebase mock aliases. They would only be required if migrating to real Firebase by removing the aliases in `vite.config.ts`.*

---

## 11. Deployment Pipeline

```text
Source Code (GitHub)
       ↓
Automatic Trigger / Build Command (`npm run build` → `vite build`)
       ↓
versionPlugin() writes public/version.json (for PWA update detection via useAppUpdate.ts)
       ↓
Vercel Cloud Deployment
       ↓
SPA Route Rewrite (`vercel.json` → `/index.html`)
       ↓
Production Application
```

Dev: `npm run dev` → port 3000. Lint: `npm run lint` → `tsc --noEmit`.

---

## 12. Important Coding Rules

1. **Preserve Existing Architecture**: Do not replace Vite, React 19, or Tailwind CSS v4.
2. **Reuse Existing Components**: Use primitives in `src/components/ui/` (`Button`, `Input`, `Card`, `Badge`) and global contexts (`AlertModalContext`).
3. **Data Scoping Discipline**: All business entity queries MUST respect `tenantId` scoping for multi-organization safety.
4. **Immutable Stock Ledger**: Never edit or delete entries in `stockLedger`. Only insert new ledger entries.
5. **Zero-Pill UI Discipline**: Avoid round floating pill badges where clean rectangular rounded tags (`rounded-lg`, `rounded-xl`) provide better layout alignment.
6. **Do Not Change Mock Alias**: The Vite Firebase mock aliases in `vite.config.ts` are intentional architecture. Do not remove them unless explicitly migrating to real Firebase.
7. **No Real Firebase Auth Calls**: Do not add real Firebase Auth SDK calls (signInWithGoogle, etc.) — they are aliased to the mock engine.

---

## 13. AI AGENT WORKING RULES

### Initial Project Analysis
The project has been thoroughly analyzed and documented. Future AI agents MUST NOT perform a complete repository scan or inspect unrelated files when fulfilling specific feature requests.

### Workflow for Every Task
```text
1. Read PROJECT_CONTEXT.md (this file)
2. Read ARCHITECTURE.md
3. Identify the target feature in the Feature-to-File Mapping (Section 8)
4. Inspect ONLY the identified relevant files and immediate dependencies
5. Implement the change using minimal, surgical edits
6. Run: npm run lint (tsc --noEmit) to verify no type errors
7. Report exactly which files were changed and why
8. Update PROJECT_CONTEXT.md and ARCHITECTURE.md if architecture was modified
```

### Avoid Unnecessary Exploration
Do NOT automatically inspect or modify:
* `src/features/auth/`  (unless auth task)
* `src/features/settings/`  (unless settings task)
* `src/features/dashboard/`  (unless dashboard task)
* `vite.config.ts`, `vercel.json`, `firestore.rules`  (unless build/deploy task)

### Critical Architecture Constraints
* **Never remove the Vite Firebase mock aliases** without an explicit Firebase migration task.
* **Never add real Firebase Auth SDK calls** — they are aliased to the mock.
* **Never modify the immutable `stockLedger`** — insert only, no update or delete.
* **Always scope data queries by `tenantId`** for multi-tenant isolation.
* **`@google/genai` is installed but unused** — do not assume it is integrated.

### Minimal Change & Reuse Principles
* Make the smallest reasonable set of changes required to fulfill the request.
* Check existing components in `src/components/ui/` and utilities in `src/lib/` before introducing new ones.
* Maintain existing UI styling and responsive behavior.
