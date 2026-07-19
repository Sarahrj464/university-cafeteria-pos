import { useRef, useState, useEffect } from 'react';
import { Printer, FileText, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Button from './ui/Button';
import Receipt from './pos/Receipt';
import { useToast } from '../hooks/useToast';

export default function ReceiptModal({ order, cart, cashierName, onNewOrder, isOpen }) {
  const toast = useToast();
  const receiptRef = useRef(null);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('printing-receipt');
    }
  }, [isOpen]);

  if (!isOpen || !order || !cart) return null;

  const handlePrint = () => {
    setPrinting(true);
    const cleanup = () => {
      document.body.classList.remove('printing-receipt');
      setPrinting(false);
    };

    document.body.classList.add('printing-receipt');
    window.print();
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const target = receiptRef.current;
      if (!target) {
        toast.error('Receipt preview is unavailable.');
        return;
      }

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pageWidth - 16;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 8, 8, pdfWidth, pdfHeight);
      pdf.save(`receipt-${order.orderNumber || order.order_number || order.id || 'receipt'}.pdf`);
    } catch (err) {
      toast.error('Failed to generate PDF');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-cream shadow-2xl border border-forest/10">
        <div className="border-b border-forest/10 bg-forest px-6 py-5 text-cream">
          <div className="flex items-center gap-3">
            <CheckCircle size={28} className="text-success" />
            <div>
              <h2 className="text-2xl font-bold">Payment Successful!</h2>
              <p className="text-sm text-cream/80">Receipt is ready for print or download.</p>
            </div>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          <div className="rounded-3xl border border-forest/10 bg-white p-5 shadow-sm">
            <Receipt ref={receiptRef} order={order} cart={cart} cashierName={cashierName} />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-forest/10 bg-forest/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 w-full">
            <Button
              variant="primary"
              className="flex-1 py-3 gap-2"
              onClick={handlePrint}
              disabled={printing}
            >
              <Printer size={18} />
              {printing ? 'Printing…' : '🖨️ Print Receipt'}
            </Button>
            <Button
              variant="primary"
              className="flex-1 py-3 gap-2"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              <FileText size={18} />
              {downloading ? 'Downloading…' : '📄 Download PDF'}
            </Button>
            <Button
              variant="accent"
              className="flex-1 py-3"
              onClick={onNewOrder}
            >
              ✕ New Order
            </Button>
          </div>
          <p className="text-xs text-forest/70 sm:text-right">
            Note: This dialog cannot be closed by clicking outside. Use the buttons above.
          </p>
        </div>
      </div>
    </div>
  );
}
