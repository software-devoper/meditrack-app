import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui";
import { formatCurrency, cn } from "../../lib/utils";
import { DollarSign, TrendingUp, ShoppingCart, AlertTriangle, ArrowRight, Package, Calendar, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Store, Building2 } from "lucide-react";

const CHART_COLORS: Record<string, string[]> = {
  blue: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  green: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
  violet: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
  orange: ['#f97316', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'],
  rose: ['#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'],
  teal: ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
  red: ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'],
};

type PeriodType = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all';

interface PeriodOption {
  id: PeriodType;
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisYear', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-lg">
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-2 text-xs">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium flex justify-between gap-4" style={{ color: entry.color }}>
            <span>{entry.name}:</span>
            <span>{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg shadow-lg flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill }} />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{payload[0].name}:</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { colorScheme } = useSettingsStore();
  const { user, organization } = useAuthStore();
  const COLORS = CHART_COLORS[colorScheme] || CHART_COLORS.blue;
  const primaryColor = COLORS[0];

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('thisMonth');
  const [activityType, setActivityType] = useState<'All' | 'Sale' | 'Purchase'>('All');
  const navigate = useNavigate();
  
  const [allSales, setAllSales] = useState<any[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    categoryData: [] as any[],
  });

  useEffect(() => {
    if (!db) return;

    // 1. Listen to Sales
    const salesQ = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(1000));
    const unsubSales = onSnapshot(salesQ, (snapshot) => {
      const sales: any[] = [];
      snapshot.forEach(doc => {
        sales.push({ ...doc.data(), id: doc.id, type: 'Sale' });
      });
      setAllSales(sales);
    });

    // 2. Listen to Purchases
    const purchaseQ = query(collection(db, 'purchases'), orderBy('date', 'desc'), limit(1000));
    const unsubPurchases = onSnapshot(purchaseQ, (snapshot) => {
      const purchases: any[] = [];
      snapshot.forEach(doc => {
        purchases.push({ ...doc.data(), id: doc.id, type: 'Purchase' });
      });
      setAllPurchases(purchases);
    });

    // 3. Products (for MRP, Purchase Price & Unit categories)
    const productsQ = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(productsQ, (snapshot) => {
      const prods: any[] = [];
      const units: Record<string, number> = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        prods.push({ ...data, id: doc.id });
        const unit = data.unit || 'Other';
        units[unit] = (units[unit] || 0) + (Number(data.stockQty) || 0);
      });

      const unitArray = Object.entries(units).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

      setAllProducts(prods);
      setInventoryStats({
        categoryData: unitArray,
      });
    });

    return () => {
      unsubSales();
      unsubPurchases();
      unsubProducts();
    };
  }, []);

  // Fast Product Lookups for Purchase Price & MRP calculation
  const productsMap = useMemo(() => {
    const map = new Map<string, any>();
    allProducts.forEach(p => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [allProducts]);

  const productsByName = useMemo(() => {
    const map = new Map<string, any>();
    allProducts.forEach(p => {
      if (p.name) map.set(p.name.trim().toLowerCase(), p);
    });
    return map;
  }, [allProducts]);

  // Compute period boundaries
  const periodRange = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    switch (selectedPeriod) {
      case 'today':
        return { start: startOfToday, end: endOfToday, label: "Today's" };
      case 'yesterday': {
        const yStart = startOfToday - 86400000;
        const yEnd = startOfToday - 1;
        return { start: yStart, end: yEnd, label: "Yesterday's" };
      }
      case 'last7days': {
        const start7 = startOfToday - 6 * 86400000;
        return { start: start7, end: endOfToday, label: "Last 7 Days" };
      }
      case 'thisMonth': {
        const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        return { start: mStart, end: endOfToday, label: "This Month's" };
      }
      case 'lastMonth': {
        const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
        const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
        return { start: lmStart, end: lmEnd, label: "Last Month's" };
      }
      case 'thisYear': {
        const yStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
        return { start: yStart, end: endOfToday, label: "This Year's" };
      }
      case 'all':
      default:
        return { start: 0, end: Infinity, label: "All Time" };
    }
  }, [selectedPeriod]);

  // Filter sales and purchases for the selected period
  const filteredSales = useMemo(() => {
    return allSales.filter(s => {
      const t = Number(s.date) || 0;
      return t >= periodRange.start && t <= periodRange.end;
    });
  }, [allSales, periodRange]);

  const filteredPurchases = useMemo(() => {
    return allPurchases.filter(p => {
      const t = Number(p.date) || 0;
      return t >= periodRange.start && t <= periodRange.end;
    });
  }, [allPurchases, periodRange]);

  // Aggregated period stats
  const periodStats = useMemo(() => {
    const salesTotal = filteredSales.reduce((sum, s) => {
      const val = Number(s.grandTotal) || 0;
      return s.status === 'returned' ? sum - val : sum + val;
    }, 0);
    const purchasesTotal = filteredPurchases.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);

    return {
      salesTotal,
      salesCount: filteredSales.filter(s => s.status !== 'returned').length,
      purchasesTotal,
      purchasesCount: filteredPurchases.length,
    };
  }, [filteredSales, filteredPurchases]);

  // Period-aware Net Profit: (MRP / Selling Rate - Purchase Price) of all sold products in the selected period
  // NOTE: Items marked as isCustom (solely for sales) are strictly excluded from profit calculations
  const periodNetProfit = useMemo(() => {
    return filteredSales.reduce((totalProfit, sale) => {
      let saleProfit = 0;
      let hasInventoryItems = false;

      if (Array.isArray(sale.items) && sale.items.length > 0) {
        sale.items.forEach((item: any) => {
          // Custom / sales-only items have NO effect on profit or cost calculations
          if (item.isCustom || (item.productId && item.productId.startsWith('custom_'))) {
            return;
          }

          const qty = Number(item.qty) || 0;
          if (qty <= 0) return;

          // Lookup matching product to get purchase price and MRP
          const prod = (item.productId ? productsMap.get(item.productId) : null) ||
                       (item.name ? productsByName.get(item.name.trim().toLowerCase()) : null);

          // If item is not in inventory product catalog, do not calculate profit
          if (!prod) return;

          hasInventoryItems = true;
          const purchasePrice = prod ? Number(prod.purchasePrice) || 0 : 0;
          const sellingPrice = Number(item.rate) || (prod ? Number(prod.mrp) : 0) || 0;
          const itemDiscount = Number(item.discount) || 0;

          // Profit per item = (Selling Rate/MRP - Purchase Price) * Qty - Item Discount
          const profit = ((sellingPrice - purchasePrice) * qty) - itemDiscount;
          saleProfit += profit;
        });

        // Subtract bill-level discount only if inventory products were sold
        if (hasInventoryItems && sale.discountTotal && Number(sale.discountTotal) > 0) {
          saleProfit -= Number(sale.discountTotal);
        }
      }

      // Returned sales subtract the profit
      return sale.status === 'returned' ? totalProfit - saleProfit : totalProfit + saleProfit;
    }, 0);
  }, [filteredSales, productsMap, productsByName]);

  const profitMarginPercent = useMemo(() => {
    if (periodStats.salesTotal <= 0) return 0;
    return Math.round((periodNetProfit / periodStats.salesTotal) * 100);
  }, [periodNetProfit, periodStats.salesTotal]);

  // Sales Trend chart data for the period
  const trendData = useMemo(() => {
    const trendMap = new Map<string, { date: string; timestamp: number; sales: number; purchases: number }>();

    filteredSales.forEach(s => {
      let key = '';
      const dateObj = new Date(Number(s.date) || 0);
      if (selectedPeriod === 'today' || selectedPeriod === 'yesterday') {
        key = format(dateObj, 'hh:00 a');
      } else if (selectedPeriod === 'thisYear' || selectedPeriod === 'all') {
        key = format(dateObj, 'MMM yyyy');
      } else {
        key = format(dateObj, 'dd MMM');
      }

      const existing = trendMap.get(key) || { date: key, timestamp: Number(s.date) || 0, sales: 0, purchases: 0 };
      const val = Number(s.grandTotal) || 0;
      existing.sales += s.status === 'returned' ? -val : val;
      trendMap.set(key, existing);
    });

    filteredPurchases.forEach(p => {
      let key = '';
      const dateObj = new Date(Number(p.date) || 0);
      if (selectedPeriod === 'today' || selectedPeriod === 'yesterday') {
        key = format(dateObj, 'hh:00 a');
      } else if (selectedPeriod === 'thisYear' || selectedPeriod === 'all') {
        key = format(dateObj, 'MMM yyyy');
      } else {
        key = format(dateObj, 'dd MMM');
      }

      const existing = trendMap.get(key) || { date: key, timestamp: Number(p.date) || 0, sales: 0, purchases: 0 };
      existing.purchases += Number(p.grandTotal) || 0;
      trendMap.set(key, existing);
    });

    return Array.from(trendMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredSales, filteredPurchases, selectedPeriod]);

  // Combined period activity for the table
  const periodActivity = useMemo(() => {
    let merged: any[] = [];
    
    if (activityType === 'All' || activityType === 'Sale') {
      merged = [...merged, ...filteredSales.map(s => ({
        id: s.id,
        date: s.date,
        type: 'Sale',
        refNo: s.invoiceNo ? `Invoice #${s.invoiceNo}` : 'Sale',
        party: s.patientName || s.customerName || 'Walk-in Patient',
        amount: s.grandTotal,
        paymentMode: s.paymentMode || 'Cash',
        status: s.status === 'returned' ? 'Returned' : 'Completed',
      }))];
    }
    
    if (activityType === 'All' || activityType === 'Purchase') {
      merged = [...merged, ...filteredPurchases.map(p => ({
        id: p.id,
        date: p.date,
        type: 'Purchase',
        refNo: p.invoiceNo ? `Bill #${p.invoiceNo}` : 'Purchase',
        party: p.supplierName || 'Vendor',
        amount: p.grandTotal,
        paymentMode: p.paymentMode || 'Cash',
        status: 'Completed',
      }))];
    }

    return merged.sort((a, b) => b.date - a.date).slice(0, 15);
  }, [filteredSales, filteredPurchases, activityType]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time pharmacy performance overview & insights.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" /> New Sale
          </button>
          <button
            type="button"
            onClick={() => navigate('/purchase')}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Package className="w-4 h-4" /> New Purchase
          </button>
        </div>
      </div>

      {/* Client Pharmacy Workspace Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-50 via-teal-50/50 to-white dark:from-primary-950/40 dark:via-slate-850 dark:to-slate-900 border border-primary-100 dark:border-primary-900/40 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {organization?.name || user?.organizationName || 'MediTrack Cloud Pharmacy'}
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                {organization?.plan || user?.plan || 'Growth'} Plan
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Isolated workspace • {allProducts.length} medicines in inventory • {allSales.length} recorded sales transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/settings?tab=workspace"
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Workspace Profile & Staff</span>
          </Link>
        </div>
      </div>

      {/* Period-Wise Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
          <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
            <Calendar className="w-4 h-4" />
          </div>
          <span>Period Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedPeriod(opt.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border",
                selectedPeriod === opt.id
                  ? "bg-primary-600 text-white border-primary-600 shadow-sm font-bold"
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sales Revenue */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{periodRange.label} Sales Revenue</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(periodStats.salesTotal)}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {periodStats.salesCount} Sales Orders
                </p>
              </div>
              <div className="p-2.5 bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Expenses */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{periodRange.label} Purchases</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(periodStats.purchasesTotal)}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-primary-500" /> {periodStats.purchasesCount} Purchase Invoices
                </p>
              </div>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period-Wise Net Profit (MRP - Purchase Price of sold items) */}
        <Card className="border-slate-200 dark:border-slate-800 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{periodRange.label} Net Profit</p>
                <h3 className={cn(
                  "text-2xl font-bold",
                  periodNetProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                )}>
                  {formatCurrency(periodNetProfit)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1.5">
                  <span className={cn(
                    "font-bold px-1.5 py-0.5 rounded text-[11px]",
                    periodNetProfit >= 0 
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300"
                  )}>
                    {periodNetProfit >= 0 ? '+' : ''}{profitMarginPercent}% Margin
                  </span>
                </p>
              </div>
              <div className={cn(
                "p-2.5 rounded-xl",
                periodNetProfit >= 0 
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" 
                  : "bg-red-50 dark:bg-red-950/50 text-red-500"
              )}>
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Sales & Purchases Trend</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">{periodRange.label} financial distribution</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
              {PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label}
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500, paddingTop: '10px' }} />
                    <Line type="monotone" name="Sales Revenue" dataKey="sales" stroke={primaryColor} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Purchases" dataKey="purchases" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  <Package className="w-8 h-8 mb-2 opacity-40" />
                  No transactions found in this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Stock by Unit</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">Inventory packaging distribution</p>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStats.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryStats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {inventoryStats.categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name}: {entry.value}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table with Centered & Highlighted Attributes */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-4">
          <div>
            <CardTitle className="text-base font-bold">Activity in Selected Period</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sales and purchase activity filtered by {(periodRange?.label || 'selected').toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
              {(['All', 'Sale', 'Purchase'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActivityType(type)}
                  className={cn(
                    "px-3 py-1 text-xs font-bold transition-all rounded-md",
                    activityType === type
                      ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {periodActivity.length} Transactions
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide border-b-2 border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  <th className="px-4 py-3.5 text-center">Date & Time</th>
                  <th className="px-4 py-3.5 text-center">Type</th>
                  <th className="px-4 py-3.5 text-center">Invoice / Ref</th>
                  <th className="px-4 py-3.5 text-center">Patient / Supplier</th>
                  <th className="px-4 py-3.5 text-center">Payment Mode</th>
                  <th className="px-4 py-3.5 text-center">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {periodActivity.map((act) => (
                  <tr key={`${act.type}-${act.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {format(new Date(act.date), 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full",
                        act.type === 'Sale'
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300"
                      )}>
                        {act.type === 'Sale' ? <ShoppingCart className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        {act.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100">
                      {act.refNo}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-medium">
                      {act.party}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                        {act.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(act.amount)}
                    </td>
                  </tr>
                ))}
                {periodActivity.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 dark:text-slate-400">
                      No {activityType !== 'All' ? activityType.toLowerCase() : ''} activity recorded for {(periodRange?.label || 'selected').toLowerCase()} period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
