import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from '../hooks/useToast';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';

const COOLDOWN_MS = 2000;

export default function BarcodeScanner({ cart, onClose }) {
  const toast = useToast();
  const scannerId = useId();
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownActive, setCooldownActive] = useState(false);

  // NEW: camera device management. Some laptops report zero "environment"
  // (back) cameras, which used to make the old facingMode:'environment'
  // request fail silently or grab the wrong device. We now enumerate all
  // available cameras and let the user pick if there's more than one.
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const beginCooldown = () => {
    cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
    setCooldownActive(true);
    window.setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
  };

  const canProcess = () => Date.now() >= cooldownUntilRef.current;

  const stopScannerSafely = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        isScanningRef.current = false;
      } catch (err) {
        console.warn('Barcode scanner stop failed:', err);
        isScanningRef.current = false;
      }
    }
  };

  const addItemFromBarcode = async (barcode) => {
    const trimmedBarcode = barcode?.trim();
    if (!trimmedBarcode) return;

    if (!canProcess()) {
      return;
    }

    beginCooldown();
    setErrorMessage('');

    try {
      const { data } = await api.get(`/menu-items/barcode/${encodeURIComponent(trimmedBarcode)}`);
      const item = data;
      cart.addItem(
        {
          ...item,
          imageUrl: item.image_url,
          price: item.price,
          flashDiscountPrice: item.price,
          flashDiscountPercent: 0,
        },
        []
      );
      toast.success(`${item.name} added — ${formatCurrency(item.price)}`);
      if (typeof onClose === 'function') {
        await stopScannerSafely();
        onClose();
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Product not found');
      } else if (err?.response?.status === 400) {
        toast.error(err.response?.data?.message || 'Item currently unavailable');
      } else {
        toast.error('Unable to look up barcode');
      }
    }
  };

  // Step 1: enumerate cameras once on mount so we know what's actually
  // available on this device instead of blindly requesting "environment".
  useEffect(() => {
    let mounted = true;

    const loadCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        if (devices && devices.length) {
          setCameras(devices);
          // Prefer a camera whose label hints it's a back/rear camera;
          // otherwise just default to the first one found.
          const backCamera = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedCameraId((backCamera || devices[0]).id);
        } else {
          setErrorMessage('No camera found on this device. Use manual entry instead.');
          setIsScanning(false);
        }
      } catch (err) {
        if (mounted) {
          setErrorMessage('Camera permission denied or unavailable. Use manual entry instead.');
          setIsScanning(false);
        }
      }
    };

    loadCameras();

    return () => {
      mounted = false;
    };
  }, []);

  // Step 2: start/restart the scanner whenever the selected camera changes.
  useEffect(() => {
    if (!selectedCameraId) return;

    let mounted = true;
    let html5QrCode = null;

    const startWithConfig = async (cameraTarget) => {
      const scannerConfig = {
        fps: 10,
        // A wider, shorter box matches typical barcode proportions better
        // than a square box and makes alignment easier for the user.
        qrbox: { width: 280, height: 120 },
        aspectRatio: 1.777,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      };

      await html5QrCode.start(
        cameraTarget,
        scannerConfig,
        async (decodedText) => {
          if (!mounted || !canProcess()) return;
          await addItemFromBarcode(decodedText);
          setIsScanning(true);
        },
        () => {
          // Per-frame "not found" callback — expected constantly while
          // no barcode is in view, so we intentionally do nothing here.
        }
      );
    };

    const initializeScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode(scannerId.replace(/:/g, ''));
        scannerRef.current = html5QrCode;

        try {
          // Try the specific selected camera first.
          await startWithConfig({ deviceId: { exact: selectedCameraId } });
        } catch (specificErr) {
          console.warn('Selected camera failed, falling back to ideal environment camera:', specificErr);
          // Fallback: some browsers reject deviceId constraints in odd
          // ways. Falling back to a soft "ideal" facingMode means the
          // browser will use the back camera if one exists, and quietly
          // use whatever camera is available (e.g. the laptop webcam)
          // otherwise — instead of failing outright like a hard
          // facingMode: 'environment' constraint would.
          await startWithConfig({ facingMode: { ideal: 'environment' } });
        }

        if (mounted) {
          isScanningRef.current = true;
          setIsScanning(true);
          setErrorMessage('');
        }
      } catch (err) {
        if (mounted) {
          isScanningRef.current = false;
          setIsScanning(false);
          setErrorMessage('Camera access is unavailable. Try manual entry instead.');
        }
      }
    };

    initializeScanner();

    return () => {
      mounted = false;
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current
          .stop()
          .catch((err) => console.warn('Barcode scanner cleanup stop failed:', err))
          .finally(() => {
            isScanningRef.current = false;
          });
      }
    };
  }, [scannerId, selectedCameraId]);

  const handleManualAdd = async (event) => {
    event.preventDefault();
    if (!canProcess()) return;
    await addItemFromBarcode(manualBarcode);
    setManualBarcode('');
  };

  const handleCameraChange = async (event) => {
    const nextId = event.target.value;
    await stopScannerSafely();
    setSelectedCameraId(nextId);
  };

  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-forest">Barcode scanner</h3>
        <div className="flex items-center gap-2">
          {cooldownActive && (
            <span className="text-xs font-medium text-amber-600">Cooling down…</span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={async () => {
                await stopScannerSafely();
                onClose();
              }}
              className="rounded-lg border border-forest/15 px-3 py-1.5 text-sm font-semibold text-forest"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {cameras.length > 1 && (
        <div className="mb-2">
          <label className="mb-1 block text-xs font-medium text-forest/60">
            Camera
          </label>
          <select
            value={selectedCameraId || ''}
            onChange={handleCameraChange}
            className="w-full rounded-lg border border-forest/15 bg-cream px-3 py-1.5 text-sm outline-none"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Camera ${cam.id.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-3 overflow-hidden rounded-xl border border-forest/10 bg-cream">
        <div id={scannerId.replace(/:/g, '')} className="h-48 w-full" />
      </div>

      <p className="mb-2 text-xs text-forest/50">
        Line up the barcode lines fully inside the box — hold steady, good lighting, no glare.
      </p>

      {!isScanning && (
        <p className="mb-2 text-sm text-amber-600">{errorMessage}</p>
      )}

      <form onSubmit={handleManualAdd} className="flex gap-2">
        <input
          type="text"
          value={manualBarcode}
          onChange={(event) => setManualBarcode(event.target.value)}
          placeholder="Enter barcode"
          className="flex-1 rounded-lg border border-forest/15 bg-cream px-3 py-2 text-sm outline-none ring-0"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white"
        >
          Add
        </button>
      </form>
    </div>
  );
}