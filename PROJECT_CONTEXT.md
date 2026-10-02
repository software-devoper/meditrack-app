# PROJECT_CONTEXT.md — MediTrack Pro

## 1. Project Identity

* **Project Name**: MediTrack Pro (Workspace & Pharmacy ERP Platform)
* **Application Purpose**: An enterprise-grade, multi-client Pharmacy ERP & Workspace Management SaaS application. Enables pharmacy owners, pharmacists, and clinic managers to oversee daily Point-of-Sale (POS) transactions, inventory management, purchase orders, patient/customer records, supplier relations, doctor prescribers, multi-tenant workspace switching, and financial reporting.
* **Main Users**: Pharmacy Owners, Administrators, Staff Pharmacists, Inventory Clerks.
* **Current Development Status**: Fully functional, production-ready React 19 single-page application with real-time Firestore persistence, mock database engine fallback, multi-tenant workspace switching, dark/light theme engine, PDF invoice generation, QR payment generation, and 6-digit email OTP authentication.
* **Major Features**:
  1. **Authentication & Onboarding**: Passwordless 6-digit Email OTP verification, Google & Facebook social authentication, 5-step interactive workspace onboarding flow (Nationality, Pharmacy Name, Phone with auto country calling code, Full Name, Profile Picture upload & webcam capture).
  2. **Dashboard & Analytics**: Real-time POS sales counters, purchase expenditure metrics, low stock warnings, reorder alerts, stock valuation, and activity audit feed.
  3. **Point of Sale (POS) & Billing**: Fast barcode/autocomplete billing, batch price lookups, GST calculations, custom discounts, invoice PDF rendering & print modal, UPI QR code generator (PhonePe integration), credit/due tracking, and sales history.
  4. **Inventory & Purchase Orders**: Stock purchase entry, supplier bill logging, batch stock ledger updates, low-stock reorder thresholds, rack locations, and MRP vs Purchase Price calculations.
  5. **Patient & Customer Management**: Patient directory, contact records, default discounts, medical history logs, outstanding balances, and associated doctor prescribers.
  6. **Supplier Management**: Vendor directory, GST numbers, outstanding payables, and bill history.
  7. **Doctor Directory**: Prescribing doctor registry, clinic contact info, and patient linkage.
  8. **User Profile & Avatar Management**: Profile info editor, avatar picture upload, webcam snapshot integration, password updates, and workspace identity management.
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
Firebase Firestore 12.18.0 + Firebase Auth 12.18.0
(Includes high-fidelity local Firestore mock fallback in src/lib/firebase-mock.ts)

AI SDK:
@google/genai 2.4.0

PDF & Document Export:
jsPDF 4.2.1 + html2canvas-pro 2.4.3 + QR Code 1.5.4

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
├── vite.config.ts              # Vite configuration with Tailwind CSS plugin
├── vercel.json                 # Vercel SPA routing rewrite rules
├── firestore.rules             # Firestore security rules
├── firebase-blueprint.json     # Firestore entity schema definitions
├── .env.example                # Template for required client environment variables
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
    │   └── useAppUpdate.ts     # PWA update checker hook
    ├── lib/
    │   ├── firebase.ts         # Firebase initialization (App, Auth, Firestore)
    │   ├── firebase-mock.ts    # Fallback in-memory/localStorage mock database engine
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

* **`src/App.tsx`**: Central routing entry point, global theme initializer, Firebase auth listener, and protected route wrapper (`ProtectedRoute`).
* **`src/lib/firebase.ts`**: Firebase SDK client initialization (`initializeApp`, `getFirestore`, `getAuth`).
* **`src/lib/firebase-mock.ts`**: Complete local persistence & event-emitting reactive mock engine used for full offline functionality and seamless client demonstration.
* **`src/features/auth/AuthPage.tsx`**: Main authentication & onboarding interface featuring passwordless 6-digit email OTP, Google/Facebook social auth, and 5-step registration onboarding.
* **`src/features/auth/authService.ts`**: Authentication business logic (email search, workspace registration, OTP code issuance, social login resolution).
* **`src/store/useAuthStore.ts`**: Zustand state store persisting authenticated user, active tenant/organization, and workspace switcher state to `localStorage`.
* **`src/components/layout/Layout.tsx`**: Core layout container with responsive sidebar, collapsible navigation, header bar with user profile picture, and mobile bottom bar.
* **`src/features/sales/Sales.tsx`**: POS terminal orchestrating billing tabs, item selection, tax calculations, invoice modal, and sale completion.
* **`src/features/sales/InvoicePrintTemplate.tsx`**: HTML/CSS invoice layout optimized for print and PDF downloading via `html2canvas-pro` + `jspdf`.
* **`src/features/purchase/Purchase.tsx`**: Supplier purchase order logging, stock batch entry, and cost calculations.
* **`src/features/profile/Profile.tsx`**: User profile management card featuring live avatar preview, image file uploader, and webcam photo capture.
* **`src/types/index.ts`**: Shared data contracts (`Organization`, `User`, `Product`, `Patient`, `Supplier`, `Doctor`, `Sale`, `Purchase`, `StockLedgerEntry`).
* **`firestore.rules`**: Production security rules enforcing authentication and immutable stock ledger restrictions.

---

## 5. Firebase Architecture

* **Firebase Services Active**:
  * **Firebase Authentication**: `getAuth(app)` — handles Google/Facebook sign-in state and email verification sessions.
  * **Cloud Firestore**: `getFirestore(app)` — real-time NoSQL database holding all collection documents.
* **Architecture Strategy**:
  * Dual-layer persistence: `src/lib/firebase.ts` connects to Cloud Firestore when `VITE_FIREBASE_API_KEY` is provided. If Firebase is offline or unconfigured, `src/lib/firebase-mock.ts` transparently handles queries and updates via `localStorage` with identical schema signatures.

---

## 6. Authentication Architecture

* **Flow & Methods**:
  1. **Social Login (Google & Facebook)**: User selects provider, enters account email $\rightarrow$ If registered, opens existing workspace immediately; if new, starts 5-step onboarding.
  2. **Passwordless Email OTP**: User enters email $\rightarrow$ System issues 6-digit verification code $\rightarrow$ Upon verification:
     * **Registered Email**: Opens existing workspace directly (no onboarding questions).
     * **New Email**: Proceeds to 5-step onboarding flow.
  3. **5-Step Onboarding**:
     * **Step 1**: Nationality selection (configures country calling code).
     * **Step 2**: Pharmacy / Organization Name.
     * **Step 3**: Phone Number (automatic fixed country code prefix based on Step 1).
     * **Step 4**: Full Name.
     * **Step 5**: Profile Picture (Upload image file, capture webcam snapshot, or skip).
* **Session Persistence**: User session state stored in `useAuthStore` (persisted under key `meditrack-auth-storage`).

---

## 7. Firestore Collections & Schema

1. **`users`**: User profile, authentication email, tenantId scope, role (`owner` | `admin` | `pharmacist` | `staff`), contact phone, avatarUrl, nationality, and registration completion flag.
2. **`organizations`**: Multi-tenant workspace entity (`id`, `name`, `slug`, `plan`, `ownerId`, `drugLicenseNumber`, `gstNumber`, `phone`, `address`).
3. **`products`**: Inventory items (`id`, `name`, `genericName`, `category`, `manufacturer`, `purchasePrice`, `mrp`, `stockQty`, `reorderLevel`, `rackLocation`).
4. **`customers`**: Unified collection holding both Patients (`type: 'sale'`) and Suppliers (`type: 'purchase'`).
5. **`doctors`**: Prescribing doctor directory (`id`, `name`, `phone`, `email`, `address`).
6. **`sales`**: POS sale transactions (`invoiceNo`, `patientName`, `doctorName`, `items`, `subtotal`, `gstTotal`, `grandTotal`, `paymentMode`, `date`, `status`).
7. **`purchases`**: Inventory purchase logs (`supplierId`, `supplierName`, `items`, `subtotal`, `grandTotal`, `paymentStatus`, `date`).
8. **`stockLedger`**: Immutable record of all stock additions and reductions (`type`, `qtyChange`, `refCollection`, `refId`, `reason`, `date`).
9. **`metadata`**: Invoice sequence counters (`${tenantId}_salesCounter`).

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
├── src/features/sales/InvoicePrintTemplate.tsx
└── src/assets/phonepeQrData.ts

Inventory & Purchase Management
├── src/features/purchase/Purchase.tsx
├── src/features/purchase/ProductsTab.tsx
├── src/features/purchase/HistoryTab.tsx
├── src/features/purchase/ProductFormModal.tsx
├── src/features/purchase/ProductValuesModal.tsx
├── src/features/purchase/SupplierSuggestionInput.tsx
└── src/features/purchase/ProductSuggestionInput.tsx

Patient Directory
├── src/features/patients/Patients.tsx
└── src/features/sales/PatientDoctorSelectModal.tsx

Supplier Directory
└── src/features/suppliers/Suppliers.tsx

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

* **Google GenAI API**: Used for AI-assisted inventory categorization & smart query assistance (`@google/genai`).
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

*Note: All client-side environment variables in Vite must be prefixed with `VITE_`.*

---

## 11. Deployment Pipeline

```text
Source Code (GitHub)
       ↓
Automatic Trigger / Build Command (`npm run build` -> `vite build`)
       ↓
Vercel Cloud Deployment
       ↓
SPA Route Rewrite (`vercel.json` -> `/index.html`)
       ↓
Production Application
```

---

## 12. Important Coding Rules

1. **Preserve Existing Architecture**: Do not replace Vite, React 19, or Tailwind CSS v4.
2. **Reuse Existing Components**: Use primitives in `src/components/ui/` (`Button`, `Input`, `Card`, `Badge`) and global contexts (`AlertModalContext`).
3. **Data Scoping Discipline**: All business entity queries MUST respect `tenantId` scoping for multi-organization safety.
4. **Immutable Stock Ledger**: Never edit or delete entries in `stockLedger`. Only insert new ledger entries.
5. **Zero-Pill UI Discipline**: Avoid round floating pill badges where clean rectangular rounded tags (`rounded-lg`, `rounded-xl`) provide better layout alignment.
6. **No Breaking Auth Changes**: Maintain the passwordless OTP email + Google/Facebook authentication paradigm.

---

## 13. AI AGENT WORKING RULES

### Initial Project Analysis
The project has already been thoroughly analyzed and documented in `PROJECT_CONTEXT.md` and `ARCHITECTURE.md`. Future AI agents MUST NOT perform a complete repository scan or inspect unrelated files when fulfilling specific feature requests.

### Workflow for Every Task
```text
1. Read PROJECT_CONTEXT.md
2. Read ARCHITECTURE.md
3. Identify the target feature in the Feature-to-File Mapping
4. Inspect ONLY the identified relevant files and immediate dependencies
5. Implement the change using minimal, surgical edits
6. Test and compile the applet
7. Review changed files
8. Update documentation if architecture was modified
```

### Avoid Unnecessary Exploration
Do NOT automatically inspect or modify:
* `src/features/auth/`
* `src/features/settings/`
* `src/features/dashboard/`
* Deployment or build configuration files (`vite.config.ts`, `vercel.json`, `firestore.rules`)
unless explicitly required by the task.

### Minimal Change & Reuse Principles
* Make the smallest reasonable set of changes required to fulfill the request.
* Check existing components in `src/components/ui/` and utilities in `src/lib/` before introducing new ones.
* Maintain existing UI styling and responsive behavior.
