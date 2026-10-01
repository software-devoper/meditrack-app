import { useState } from 'react';
import { Product } from '../../types';
import { Button } from '../../components/ui';
import { X, Layers, TrendingUp, Calendar, Building2, Package, Edit2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';

interface ProductValuesModalProps {
  productName: string;
  allProducts: Product[];
  onClose: () => void;
  onEditProduct?: (product: Product) => void;
}

export function ProductValuesModal({
  productName,
  allProducts,
  onClose,
  onEditProduct,
}: ProductValuesModalProps) {
  const [isMerging, setIsMerging] = useState(false);

  // Find all products matching this name (case-insensitive)
  const matchingProducts = allProducts.filter(
    p => (p?.name || '').trim().toLowerCase() === (productName || '').trim().toLowerCase()
  );

  // Sort by latest created/updated first
  const sortedEntries = [...matchingProducts].sort(
    (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  );

  // Group by identical values (unit, buy, mrp, gst)
  const duplicateGroups: Product[][] = [];
  const visited = new Set<string>();

  sortedEntries.forEach(entry => {
    if (!entry.id || visited.has(entry.id)) return;
    const sameList = sortedEntries.filter(other => 
      other.id &&
      (other.unit || 'Strip').trim().toLowerCase() === (entry.unit || 'Strip').trim().toLowerCase() &&
      Math.abs(Number(other.purchasePrice || 0) - Number(entry.purchasePrice || 0)) < 0.01 &&
      Math.abs(Number(other.mrp || 0) - Number(entry.mrp || 0)) < 0.01 &&
      Math.abs(Number(other.gstPercent !== undefined ? other.gstPercent : 12) - Number(entry.gstPercent !== undefined ? entry.gstPercent : 12)) < 0.01
    );
    if (sameList.length > 1) {
      duplicateGroups.push(sameList);
      sameList.forEach(s => s.id && visited.add(s.id));
    }
  });

  const totalDuplicateRecords = duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);

  const handleMergeDuplicates = async () => {
    setIsMerging(true);
    try {
      let mergedCount = 0;
      for (const group of duplicateGroups) {
        if (group.length > 1) {
          const [primary, ...redundant] = group;
          const combinedStock = group.reduce((sum, item) => sum + (item.stockQty || 0), 0);

          await setDoc(doc(db, 'products', primary.id), {
            stockQty: combinedStock,
            updatedAt: Date.now()
          }, { merge: true });

          for (const item of redundant) {
            await deleteDoc(doc(db, 'products', item.id));
          }
          mergedCount += redundant.length;
        }
      }

      toast.success(`Successfully merged ${mergedCount} duplicate product entries into one with combined stock!`);
      onClose();
    } catch (err: any) {
      console.error('Error merging duplicates:', err);
      toast.error('Failed to merge duplicates: ' + (err.message || 'Unknown error'));
    } finally {
      setIsMerging(false);
    }
  };

  // Statistics
  const buyRates = sortedEntries.map(p => p.purchasePrice || 0);
  const mrpRates = sortedEntries.map(p => p.mrp || 0);
  const minBuy = buyRates.length > 0 ? Math.min(...buyRates) : 0;
  const maxBuy = buyRates.length > 0 ? Math.max(...buyRates) : 0;
  const minMrp = mrpRates.length > 0 ? Math.min(...mrpRates) : 0;
  const maxMrp = mrpRates.length > 0 ? Math.max(...mrpRates) : 0;
  const totalStock = sortedEntries.reduce((acc, p) => acc + (p.stockQty || 0), 0);
  const totalValue = sortedEntries.reduce((acc, p) => acc + (p.stockQty || 0) * (p.purchasePrice || 0), 0);

  const hasDifferentPrices = minBuy !== maxBuy || minMrp !== maxMrp;
  const representative = sortedEntries[0] || ({} as Product);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800/60 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {productName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {sortedEntries.length} {sortedEntries.length === 1 ? 'Recorded Value' : 'Different Values'}
                </span>
                {hasDifferentPrices ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Price Variance Detected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    Uniform Rates
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Compare purchase prices, selling MRPs, suppliers, and stock across entries.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                Buy Price Range
              </span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                {minBuy === maxBuy ? formatCurrency(minBuy) : `${formatCurrency(minBuy)} – ${formatCurrency(maxBuy)}`}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {minBuy !== maxBuy ? `Spread: ${formatCurrency(maxBuy - minBuy)}` : 'Single buy rate'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selling MRP Range</span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {minMrp === maxMrp ? formatCurrency(minMrp) : `${formatCurrency(minMrp)} – ${formatCurrency(maxMrp)}`}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {minMrp !== maxMrp ? `Spread: ${formatCurrency(maxMrp - minMrp)}` : 'Single selling MRP'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total In-Stock</span>
              <p className="text-base font-bold text-primary-600 dark:text-primary-400 mt-1">
                {totalStock} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{representative.unit || 'Units'}</span>
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Across {sortedEntries.length} record(s)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Stock Value</span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(totalValue)}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Based on buy rates</span>
            </div>
          </div>

          {/* Duplicate Values Alert & Merge Option */}
          {totalDuplicateRecords > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {totalDuplicateRecords} Duplicate Value Entry/Entries Detected
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    This product has duplicate records with identical rates and units. You can merge them into a single entry with combined stock.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isMerging}
                onClick={handleMergeDuplicates}
                className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 shrink-0 font-medium"
              >
                {isMerging ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-amber-700 dark:text-amber-300 mr-1.5" />
                )}
                Merge Duplicate Values
              </Button>
            </div>
          )}

          {/* Detailed Values Table */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Recorded Values Breakdown
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Click "Edit" on any value to adjust its price or stock
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs tracking-wider uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-3 text-center w-12">#</th>
                    <th className="px-4 py-3 text-center">Date & Time</th>
                    <th className="px-4 py-3 text-center">Supplier / Vendor</th>
                    <th className="px-4 py-3 text-center">Buy Price</th>
                    <th className="px-4 py-3 text-center">MRP (Selling)</th>
                    <th className="px-3 py-3 text-center">Margin</th>
                    <th className="px-3 py-3 text-center">GST %</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sortedEntries.map((entry, idx) => {
                    const buy = entry.purchasePrice || 0;
                    const sell = entry.mrp || 0;
                    const marginAmt = sell - buy;
                    const marginPct = buy > 0 ? ((marginAmt / buy) * 100).toFixed(1) : '0';
                    const isLowestBuy = buyRates.length > 1 && buy === minBuy;
                    const isHighestBuy = buyRates.length > 1 && buy === maxBuy && minBuy !== maxBuy;

                    const dateVal = entry.createdAt || entry.updatedAt;

                    return (
                      <tr 
                        key={entry.id || idx} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''
                        }`}
                      >
                        <td className="px-3 py-3 text-center font-bold text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {dateVal ? (
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {format(new Date(dateVal), 'dd/MM/yyyy')}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {format(new Date(dateVal), 'hh:mm a')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{entry.supplierName || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(buy)}
                            </span>
                            {isLowestBuy && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Best Rate
                              </span>
                            )}
                            {isHighestBuy && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                Highest
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(sell)}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            +{formatCurrency(marginAmt)}
                          </span>
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ({marginPct}%)
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                          {entry.gstPercent ?? 12}%
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                            entry.stockQty <= (entry.reorderLevel || 10)
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                          }`}>
                            <Package className="w-3 h-3" />
                            {entry.stockQty} {entry.unit}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center">
                          {onEditProduct && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1 border-primary-200 dark:border-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                              onClick={() => {
                                onClose();
                                onEditProduct(entry);
                              }}
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {sortedEntries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                        No recorded values found for {productName}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Notice / Tip */}
          <div className="p-3 bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/50 rounded-xl text-xs text-primary-800 dark:text-primary-300 flex items-center justify-between gap-3">
            <span>
              💡 <strong>Billing Note:</strong> During billing in the Sales POS, the system allows dispensing from whichever active rate has available stock.
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/80">
          <Button onClick={onClose} className="px-6">
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}
