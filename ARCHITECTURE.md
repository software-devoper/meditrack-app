# ARCHITECTURE.md — MediTrack Pro Technical Specification
<!-- Last verified: 2026-10-02 against actual codebase -->

## 1. System Architecture

```text
User / Browser
      │
      ▼
React 19 Single Page Application (Vite + Tailwind CSS v4)
      │
      ├── Router: React Router DOM v7
      │
      ├── UI Layout: App Shell / Header / Responsive Sidebar (Layout.tsx)
      │
      ├── Pages & Views (Dashboard, Sales, Purchase, Patients, Suppliers, Profile, Settings)
      │
      ├── Custom Hooks & Contexts (AlertModalContext, useAppUpdate)
      │
      ├── State Stores: Zustand (useAuthStore, useSettingsStore)
      │
      ├── Data & Auth Logic Layer (authService.ts, emailValidation.ts)
      │
      └── SOLE Database Layer: firebase-mock.ts (LocalStorage-backed MockDatabaseEmitter)
            │
            NOTE: vite.config.ts aliases firebase/app, firebase/auth, firebase/firestore
            to firebase-mock.ts. Real Firestore and Firebase Auth are NEVER called.
```

### CRITICAL: Mock-Only Database Architecture

All Firebase SDK imports resolve to `src/lib/firebase-mock.ts` via Vite module aliases:
```ts
// vite.config.ts resolve.alias:
'firebase/app'       → src/lib/firebase-mock.ts
'firebase/auth'      → src/lib/firebase-mock.ts
'firebase/firestore' → src/lib/firebase-mock.ts
```
`src/lib/firebase.ts` initializes SDK objects with `isFirebaseConfigured = true` (hardcoded)
but those objects are never reached at runtime due to the alias interception.
`authService.ts` calls `getCollectionData()`/`saveCollectionData()` from `firebase-mock.ts` directly.

---

## 2. Directory Architecture

```text
/
├── .env.example                # Firebase env var template (not read at runtime due to mock aliases)
├── firestore.rules             # Firestore security rules (reference only; mock engine used)
├── DRAFT_firestore.rules       # Draft/alternate Firestore security rules
├── firebase-blueprint.json     # Declarative Firestore schema specification
├── security_spec.md            # Security specification document
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler configuration
├── vercel.json                 # Vercel SPA route rewrite rules
├── vite.config.ts              # CRITICAL: Firebase mock aliases + Tailwind CSS + versionPlugin
├── public/
│   └── version.json            # Written by versionPlugin() at build time (PWA update)
└── src/
    ├── main.tsx                # Entry point mounting App to DOM
    ├── App.tsx                 # Root component, theme applicator & router
    ├── index.css               # Global styles, dynamic font variables, CSS imports
    ├── assets/
    │   ├── images/             # Image assets subdirectory
    │   ├── phonepe-qr.png      # PhonePe QR code image
    │   └── phonepeQrData.ts    # PhonePe UPI QR payment data
    ├── components/
    │   ├── Logo.tsx            # SVG Brand logo
    │   ├── PharmacyWelcomeAnimation.css  # Welcome animation styles
    │   ├── PharmacyWelcomeAnimation.jsx  # Welcome animation component
    │   ├── UpdateNotificationCard.tsx    # App update banner (reads public/version.json)
    │   ├── doctor/             # 8 files: 3D Doctor gesture & state machine components
    │   ├── layout/
    │   │   ├── Layout.tsx      # Application layout wrapper
    │   │   └── WorkspaceSwitcher.tsx # Multi-tenant organization switcher modal
    │   └── ui/                 # Reusable UI primitives
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── input.tsx
    │       ├── textarea.tsx
    │       ├── PremiumAlertDialog.tsx
    │       └── index.ts
    ├── context/
    │   └── AlertModalContext.tsx # Global modal alert/confirm provider
    ├── features/
    │   ├── auth/               # AuthPage.tsx, Login.tsx, Bootstrap.tsx, authService.ts, countries.ts
    │   ├── customers/          # Customers.tsx (redirects to /patients)
    │   ├── dashboard/          # Dashboard.tsx (single file ~31KB)
    │   ├── doctors/            # Doctors.tsx (single file ~17KB)
    │   ├── legal/              # PrivacyPolicy.tsx (serves /privacy and /data-deletion)
    │   ├── patients/           # Patients.tsx (single file ~74KB)
    │   ├── profile/            # Profile.tsx (single file ~25KB)
    │   ├── purchase/           # Purchase.tsx, ProductsTab.tsx, HistoryTab.tsx,
    │   │                       # ProductFormModal.tsx, ProductValuesModal.tsx,
    │   │                       # SupplierSuggestionInput.tsx, ProductSuggestionInput.tsx
    │   ├── sales/              # Sales.tsx, NewSaleTab.tsx (~89KB), SalesHistoryTab.tsx,
    │   │                       # EditSaleModal.tsx, PatientDoctorSelectModal.tsx,
    │   │                       # NewCustomerDoctorModal.tsx, ProductAutocomplete.tsx,
    │   │                       # CustomerAutocomplete.tsx, DoctorAutocomplete.tsx,
    │   │                       # InvoicePrintTemplate.tsx
    │   ├── settings/           # Settings.tsx (single file ~41KB)
    │   ├── suppliers/          # Suppliers.tsx (single file ~60KB)
    │   └── legal/              # PrivacyPolicy.tsx
    ├── hooks/
    │   └── useAppUpdate.ts     # PWA update detection hook (reads /version.json)
    ├── lib/
    │   ├── firebase.ts         # Firebase SDK init (aliased at build; db/auth unused in practice)
    │   ├── firebase-mock.ts    # PRIMARY DB ENGINE: localStorage + MockDatabaseEmitter
    │   ├── emailValidation.ts  # Email syntax validator & 6-digit OTP engine
    │   ├── firestore-errors.ts # Firestore error boundary handler
    │   ├── currencyWords.ts    # Rupee amount-to-words generator for invoices
    │   └── utils.ts            # Class merge helper (clsx + tailwind-merge)
    ├── store/
    │   ├── useAuthStore.ts     # Auth session & workspace store (key: meditrack-auth-storage)
    │   └── useSettingsStore.ts # UI appearance & theme store (key: meditrack-settings)
    └── types/
        ├── index.ts            # TypeScript interfaces
        └── vite-env.d.ts       # Vite env types
```

---

## 3. Layer Responsibilities

* **Components (`src/components/ui/`)**: Pure, un-opinionated UI primitives (buttons, cards, inputs, dialogs) adhering to Tailwind CSS v4 styling rules.
* **Layout (`src/components/layout/`)**: Structural containers managing responsive navigation, header bar, user avatar link, theme mode toggle, and workspace switching.
* **Pages & Features (`src/features/*/`)**: Feature-specific page views containing domain logic, user workflows, form handling, and data grid rendering.
* **Hooks (`src/hooks/`)**: Shared reusable stateful logic (e.g. update notifications).
* **Context (`src/context/`)**: Global UI providers (e.g. `AlertModalContext` for confirmation modals).
* **Stores (`src/store/`)**: Zustand persisted state stores (`useAuthStore` for active user session & workspace; `useSettingsStore` for UI theme, font size, density, and color scheme).
* **Services & Validation (`src/features/auth/authService.ts`, `src/lib/emailValidation.ts`)**: Business logic for authentication, verification code generation, and multi-tenant organization provisioning.
* **Database Access (`src/lib/firebase.ts`, `src/lib/firebase-mock.ts`)**: Abstraction layer executing CRUD operations on Firestore or local reactive storage.
* **Types (`src/types/index.ts`)**: Centralized TypeScript data models shared across all application layers.

---

## 4. Authentication Architecture

* **Authentication Paradigm**: Clean Username / Email + Password Authentication & 5-Step Workspace Onboarding (stored locally via `firebase-mock.ts` engine).
* **Session Lifecycle**:
  ```text
  User Accesses Application
             │
             ▼
  App.tsx onAuthStateChanged fires (mock-backed)
  useAuthStore.isAuthenticated checked (from localStorage)
             │
      ┌──────┴────────────────────────┐
      ▼                               ▼
  Authenticated                  Not Authenticated
      │                               │
      ▼                               ▼
  Loads User & Workspace       Redirects to /login (AuthPage.tsx)
  from firebase-mock.ts
  ```
* **Auth Modes in `AuthPage.tsx`**:
  * `'signin'`: Minimal Sign In form containing Logo, Username/Email input, Password input, Sign In button, and "Don't have an account? Sign Up" link.
  * `'signup'`: Sign Up form containing Username (validated unique), Email (validated format & unique), Password, Confirm Password, Sign Up button, and "Already have an account? Sign In" link.
  * `'onboarding'`: 5-step registration wizard after Sign Up:
    1. Nationality selection
    2. Pharmacy / Organization Name
    3. Phone Number (with auto-assigned calling code prefix e.g. `+91`)
    4. Full Name
    5. Profile Picture (Upload image file, capture live webcam snapshot, or skip)
    → Calls `registerWorkspaceUser()` → saves User, Organization, and Passwords to mock → redirects to workspace (`/`).

---

## 5. Firestore Architecture

* **Database Type**: Cloud Firestore (NoSQL Document Store).
* **Collection Specifications**:

| Collection | Key Document ID | Key Fields | Purpose |
| :--- | :--- | :--- | :--- |
| `users` | `userId` / `uid` | `name`, `username`, `contactEmail`, `role`, `tenantId`, `organizationName`, `phone`, `avatarUrl`, `nationality`, `registrationCompleted` | User profiles & role permissions |
| `organizations` | `tenantId` | `name`, `slug`, `plan`, `ownerId`, `gstNumber`, `drugLicenseNumber`, `address`, `phone` | Multi-tenant pharmacy workspace details |
| `products` | `productId` | `name`, `genericName`, `category`, `manufacturer`, `purchasePrice`, `mrp`, `stockQty`, `reorderLevel`, `rackLocation` | Medicine & inventory catalogue |
| `customers` | `customerId` | `name`, `phone`, `email`, `address`, `type` (`sale` / `purchase`), `outstandingBalance`, `doctors` | Directory for both Patients and Suppliers |
| `doctors` | `doctorId` | `name`, `phone`, `email`, `address` | Prescribing physician registry |
| `sales` | `saleId` | `invoiceNo`, `patientName`, `doctorName`, `items`, `subtotal`, `gstTotal`, `grandTotal`, `paymentMode`, `date`, `status` | POS sales transactions |
| `purchases` | `purchaseId` | `supplierId`, `supplierName`, `items`, `subtotal`, `grandTotal`, `paymentStatus`, `date` | Vendor purchase orders |
| `stockLedger` | `ledgerId` | `productId`, `type`, `qtyChange`, `refCollection`, `refId`, `reason`, `date` | Audit log of inventory movements |
| `metadata` | `${tenantId}_salesCounter` | `tenantId`, `current` | Sequential invoice counter per workspace |

---

## 6. Data Relationships

```text
Organization (tenantId)
  ├── 1 : N ──> Users (user.tenantId == organization.id)
  ├── 1 : N ──> Products (products scoped per tenant)
  ├── 1 : N ──> Patients/Suppliers (customers collection)
  ├── 1 : N ──> Doctors
  ├── 1 : N ──> Sales (sales.invoiceNo generated via metadata)
  ├── 1 : N ──> Purchases
  └── 1 : N ──> StockLedger (linked to products via productId)
```

---

## 7. Feature Architecture

### POS Sales & Billing
```text
Sales.tsx (Page View)
  ├── NewSaleTab.tsx (Active Billing Terminal)
  │     ├── ProductAutocomplete.tsx (Real-time product stock lookups)
  │     ├── CustomerAutocomplete.tsx (Patient selection)
  │     ├── DoctorAutocomplete.tsx (Prescriber selection)
  │     └── InvoicePrintTemplate.tsx (Render invoice & download PDF via jsPDF)
  └── SalesHistoryTab.tsx (Filter sales, view status, process returns)
```

### Inventory & Stock Orders
```text
Purchase.tsx (Page View)
  ├── ProductsTab.tsx (Inventory table, low stock alerts, stock value metrics)
  │     └── ProductFormModal.tsx (Create / Edit product details)
  └── HistoryTab.tsx (Purchase orders history & supplier bill entries)
```

---

## 8. Routing Architecture

Defined in `src/App.tsx` using `react-router-dom`:

| Path | Element | Access Guard | Description |
| :--- | :--- | :--- | :--- |
| `/login` | `<AuthPage />` | Public | Authentication & onboarding page |
| `/signup` | `<AuthPage />` | Public | Registration page (same component) |
| `/auth` | `<AuthPage />` | Public | Authentication page alias |
| `/setup` | `<Bootstrap />` | Public | System bootstrap utility |
| `/privacy` | `<PrivacyPolicy />` | Public | Privacy Policy page |
| `/data-deletion` | `<PrivacyPolicy />` | Public | Data Deletion policy (same component as /privacy) |
| `/` | `<Layout />` | Protected (`ProtectedRoute`) | Application Shell |
| `/` (index) | `<Dashboard />` | Protected | Executive dashboard & real-time metrics |
| `/purchase` | `<Purchase />` | Protected | Inventory stock & purchase orders |
| `/sales` | `<Sales />` | Protected | POS billing terminal & sales history |
| `/patients` | `<Patients />` | Protected | Patient records & balance tracking |
| `/patient-info` | Navigate → `/patients` | Protected | Legacy alias |
| `/suppliers` | `<Suppliers />` | Protected | Supplier directory & payable tracking |
| `/supplier-info` | Navigate → `/suppliers` | Protected | Legacy alias |
| `/customers` | Navigate → `/patients` | Protected | Legacy redirect |
| `/doctors` | Navigate → `/patients` | Protected | Doctors rendered inside Patients page |
| `/settings` | `<Settings />` | Protected | UI appearance settings & organization details |
| `/profile` | `<Profile />` | Protected | User account profile, avatar upload & webcam capture |

---

## 9. State Management

1. **`useAuthStore`** (`src/store/useAuthStore.ts`):
   * State: `user`, `organization`, `firebaseUid`, `isAuthenticated`.
   * Actions: `setUser`, `setOrganization`, `updateUser`, `updateOrganization`, `switchWorkspace`, `logout`.
   * Persistence: `localStorage` under key `meditrack-auth-storage`.

2. **`useSettingsStore`** (`src/store/useSettingsStore.ts`):
   * State: `themeMode` (`light` | `dark` | `system`), `colorScheme`, `fontSize`, `density`, `fontColor`.
   * Actions: `setThemeMode`, `setColorScheme`, `setFontSize`, `setDensity`, `setFontColor`, `reset`.
   * Persistence: `localStorage` under key `meditrack-settings`.

---

## 10. API Architecture

* **Firebase SDK Integration**: Client-side direct connection to Firestore and Firebase Auth using environment keys.
* **Google GenAI Integration**: Modern `@google/genai` TypeScript SDK initialization for smart query assistance.
* **PDF & Printing Pipeline**: Client-side canvas conversion (`html2canvas-pro`) and PDF document construction (`jspdf`).

---

## 11. Environment Configuration

Defined in `.env.example`:
```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**Important**: These environment variables are NOT read at runtime because Vite aliases all Firebase SDK imports to `firebase-mock.ts`. They would only be needed if the Vite mock aliases are removed for a real Firebase migration.

---

## 12. Vercel Deployment

* **Configuration (`vercel.json`)**:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
* **Build Command**: `npm run build` (`vite build`).
* **Output Directory**: `dist`.
* **Dev Server**: `npm run dev` — runs on port 3000 (`vite --port=3000 --host=0.0.0.0`).
* **Lint/Type Check**: `npm run lint` — runs `tsc --noEmit`.
* **versionPlugin**: Custom Vite plugin in `vite.config.ts` that writes `public/version.json` at build time. This file is read by `useAppUpdate.ts` hook for PWA update detection.

---

## 13. Shared Reusable Components

Future developers and AI agents MUST reuse these components rather than duplicating them:
* **`Button`** (`src/components/ui/button.tsx`)
* **`Input`** (`src/components/ui/input.tsx`)
* **`Card`**, `CardHeader`, `CardTitle`, `CardContent` (`src/components/ui/card.tsx`)
* **`Badge`** (`src/components/ui/badge.tsx`)
* **`Textarea`** (`src/components/ui/textarea.tsx`)
* **`PremiumAlertDialog`** (`src/components/ui/PremiumAlertDialog.tsx`)
* **`useAlertModal`** (`src/context/AlertModalContext.tsx`)
* **`WorkspaceSwitcher`** (`src/components/layout/WorkspaceSwitcher.tsx`)

---

## 14. Security Architecture

* **Firestore Security Rules (`firestore.rules`)** (reference only — not active at runtime):
  * `metadata`: public read, authenticated write.
  * `users`: public read, authenticated create/update (own uid or admin), admin-only delete.
  * `products`, `customers`, `doctors`, `sales`, `purchases`: public read, authenticated create/update/delete.
  * `stockLedger`: public read, authenticated create, **update/delete blocked** (`allow update, delete: if false`) — immutable ledger.
  * Default catch-all: `deny all`.
* **Mock Engine Security**: Data is stored in browser localStorage; no server-side auth enforcement at runtime.
* **Authentication Design**: Passwordless 6-digit OTP verification. Social login is simulated (no real OAuth tokens).
* **Multi-Tenant Scoping**: All queries filter by `tenantId` to guarantee organizational data isolation within the mock engine.

---

## 15. Performance Considerations

* **Local Mock Cache**: High-performance local storage cache eliminating network latency during offline development.
* **Vite Bundling**: Code splitting and module pre-bundling via Vite 6.
* **Immutability & Pure Functions**: Fast React 19 component re-renders with memoized handlers.

---

## 16. AI AGENT WORKING RULES

### Initial Project Analysis
The project architecture has been fully analyzed and documented. AI agents MUST NOT execute automated whole-repository scans or inspect unrelated files for new tasks.

### Workflow for Task Execution
```text
1. Read PROJECT_CONTEXT.md and ARCHITECTURE.md
2. Locate relevant files in the Feature-to-File Mapping (PROJECT_CONTEXT.md Section 8)
3. Read ONLY those specific files and immediate imports
4. Make precise, minimal edits fulfilling the requirement
5. Run: npm run lint (tsc --noEmit) to verify no type errors
6. Report which files were changed and why
7. Update PROJECT_CONTEXT.md and ARCHITECTURE.md if architecture was changed
8. Do NOT touch unrelated components, auth flows, or deployment scripts
```

### Critical Architecture Constraints for AI Agents
- **Never remove the Vite Firebase mock aliases** in `vite.config.ts` unless explicitly tasked with migrating to real Firebase.
- **Never add real Firebase Auth SDK calls** (`signInWithPopup`, `signInWithGoogle`, etc.) — they are aliased to the mock.
- **Never modify the immutable `stockLedger`** — insert-only, no update or delete.
- **Always scope data queries by `tenantId`** for multi-tenant isolation.
- **`@google/genai` is installed but unused** — do not assume it is integrated unless verified.
