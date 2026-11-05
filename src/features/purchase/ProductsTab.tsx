import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product } from '../../types';
import { Card, CardContent, Button, Input, Badge, TableSkeleton } from '../../components/ui';
import { Search, Plus, Edit2, Trash2, AlertTriangle, ShieldAlert, Layers } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ProductFormModal } from './ProductFormModal';
import { ProductValuesModal } from './ProductValuesModal';
import { useAlertModal } from '../../context/AlertModalContext';

export function ProductsTab() {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterMultipleValuesOnly, setFilterMultipleValuesOnly] = useState(false);
  const [selectedProductForValues, setSelectedProductForValues] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [initialSupplier, setInitialSupplier] = useState<any>(null);
  const { confirm, alert: showAlert } = useAlertModal();

  useEffect(() => {
    if (location.state?.supplier) {
      setInitialSupplier(location.state.supplier);
      setEditingProduct(undefined);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(d => {
        prods.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(prods);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDeleteProduct = async (product: Product) => {
    if (!product || !product.id || !db) return;
    const isConfirmed = await confirm({
      title: "Delete Inventory Item?",
      message: `Are you sure you want to delete "${product.name}"? This action will permanently remove this medicine record and its inventory history.`,
      confirmText: "Yes, Delete Product",
      cancelText: "Cancel",
      variant: "danger",
      eyebrow: "INVENTORY MANAGEMENT",
      detail: `Category: ${product.category || 'General'} • Current Stock: ${product.stockQty} ${product.unit}`
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'products', product.id));
        toast.success(`Product "${product.name}" permanently deleted`);
      } catch (err: any) {
        console.error("Delete product error:", err);
        await showAlert({
          title: "Deletion Failed",
          message: `The system could not remove "${product.name}" from the inventory records.`,
          problem: err.message || "Database permission or connectivity issue",
          variant: "danger",
          eyebrow: "SYSTEM ERROR",
          confirmText: "Back to Inventory"
        });
      }
    }
  };

  const getStatusBadge = (product: Product) => {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">Available</span>;
  };

  const multiValueProductNames = Array.from(new Set(
    products
      .filter(p => products.filter(o => (o?.name || '').trim().toLowerCase() === (p?.name || '').trim().toLowerCase()).length > 1)
      .map(p => (p?.name || '').trim().toLowerCase())
  ));

  const filteredProducts = products.filter(p => {
    const s = (searchTerm || '').toLowerCase();
    const pName = (p?.name || '').toLowerCase();
    const pGeneric = (p?.genericName || '').toLowerCase();
    const matchesSearch = pName.includes(s) || pGeneric.includes(s);
    if (!matchesSearch) return false;
    
    if (filterMultipleValuesOnly) {
      const pNameTrimmed = (p?.name || '').trim().toLowerCase();
      const count = products.filter(o => (o?.name || '').trim().toLowerCase() === pNameTrimmed).length;
      if (count <= 1) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center gap-2">
        <Button onClick={() => { setEditingProduct(undefined); setIsModalOpen(true); }} className="gap-2 shadow-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white">
          <Plus className="w-4 h-4" /> Add Multiple Products (Row-wise)
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by product or generic name..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {multiValueProductNames.length > 0 && (
                <Button
                  type="button"
                  variant={filterMultipleValuesOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilterMultipleValuesOnly(prev => !prev);
                  }}
                  className={`gap-1.5 text-xs font-semibold ${
                    filterMultipleValuesOnly 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                      : 'border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {filterMultipleValuesOnly ? 'Showing Multiple Values Only' : `Different Values (${multiValueProductNames.length})`}
                </Button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm tracking-wide border-b-2 border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  <th className="px-4 py-3.5 text-center">Product Name</th>
                  <th className="px-4 py-3.5 text-center">Date & Time</th>
                  <th className="px-4 py-3.5 text-center">Pricing (MRP)</th>
                  <th className="px-4 py-3.5 text-center">Stock Qty</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  filteredProducts.map(product => {
                    const matchingCount = products.filter(
                      p => (p?.name || '').trim().toLowerCase() === (product?.name || '').trim().toLowerCase()
                    ).length;
                    const hasMultipleValues = matchingCount > 1;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors border-b dark:border-slate-800 last:border-0">
                        <td className="px-4 py-3 text-center">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</p>
                          
                          {hasMultipleValues && (
                            <div className="mt-1.5 flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductForValues(product.name);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all shadow-xs cursor-pointer active:scale-95"
                                title="Click to view all rates & suppliers for this product"
                              >
                                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>{matchingCount} Different Values</span>
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="font-medium">{format(new Date(product.createdAt || product.updatedAt || Date.now()), 'dd-MM-yyyy')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(product.createdAt || product.updatedAt || Date.now()), 'hh:mm:ss a')}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(product.mrp)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Buy: {formatCurrency(product.purchasePrice)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold">
                            {product.stockQty} {product.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">{getStatusBadge(product)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setSelectedProductForValues(product.name)}
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40" 
                              title={hasMultipleValues ? `View ${matchingCount} Different Values` : "View Values & Pricing Breakdown"}
                            >
                              <Layers className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} title="Edit">
                              <Edit2 className="w-4 h-4 text-primary-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product)} className="text-red-600 hover:text-red-700" title="Delete">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {filteredProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {isModalOpen && (
        <ProductFormModal 
          product={editingProduct}
          initialSupplier={initialSupplier}
          onClose={() => {
            setIsModalOpen(false);
            setInitialSupplier(null);
          }} 
        />
      )}

      {/* Different Values Modal */}
      {selectedProductForValues && (
        <ProductValuesModal
          productName={selectedProductForValues}
          allProducts={products}
          onClose={() => setSelectedProductForValues(null)}
          onEditProduct={(prodToEdit) => {
            setSelectedProductForValues(null);
            setEditingProduct(prodToEdit);
            setIsModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
