import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, runTransaction, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardContent, Button } from '../../components/ui';
import { FileText, Calendar, User, IndianRupee, Clock, Edit2, Printer, Image, FileDown, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { EditSaleModal } from './EditSaleModal';
import { toast } from 'sonner';

import { useAlertModal } from '../../context/AlertModalContext';

export function SalesHistoryTab({ 
  onPrint, 
  onDownloadJpg, 
  onDownloadPdf 
}: { 
  onPrint?: (sale: any) => void;
  onDownloadJpg?: (sale: any) => void | Promise<void>;
  onDownloadPdf?: (sale: any) => void | Promise<void>;
}) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [exportingState, setExportingState] = useState<{ id: string; type: 'jpg' | 'pdf' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm } = useAlertModal();

  const handleJpgClick = async (sale: any) => {
    if (!onDownloadJpg || exportingState) return;
    setExportingState({ id: sale.id, type: 'jpg' });
    try {
      await onDownloadJpg(sale);
    } finally {
      setExportingState(null);
    }
  };

  const handlePdfClick = async (sale: any) => {
    if (!onDownloadPdf || exportingState) return;
    setExportingState({ id: sale.id, type: 'pdf' });
    try {
      await onDownloadPdf(sale);
    } finally {
      setExportingState(null);
    }
  };

  const handleDeleteSale = async (sale: any) => {
    if (!db) return;
    
    const isConfirmed = await confirm({
      title: 'Delete Bill',
      message: `Are you sure you want to delete bill ${sale.invoiceNo}? This will revert any inventory stock deductions.`,
      confirmText: 'Delete Bill',
      variant: 'danger'
    });

    if (!isConfirmed) return;

    setDeletingId(sale.id);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Revert stock for inventory items
        if (Array.isArray(sale.items)) {
          for (const item of sale.items) {
            // Skip custom items as they never deducted stock
            if (item.isCustom || (item.productId && item.productId.startsWith('custom_'))) {
              continue;
            }

            const productRef = doc(db!, 'products', item.productId);
            const productDoc = await transaction.get(productRef);

            if (productDoc.exists()) {
              const currentStock = productDoc.data().stockQty || 0;
              const newStock = currentStock + item.qty;
              
              // Update product stock
              transaction.update(productRef, { 
                stockQty: newStock,
                updatedAt: serverTimestamp() 
              });

              // Add stock ledger entry for the reversal
              const ledgerRef = doc(collection(db!, 'stockLedger'));
              transaction.set(ledgerRef, {
                productId: item.productId,
                productName: item.name,
                type: 'sale_deletion',
                change: item.qty,
                previousStock: currentStock,
                newStock: newStock,
                referenceId: sale.id,
                referenceNo: sale.invoiceNo,
                date: Date.now(),
                createdAt: serverTimestamp()
              });
            }
          }
        }

        // 2. Delete the sale document
        const saleRef = doc(db!, 'sales', sale.id);
        transaction.delete(saleRef);
      });

      toast.success(`Bill ${sale.invoiceNo} deleted successfully and stock reverted.`);
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error('Failed to delete bill. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setSales(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isValidForReturn = (date: number) => {
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - date) <= ONE_WEEK_MS;
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading sales history...</div>;
  }

  if (sales.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
          <FileText className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100">No sales history</p>
          <p className="text-sm">You haven't made any sales yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sales.map((sale) => {
        const valid = isValidForReturn(sale.date);
        const validTillDate = sale.date + (7 * 24 * 60 * 60 * 1000);
        
        return (
          <Card key={sale.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{sale.invoiceNo}</span>
                  {valid ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Valid for Return
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:text-slate-400 dark:bg-slate-800 dark:text-slate-400">
                      Expired
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {sale.patientName || sale.customerName || 'Walk-in Patient'}
                    {sale.billTo && sale.billTo.trim() && sale.billTo.trim() !== (sale.patientName || sale.customerName) && (
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                        (Bill To: {sale.billTo})
                      </span>
                    )}
                    {(sale.patientAddress || sale.customerAddress) && (sale.patientAddress || sale.customerAddress) !== 'Local' && (sale.patientAddress || sale.customerAddress) !== 'N/A' && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">({sale.patientAddress || sale.customerAddress})</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {format(sale.date, 'dd MMM yyyy, hh:mm a')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4" />
                    {sale.paymentMode}
                  </span>
                  <span className={`flex items-center gap-1.5 font-medium ${valid ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                    <Clock className="w-4 h-4" />
                    Valid till: {format(validTillDate, 'dd MMM yyyy')}
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{sale.grandTotal?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {sale.items?.length || 0} items
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSale(sale)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  {onDownloadJpg && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleJpgClick(sale)} 
                      disabled={!!exportingState}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      {exportingState?.id === sale.id && exportingState?.type === 'jpg' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Image className="w-4 h-4 mr-2" />
                      )}
                      JPG
                    </Button>
                  )}
                  {onDownloadPdf && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePdfClick(sale)} 
                      disabled={!!exportingState}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {exportingState?.id === sale.id && exportingState?.type === 'pdf' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileDown className="w-4 h-4 mr-2" />
                      )}
                      PDF
                    </Button>
                  )}
                  {onPrint && (
                    <Button variant="outline" size="sm" onClick={() => onPrint(sale)}>
                      <Printer className="w-4 h-4 mr-2" /> Print
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeleteSale(sale)}
                    disabled={deletingId === sale.id}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    {deletingId === sale.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-12 gap-4 text-base font-bold text-slate-800 dark:text-slate-100 bg-slate-200/80 dark:bg-slate-800 py-2.5 px-3 rounded-md mb-2 border border-slate-300 dark:border-slate-700 shadow-sm uppercase tracking-wide">
                <div className="col-span-5 text-center">Product</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-3 text-center">Total</div>
              </div>
              <div className="space-y-1">
                {sale.items?.map((item: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 text-sm text-slate-700 dark:text-slate-300 px-3 py-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 items-center">
                    <div className="col-span-5 font-semibold text-center truncate" title={item.name}>{item.name}</div>
                    <div className="col-span-2 text-center">{item.qty} {item.unit}</div>
                    <div className="col-span-2 text-center">₹{item.rate?.toFixed(2)}</div>
                    <div className="col-span-3 text-center font-bold text-slate-900 dark:text-slate-100">₹{((item.qty * item.rate) * (1 - (item.discount || 0)/100)).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })}
      
      {editingSale && (
        <EditSaleModal sale={editingSale} onClose={() => setEditingSale(null)} />
      )}
    </div>
  );
}
