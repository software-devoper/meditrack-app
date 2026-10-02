# ARCHITECTURE.md — MediTrack Pro Technical Specification

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
      └── Database Access Layer (firebase.ts / firebase-mock.ts)
            │
            ├── Primary: Cloud Firestore (Remote NoSQL Database)
            └── Fallback: Reactive LocalStorage Engine (MockDatabaseEmitter)
```

---

## 2. Directory Architecture

```text
/
├── .env.example                # Environment variables template
├── firestore.rules             # Production Firestore security rules
├── firebase-blueprint.json     # Declarative Firestore schema specification
├── package.json                # Project dependencies and npm scripts
├── vercel.json                 # Vercel SPA route rewrite rules
├── vite.config.ts              # Vite bundler & Tailwind CSS plugin setup
└── src/
    ├── main.tsx                # Entry point mounting App to DOM
    ├── App.tsx                 # Root component, theme applicator & router
    ├── index.css               # Global styles, dynamic font variables, CSS imports
    ├── assets/                 # Brand logos and payment QR images
    ├── components/
    │   ├── Logo.tsx            # SVG Brand logo
    │   ├── UpdateNotificationCard.tsx # App update banner
    │   ├── doctor/             # 3D Doctor gesture & state machine components
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
    │   ├── auth/               # AuthPage, Login, Bootstrap, authService, countries
    │   ├── dashboard/          # Analytics & executive metrics view
    │   ├── doctors/            # Prescribing doctor directory
    │   ├── customers/          # Patient directory redirects
    │   ├── patients/           # Patient & Customer management
    │   ├── profile/            # Profile editor, photo upload & webcam capture
    │   ├── purchase/           # Inventory stock entry & supplier bill logging
    │   ├── sales/              # POS terminal, billing, invoice printing & history
    │   ├── settings/           # UI settings & organization workspace details
    │   ├── suppliers/          # Vendor directory & accounts payable
    │   └── legal/              # Privacy Policy & Data Deletion legal documentation
    ├── hooks/
    │   └── useAppUpdate.ts     # PWA update detection hook
    ├── lib/
    │   ├── firebase.ts         # Firebase App, Auth & Firestore initialization
    │   ├── firebase-mock.ts    # Fallback reactive local database engine
    │   ├── emailValidation.ts  # Email syntax validator & 6-digit OTP engine
    │   ├── firestore-errors.ts # Firestore error boundary handler
    │   ├── currencyWords.ts    # Rupee amount-to-words generator for invoices
    │   └── utils.ts            # Class merge helper (clsx + tailwind-merge)
    ├── store/
    │   ├── useAuthStore.ts     # Auth session & workspace store
    │   └── useSettingsStore.ts # UI appearance & theme store
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

* **Authentication Paradigm**: Passwordless 6-Digit Email OTP + Google/Facebook Social Auth.
* **Session Lifecycle**:
  ```text
  User Accesses Application
             │
             ▼
  App.tsx Listens via onAuthStateChanged (Firebase Auth) & useAuthStore
             │
      ┌──────┴────────────────────────┐
      ▼                               ▼
  Authenticated                  Not Authenticated
      │                               │
      ▼                               ▼
  Loads User & Workspace       Redirects to /login (AuthPage.tsx)
  from Firestore / LocalStorage
  ```
* **Auth States in `AuthPage.tsx`**:
  * `'initial'`: Shows pharmacy intro + Google/Facebook buttons (and "More login methods" if user logged out).
  * `'more-methods'`: Displays "Continue with Email".
  * `'email-input'`: Accepts user email address $\rightarrow$ triggers `sendEmailCode(email)`.
  * `'email-verify'`: Accepts 6-digit OTP code $\rightarrow$ verifies code via `verifyCode(email, code)`.
    * If email matches registered user $\rightarrow$ Signs in directly to existing workspace (`/`).
    * If email is unregistered $\rightarrow$ Advances to 5-Step Onboarding Flow.
  * `'onboarding'`: 5-step registration wizard:
    1. Nationality selection
    2. Pharmacy / Organization Name
    3. Phone Number (with auto-assigned calling code prefix e.g. `+91`)
    4. Full Name
    5. Profile Picture (Upload image file, capture live webcam snapshot, or skip)
    $\rightarrow$ Saves new `User` & `Organization` records $\rightarrow$ Redirects to workspace (`/`).

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
| `/signup` | `<AuthPage />` | Public | Registration page |
| `/auth` | `<AuthPage />` | Public | Authentication page alias |
| `/setup` | `<Bootstrap />` | Public | System bootstrap utility |
| `/privacy` | `<PrivacyPolicy />` | Public | Privacy Policy & Data Deletion compliance |
| `/` | `<Layout />` | Protected (`ProtectedRoute`) | Application Shell |
| `/` (index) | `<Dashboard />` | Protected | Executive dashboard & real-time metrics |
| `/purchase` | `<Purchase />` | Protected | Inventory stock & purchase orders |
| `/sales` | `<Sales />` | Protected | POS billing terminal & sales history |
| `/patients` | `<Patients />` | Protected | Patient records & balance tracking |
| `/suppliers` | `<Suppliers />` | Protected | Supplier directory & payable tracking |
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

* **Firestore Security Rules (`firestore.rules`)**:
  * Enforces `request.auth != null` for document creation and updates.
  * Ensures `stockLedger` entries are append-only (`allow update, delete: if false`).
* **Authentication Safeguards**: Passwordless 6-digit OTP verification preventing brute-force password attacks.
* **Multi-Tenant Scoping**: All queries filter by `tenantId` to guarantee organizational data isolation.

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
1. Consult PROJECT_CONTEXT.md and ARCHITECTURE.md
2. Locate relevant files in the Feature-to-File Mapping
3. Read ONLY those specific files and immediate imports
4. Make precise, minimal edits fulfilling the requirement
5. Run compile_applet and lint_applet to verify
6. Do NOT touch unrelated components, auth flows, or deployment scripts
```
