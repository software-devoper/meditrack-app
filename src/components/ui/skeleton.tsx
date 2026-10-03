import * as React from "react";
import { cn } from "@/src/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/60",
        className
      )}
      {...props}
    />
  );
}

/**
 * Composite table skeleton rows for tables like Products, Invoices, Purchases
 */
function TableSkeleton({
  rows = 5,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className={cn("border-b border-slate-100 dark:border-slate-800", className)}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-4 py-3.5">
              <Skeleton
                className={cn(
                  "h-4",
                  cIdx === 0 ? "w-16" : cIdx === 1 ? "w-3/4 max-w-[200px]" : "w-20 mx-auto"
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Composite card skeleton for metrics, dashboard widgets, and overview summaries
 */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-3 w-44" />
    </div>
  );
}

/**
 * Composite list item skeleton for patient, doctor, and supplier sidebar lists
 */
function ListItemSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2 p-1", className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-3"
        >
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, TableSkeleton, CardSkeleton, ListItemSkeleton };
