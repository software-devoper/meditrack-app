export type Role = "admin" | "staff";

export interface User {
  id?: string;
  name: string;
  username: string;
  internalAuthEmail: string;
  contactEmail?: string;
  role: Role;
  isActive: boolean;
  createdAt: number;
  createdBy: string;
}

export interface Product {
  id?: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  hsnCode: string;
  unit: string;
  purchasePrice: number;
  mrp: number;
  discount?: number;
  gstPercent: number;
  stockQty: number;
  reorderLevel: number;
  rackLocation: string;
  imageUrl?: string;
  supplierName?: string; // Fetched from patients / suppliers section
  createdAt: number;
  updatedAt: number;
}

export interface PatientDoctor {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string; // Clinic / chamber address
}

export interface Patient {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  type: 'sale' | 'purchase';
  outstandingBalance: number;
  defaultDiscount?: number;
  doctors?: PatientDoctor[];
  createdAt: number;
  createdBy: string;
}

export type Customer = Patient;

export interface Doctor {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  createdAt: number;
  createdBy: string;
}

export interface Supplier {
  id?: string;
  name: string;
  phone: string;
  gstNumber: string;
  address: string;
  outstandingBalance: number;
  defaultDiscount?: number;
  createdAt: number;
}

export interface PurchaseItem {
  productId: string;
  qty: number;
  rate: number;
  gstPercent: number;
}

export interface Purchase {
  id?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentStatus: "Paid" | "Partial" | "Due";
  amountPaid: number;
  date: number;
  createdBy: string;
}

export interface SalesItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  discount: number;
  gstPercent: number;
  isCustom?: boolean;
  unit?: string;
}

export interface Sale {
  id?: string;
  invoiceNo: string;
  billTo?: string; // Custom Bill To name if different from patient name
  patientName?: string;
  customerName?: string; // Kept for backward compatibility
  patientPhone?: string;
  customerPhone?: string;
  patientAddress?: string;
  customerAddress?: string;
  doctorName?: string;
  doctorPhone?: string;
  doctorAddress?: string;
  items: SalesItem[];
  subtotal: number;
  discountTotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Credit";
  date: number;
  createdBy: string;
  status: "completed" | "returned";
}

export interface StockLedgerEntry {
  id?: string;
  productId: string;
  type: "purchase" | "sale" | "adjustment" | "return";
  qtyChange: number; // positive or negative
  refCollection: "purchases" | "sales" | "manual";
  refId: string;
  reason: string;
  date: number;
  createdBy: string;
}
