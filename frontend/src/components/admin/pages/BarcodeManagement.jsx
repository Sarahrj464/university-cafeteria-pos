import React, { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../utils/currency';
import api from '../../../services/api';

function BarcodeSvg({ value, height = 50, width = 1.6, fontSize = 12 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        height,
        width,
        fontSize,
        margin: 6,
        displayValue: true,
        lineColor: '#000000',
        background: '#ffffff',
      });
    } catch (err) {
      console.error('Failed to render barcode for value:', value, err);
    }
  }, [value, height, width, fontSize]);

  if (!value) {
    return <span className="text-xs text-forest/40">No barcode</span>;
  }

  return (
    <svg
      ref={svgRef}
      style={{
        display: 'block',
        maxWidth: '100%',
      }}
    />
  );
}

export default function BarcodeManagement() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/menu-items/barcodes');
      setItems(data?.data?.items || []);
    } catch (err) {
      toast.error('Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRegenerate = async (id) => {
    setRegeneratingId(id);
    try {
      const { data } = await api.post(`/admin/menu-items/${id}/barcode/regenerate`);
      const updated = data?.data?.item;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, barcode: updated.barcode } : item))
      );
      toast.success(`New barcode generated for ${updated.name}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to regenerate barcode');
    } finally {
      setRegeneratingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.barcode || '').toLowerCase().includes(term)
    );
  }, [items, search]);

  // ── FIXED PRINT HANDLER ──────────────────────────────────────────
  // Opens a new browser window containing ONLY the barcode grid so
  // that the @media print stylesheet never has to fight the main app
  // layout. This is the most reliable cross-browser approach.
  const handlePrint = () => {
    const printItems = items.filter((i) => i.barcode);
    if (printItems.length === 0) {
      toast.error('No barcodes to print');
      return;
    }

    setIsPrinting(true);

    // Build SVG data-urls for every item synchronously using JsBarcode
    // on a temporary <svg> element so we can embed them as static markup
    // in the new window — no React rendering needed there.
    const barcodeCards = printItems.map((item) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      try {
        JsBarcode(svg, item.barcode, {
          format: 'CODE128',
          height: 60,
          width: 1.8,
          fontSize: 13,
          margin: 8,
          displayValue: true,
          lineColor: '#000000',
          background: '#ffffff',
        });
      } catch (e) {
        console.error('Barcode render error for', item.barcode, e);
      }
      const svgHtml = new XMLSerializer().serializeToString(svg);

      return `
        <div class="card">
          <p class="name">${item.name}</p>
          <p class="price">${formatCurrency(item.price)}</p>
          ${svgHtml}
          <p class="code">${item.barcode}</p>
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Barcodes — QuickByte Café POS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: #fff;
      padding: 10mm;
    }
    h1 {
      text-align: center;
      font-size: 18px;
      margin-bottom: 6mm;
      color: #1B4332;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6mm;
    }
    .card {
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .name {
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      color: #1B4332;
      margin-bottom: 3px;
    }
    .price {
      font-size: 10px;
      color: #E76F00;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .card svg {
      max-width: 100%;
      height: auto;
    }
    .code {
      font-size: 9px;
      color: #666;
      margin-top: 3px;
      font-family: monospace;
    }
    @media print {
      @page { margin: 8mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>QuickByte Café POS — Product Barcodes</h1>
  <div class="grid">
    ${barcodeCards}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 300);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Pop-up blocked! Please allow pop-ups for this site.');
      setIsPrinting(false);
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setIsPrinting(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest">Barcode Management</h1>
          <p className="text-sm text-forest/60">
            View, regenerate, and print barcodes for menu items.
          </p>
        </div>
        <button
          onClick={handlePrint}
          disabled={isPrinting || isLoading}
          className="flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-lg hover:bg-forest/90 font-bold disabled:opacity-60"
        >
          <Printer size={18} />
          {isPrinting ? 'Preparing...' : 'Print All Barcodes'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-forest/40" size={20} />
        <input
          type="text"
          placeholder="Search by item name or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-forest/20 rounded-lg focus:outline-none focus:border-orange"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-forest/10 bg-cream">
              <th className="py-3 px-4 text-left text-forest font-bold">#</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Item</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Price</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Barcode</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Code</th>
              <th className="py-3 px-4 text-left text-forest font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-forest/60">
                  Loading menu items...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-forest/60">
                  No items found
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr key={item.id} className="border-b border-forest/5 hover:bg-cream">
                  <td className="py-3 px-4 text-forest/40 text-sm">{index + 1}</td>
                  <td className="py-3 px-4 font-bold text-forest">{item.name}</td>
                  <td className="py-3 px-4 text-orange font-bold">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-4">
                    <BarcodeSvg value={item.barcode} height={35} width={1.3} fontSize={10} />
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-forest/60 bg-forest/5 px-2 py-1 rounded">
                      {item.barcode || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleRegenerate(item.id)}
                      disabled={regeneratingId === item.id}
                      className="flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-orange disabled:opacity-50"
                    >
                      <RefreshCw
                        size={14}
                        className={regeneratingId === item.id ? 'animate-spin' : ''}
                      />
                      {regeneratingId === item.id ? 'Generating...' : 'Regenerate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}