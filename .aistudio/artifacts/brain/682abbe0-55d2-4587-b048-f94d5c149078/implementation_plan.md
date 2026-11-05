# Barcode Scanner in Add Multiple Products & Sales Billing

Seamless live camera and USB barcode scanner integration to automatically detect medicines and auto-fill Product Name, MRP, and Purchase Price in both the **Add Multiple Products (Row-wise)** purchase dialog and **Sales Billing**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following requirements were confirmed during the interactive interview:
> - **Placement**: Available in both the **Purchase ("Add Multiple Products (Row-wise)")** modal and the **Sales Billing** table.
> - **Auto-Fill Fields**: Auto-fills **Product Name**, **MRP**, and **Purchase Price** directly into the active row.
> - **Hardware & Connectivity**: Built-in device camera (phone or laptop/webcam) and dedicated USB barcode scanner gun input (keyboard wedge mode with instant enter key listener).

---

## 1. Overview & Core Concept

- **What It Does**: Enables pharmacy staff and cashiers to scan 1D/2D medicine barcodes using either a handheld USB scanner gun or any device camera (smartphone or laptop webcam).
- **Target Audience**: Pharmacists and inventory managers adding supplier stock batches or generating customer bills quickly without typing long medicine names and MRP values manually.
- **Key Value**: Drastically reduces manual data entry errors, eliminates typing latency during stock receiving and retail sales, and keeps inventory records consistent.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Purchase Stock Receiving ("Add Multiple Products (Row-wise)")**:
   - The user opens **Purchase ➔ + Add Products** or clicks **Add Multiple Products (Row-wise)**.
   - A high-visibility emerald **Scan Barcode** button with a pulse icon is displayed next to the **+ Add Row** button and in the dialog toolbar.
   - Clicking opens the **Live Barcode & Camera Scanner** modal.
   - Pointing the phone/device camera at a product barcode (or scanning with a handheld USB scanner gun) instantly matches the item in the pharmacy catalog.
   - The row is automatically populated with the medicine's **Name**, **MRP**, **Purchase Price**, **Unit**, and **GST %**, and the cursor advances to Quantity.

2. **Sales Billing ("New Sale")**:
   - In the **Selected Products (Row-wise)** table on the Sales tab, the user clicks **Scan Barcode** (or scans with a USB gun).
   - The medicine is auto-detected, its MRP and purchase price are filled, and its quantity is set to 1 (or incremented if already listed).

### Visual Layout & Modal Design

- **Viewfinder Screen**: Dark charcoal container (`bg-slate-950`) featuring an animated red laser guide bar, translucent corner alignment brackets, and camera feed rendering.
- **USB Scanner Input Box**: High-contrast, auto-focused input box that instantly intercepts scanner gun keystrokes and processes `<Enter>` events automatically.
- **Feedback & Confirmation**: Green check badges and haptic/toast notifications indicating `Scanned: [Product Name] - ₹[MRP]`.

---

## 3. Key Product Decisions & Trade-Offs

- **Universal Scanner Modal Component**:
  - *Chosen Approach*: Share a single, modular `BarcodeScannerModal` between `ProductFormModal.tsx` (Purchase) and `NewSaleTab.tsx` (Sales).
  - *Why*: Ensures identical scanning behavior, camera access handling, and shortcut navigation across both purchase receiving and retail checkout.
- **Auto-Fill vs. Append Strategy**:
  - *Chosen Approach*: If the current row is empty (blank name and price), fill that row. If all existing rows contain products, automatically append a new row and fill it. In Sales, if the product is already present, increment its quantity.
  - *Why*: Eliminates unnecessary empty rows and saves clicks during high-speed batch entry.
- **Graceful Fallback When Unmatched**:
  - *Chosen Approach*: If a scanned code is not yet cataloged in inventory, allow the user to easily assign the scanned barcode directly to the new row so it is remembered for future scans.

---

## 4. Technical Architecture & Component Flow

```
┌────────────────────────────────────────────────────────┐
│                   Pharmacy Application                 │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │ Purchase Management     │  │ Sales & Billing     │  │
│  │ (ProductFormModal.tsx)  │  │ (NewSaleTab.tsx)    │  │
│  │ "Add Multiple Products" │  │ "Selected Products" │  │
│  └───────────┬─────────────┘  └──────────┬──────────┘  │
│              │                           │             │
│              └─────────────┬─────────────┘             │
│                            │                           │
│                            ▼                           │
│              ┌───────────────────────────┐             │
│              │  BarcodeScannerModal.tsx  │             │
│              │                           │             │
│              │  ├─ Device Camera (Web)   │             │
│              │  ├─ USB Scanner Gun Box   │             │
│              │  └─ Barcode Lookup Engine │             │
│              └─────────────┬─────────────┘             │
│                            │                           │
│                            ▼                           │
│              ┌───────────────────────────┐             │
│              │ Cloud Firestore Database  │             │
│              │  products (barcode, MRP,  │             │
│              │  purchasePrice, stockQty) │             │
│              └───────────────────────────┘             │
└────────────────────────────────────────────────────────┘
```

### Component State & Handler Mapping

- `ProductFormModal.tsx`:
  - `isBarcodeScannerOpen`: Boolean controlling scanner modal visibility.
  - `handleBarcodeScanSuccess(scannedProduct)`: Auto-populates `name`, `mrp`, `purchasePrice`, `gstPercent`, `unit`, and `barcode` into the target row.
- `NewSaleTab.tsx`:
  - `isBarcodeScannerOpen`: State for retail checkout scanning.
  - `handleBarcodeScanSuccess(product)`: Populates sale item row and updates running invoice totals.
- `BarcodeScannerModal.tsx`:
  - Camera stream cleanup on unmount to release device hardware.
  - Real-time matching against existing inventory items by `barcode`, `id`, `hsnCode`, and `name`.
