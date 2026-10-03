import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card, CardContent, TableSkeleton } from "../../components/ui";
import { formatCurrency } from "../../lib/utils";
import { format } from "date-fns";
import { Purchase } from "../../types";

export function HistoryTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'purchases'));
    const unsub = onSnapshot(q, (snapshot) => {
      const records: Purchase[] = [];
      snapshot.forEach(d => records.push({ id: d.id, ...d.data() } as Purchase));
      setPurchases(records.sort((a,b) => b.date - a.date));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide border-b-2 border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  <th className="px-4 py-3.5 text-center">Date & Time</th>
                  <th className="px-4 py-3.5 text-center">Supplier Name</th>
                  <th className="px-4 py-3.5 text-center">Items Purchased</th>
                  <th className="px-4 py-3.5 text-center">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <TableSkeleton rows={5} cols={4} />
                ) : (
                  purchases.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors border-b dark:border-slate-800 last:border-0">
                      <td className="px-4 py-3 text-center font-medium">
                        {format(new Date(record.date), 'MMM dd, yyyy hh:mm a')}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100">{record.supplierName}</td>
                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{record.items.length} items</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(record.grandTotal)}
                      </td>
                    </tr>
                  ))
                )}
                {purchases.length === 0 && !loading && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">No purchases recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
