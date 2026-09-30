import { ProductsTab } from './ProductsTab';

export function Purchase() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Product Inventory & Stock</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your product catalog, stock levels, and pricing.</p>
        </div>
      </div>

      <ProductsTab />
    </div>
  );
}
