import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NewSaleTab } from './NewSaleTab';
import { SalesHistoryTab } from './SalesHistoryTab';
import { ShoppingCart, FileText } from 'lucide-react';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { PremiumInvoicePrintTemplate } from './PremiumInvoicePrintTemplate';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

export function Sales() {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [saleToPrint, setSaleToPrint] = useState<any>(null);
  const [captureSale, setCaptureSale] = useState<any>(null);

  const handlePrint = (sale: any) => {
    setSaleToPrint(sale);
    const invoiceTitle = sale?.invoiceNo ? sale.invoiceNo : 'Invoice';
    document.title = invoiceTitle;

    setTimeout(() => {
      window.print();
      // Fallback timer to restore title if afterprint doesn't fire
      setTimeout(() => {
        document.title = 'MediTrack Pro';
      }, 1500);
    }, 200);
  };

  useEffect(() => {
    const onAfterPrint = () => {
      setSaleToPrint(null);
      document.title = 'MediTrack Pro';
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const captureElement = async (sale: any): Promise<HTMLCanvasElement> => {
    return new Promise<HTMLCanvasElement>((resolve, reject) => {
      setCaptureSale(sale);
      
      setTimeout(async () => {
        try {
          const container = document.getElementById('invoice-capture-area');
          if (!container) throw new Error("Invoice capture container not found");
          
          const targetEl = (container.firstElementChild as HTMLElement) || container;
          
          // Ensure all images are fully loaded before capturing
          const images = Array.from(targetEl.querySelectorAll('img'));
          await Promise.all(
            images.map(img => {
              if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
              return new Promise(res => {
                img.onload = () => res(null);
                img.onerror = () => res(null);
              });
            })
          );

          const targetWidth = targetEl.offsetWidth || 772;
          const targetHeight = targetEl.offsetHeight;

          const canvas = await html2canvas(targetEl, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: targetWidth,
            height: targetHeight,
            windowWidth: 1200,
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            logging: false,
          });

          resolve(canvas);
        } catch (err) {
          reject(err);
        } finally {
          setCaptureSale(null);
        }
      }, 350);
    });
  };

  const handleDownloadJpg = async (sale: any) => {
    const toastId = toast.loading(`Generating JPG for ${sale.invoiceNo || 'invoice'}...`);
    try {
      const canvas = await captureElement(sale);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate JPG file", { id: toastId });
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${sale.invoiceNo || 'invoice'}.jpg`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 500);
        toast.success(`Downloaded ${sale.invoiceNo || 'invoice'}.jpg`, { id: toastId });
      }, 'image/jpeg', 0.98);
    } catch (err: any) {
      console.error("Error generating JPG:", err);
      toast.error(err?.message || "Failed to generate JPG", { id: toastId });
    }
  };

  const handleDownloadPdf = async (sale: any) => {
    const toastId = toast.loading(`Generating PDF for ${sale.invoiceNo || 'invoice'}...`);
    try {
      const canvas = await captureElement(sale);
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      // Calculate content dimensions in mm
      // Invoice template width is 204mm
      const contentWidthMm = 204;
      const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;
      
      // Snug PDF sizing with minimal margins (1mm top, 1mm bottom, 3mm sides)
      // Removes all excess upper and lower whitespace from the page
      const pageMarginTopMm = 1;
      const pageMarginLeftMm = 3;
      const pageWidthMm = contentWidthMm + (pageMarginLeftMm * 2); // 210mm
      const pageHeightMm = Math.ceil(contentHeightMm + (pageMarginTopMm * 2));
      
      const isLandscape = pageWidthMm >= pageHeightMm;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pageWidthMm, pageHeightMm],
      });

      pdf.addImage(imgData, 'JPEG', pageMarginLeftMm, pageMarginTopMm, contentWidthMm, contentHeightMm);

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.download = `${sale.invoiceNo || 'invoice'}.pdf`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 500);
      toast.success(`Downloaded ${sale.invoiceNo || 'invoice'}.pdf`, { id: toastId });
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      toast.error(err?.message || "Failed to generate PDF", { id: toastId });
    }
  };

  return (
    <>
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Sales & Billing</h2>
            <p className="text-slate-500 dark:text-slate-400">Create new sales and view billing history.</p>
          </div>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg w-full max-w-sm">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'new' ? 'bg-white dark:bg-slate-700 shadow text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('new')}
          >
            <ShoppingCart className="w-4 h-4" /> New Sale
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('history')}
          >
            <FileText className="w-4 h-4" /> Sales History
          </button>
        </div>
        {activeTab === 'new' ? (
          <NewSaleTab onPrint={handlePrint} />
        ) : (
          <SalesHistoryTab 
            onPrint={handlePrint} 
            onDownloadJpg={handleDownloadJpg}
            onDownloadPdf={handleDownloadPdf}
          />
        )}
      </div>

      {/* Off-screen capture area for JPG and PDF export (rendered at exact 0,0 behind viewport) */}
      <div 
        id="invoice-capture-area" 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '204mm',
          minWidth: '204mm',
          maxWidth: '204mm',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1,
          visibility: captureSale ? 'visible' : 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {captureSale && (
          captureSale.templateType === 'premium' ? (
            <PremiumInvoicePrintTemplate sale={captureSale} />
          ) : (
            <InvoicePrintTemplate sale={captureSale} />
          )
        )}
      </div>

      {/* Dedicated print portal mounted directly on document.body outside of #root */}
      {saleToPrint && createPortal(
        <div id="print-root">
          {saleToPrint.templateType === 'premium' ? (
            <PremiumInvoicePrintTemplate sale={saleToPrint} />
          ) : (
            <InvoicePrintTemplate sale={saleToPrint} />
          )}
        </div>,
        document.body
      )}
    </>
  );
}
