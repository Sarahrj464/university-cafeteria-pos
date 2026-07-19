import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Camera, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from './ui/Button';
import { lookupStudent } from '../services/students';
import { formatCurrency } from '../utils/currency';
import { formatDateTime } from '../utils/timezone';

const planLabels = {
  unlimited: 'Unlimited Meal Plan',
  '14_meal': '14-Meal Plan',
  '7_meal': '7-Meal Plan',
  block_50: 'Block 50',
  dining_dollars: 'PKR Balance',
};

const getPlanLabel = (type) => planLabels[type] || type;

function getCameraErrorMessage(err) {
  const name = err?.name || '';
  const message = err?.message || '';

  if (name === 'NotAllowedError' || /permission/i.test(message)) {
    return 'Camera permission denied. Click the camera icon in your browser address bar to allow access, then try again.';
  }
  if (name === 'NotFoundError' || /not found/i.test(message)) {
    return 'No camera detected. Connect a webcam or use manual ID entry below.';
  }
  if (name === 'NotReadableError' || /in use/i.test(message)) {
    return 'Camera is busy. Close other apps using the camera and try again.';
  }
  if (!window.isSecureContext) {
    return 'Camera requires HTTPS or localhost. Use manual entry on this connection.';
  }
  return message || 'Unable to start camera. Use manual entry below.';
}

async function pickCameraId(devices) {
  if (!devices?.length) return null;

  const backCamera = devices.find((device) =>
    /back|rear|environment|world/i.test(device.label)
  );
  if (backCamera) return backCamera.id;

  const nonFront = devices.find(
    (device) => !/front|user|facetime|selfie/i.test(device.label)
  );
  if (nonFront) return nonFront.id;

  return devices[devices.length - 1].id;
}

export default function StudentIDScanner({ onStudentFound, orderTotal, initialStudentId = '' }) {
  const scannerElementId = useId().replace(/:/g, '');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [studentData, setStudentData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanHint, setScanHint] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [startingCamera, setStartingCamera] = useState(false);

  const html5QrcodeRef = useRef(null);
  const barcodeTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      const scanner = html5QrcodeRef.current;
      html5QrcodeRef.current = null;

      try {
        await scanner.stop();
      } catch (err) {
        console.warn('Scanner stop warning:', err);
      }

      try {
        await scanner.clear();
      } catch {
        // Element may already be removed
      }
    }
  }, []);

  const handleLookup = useCallback(
    async (lookupValue) => {
      const trimmed = lookupValue?.trim();
      if (!trimmed) {
        setErrorMessage('Enter a student ID');
        return;
      }

      setLoading(true);
      setErrorMessage('');
      setCameraError('');

      try {
        const result = await lookupStudent(trimmed);
        if (!result) {
          setErrorMessage('Invalid Student ID');
          setStudentData(null);
          onStudentFound(null);
          return;
        }

        const remaining = parseFloat(result.remainingCredits ?? result.remaining_credits ?? 0);
        const walletBalance = parseFloat(result.walletBalance ?? result.wallet_balance ?? 0);
        const expiresAt = result.expiresAt || result.expires_at;

        if (expiresAt && new Date(expiresAt) < new Date()) {
          setErrorMessage(`Meal plan expired on ${formatDateTime(expiresAt, { dateStyle: 'medium', timeStyle: 'short' })}`);
          setStudentData(null);
          onStudentFound(null);
          return;
        }

        const shortfall = remaining < orderTotal ? orderTotal - remaining : 0;
        const normalized = {
          studentName: result.studentName || result.name,
          studentId: result.studentId || result.student_id || trimmed,
          planType: getPlanLabel(result.planType || result.plan_type),
          remainingCredits: remaining,
          walletBalance,
          expiresAt,
          shortfall,
          sufficient: remaining >= orderTotal,
        };

        setStudentId(normalized.studentId);
        setStudentData(normalized);
        onStudentFound(normalized);
      } catch (err) {
        const apiMessage = err.response?.data?.message;
        setErrorMessage(apiMessage || 'Could not fetch student data, try again');
        setStudentData(null);
        onStudentFound(null);
      } finally {
        setLoading(false);
      }
    },
    [onStudentFound, orderTotal]
  );

  const handleScanSuccess = useCallback(
    async (decodedText) => {
      const value = decodedText?.trim();
      if (!value) return;

      await stopScanner();
      if (isMountedRef.current) {
        setScannerOpen(false);
        setScanHint('');
      }
      await handleLookup(value);
    },
    [handleLookup, stopScanner]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScanner();
      clearTimeout(barcodeTimerRef.current);
    };
  }, [stopScanner]);

  useEffect(() => {
    setStudentId(initialStudentId);
  }, [initialStudentId]);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    let cancelled = false;

    const initCamera = async () => {
      setStartingCamera(true);
      setCameraError('');
      setScanHint('Starting camera...');

      await stopScanner();
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));

      const element = document.getElementById(scannerElementId);
      if (!element || cancelled) {
        setStartingCamera(false);
        return;
      }

      try {
        const scanner = new Html5Qrcode(scannerElementId, { verbose: false });
        html5QrcodeRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight, 260) * 0.75;
            return { width: size, height: size };
          },
          aspectRatio: 1,
        };

        let started = false;

        try {
          const devices = await Html5Qrcode.getCameras();
          const cameraId = await pickCameraId(devices);

          if (cameraId) {
            await scanner.start(cameraId, config, handleScanSuccess, () => {});
            started = true;
          }
        } catch {
          // Fall through to facingMode attempt
        }

        if (!started) {
          try {
            await scanner.start(
              { facingMode: 'environment' },
              config,
              handleScanSuccess,
              () => {}
            );
            started = true;
          } catch {
            await scanner.start(
              { facingMode: 'user' },
              config,
              handleScanSuccess,
              () => {}
            );
          }
        }

        if (!cancelled && isMountedRef.current) {
          setScanHint('Point camera at student QR code on ID card');
          setCameraError('');
        }
      } catch (err) {
        console.error('Camera start failed:', err);
        if (!cancelled && isMountedRef.current) {
          setCameraError(getCameraErrorMessage(err));
          setScannerOpen(false);
          setScanHint('');
        }
        await stopScanner();
      } finally {
        if (!cancelled && isMountedRef.current) {
          setStartingCamera(false);
        }
      }
    };

    const timer = setTimeout(initCamera, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [scannerOpen, scannerElementId, handleScanSuccess, stopScanner]);

  const handleStartScanner = () => {
    setCameraError('');
    setErrorMessage('');
    setScanHint('');
    setScannerOpen(true);
  };

  const handleCloseScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
    setScanHint('');
  };

  const handleInputKeyDown = (event) => {
    const key = event.key;
    const value = key.length === 1 ? key : '';

    if (value) {
      setPendingBarcode((prev) => prev + value);
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
      barcodeTimerRef.current = setTimeout(() => setPendingBarcode(''), 50);
    }

    if (key === 'Enter') {
      event.preventDefault();
      const autoId = pendingBarcode || studentId;
      setPendingBarcode('');
      handleLookup(autoId);
    }
  };

  const renderStudentCard = () => {
    if (!studentData) return null;

    return (
      <div className="mt-4 rounded-2xl border-2 border-emerald-600/30 bg-emerald-50 p-4 text-forest">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">Student Found</p>
            <p className="text-xl font-bold">{studentData.studentName}</p>
          </div>
          <CheckCircle2 className="text-emerald-600" size={32} />
        </div>
        <div className="mt-4 grid gap-2 text-sm text-forest/80">
          <p><span className="font-semibold text-forest">ID:</span> {studentData.studentId}</p>
          <p><span className="font-semibold text-forest">Plan:</span> {studentData.planType}</p>
          <p><span className="font-semibold text-forest">Meal Balance:</span> {formatCurrency(studentData.remainingCredits)}</p>
          <p><span className="font-semibold text-forest">Wallet Balance:</span> {formatCurrency(studentData.walletBalance)}</p>
          <p><span className="font-semibold text-forest">Expires:</span> {studentData.expiresAt ? formatDateTime(studentData.expiresAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</p>
        </div>
        <div className="mt-4">
          {studentData.sufficient ? (
            <p className="text-sm font-semibold text-emerald-700">Meal plan covers this order.</p>
          ) : (
            <div className="rounded-xl bg-red-100 p-3 text-sm text-red-800">
              <p className="font-semibold">Insufficient balance!</p>
              <p>{formatCurrency(studentData.shortfall)} short.</p>
              <p>Use Cash or Card for the remaining amount.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-forest/20 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-forest">Scan Student ID Card</h3>
          <p className="text-sm text-forest/70">Use QR scan or manual barcode entry.</p>
        </div>

        <div className="space-y-3 rounded-3xl border border-forest/10 bg-forest/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-forest">
              <Camera size={20} />
              <span className="font-semibold">Camera scan</span>
            </div>
            <Button
              variant="accent"
              onClick={scannerOpen ? handleCloseScanner : handleStartScanner}
              disabled={startingCamera}
            >
              <Camera size={16} />
              {scannerOpen ? 'Stop Scan' : startingCamera ? 'Starting...' : 'Scan ID'}
            </Button>
          </div>

          {scannerOpen && (
            <div className="relative overflow-hidden rounded-3xl border border-forest/20 bg-black">
              <div
                id={scannerElementId}
                className="min-h-[256px] w-full [&>video]:rounded-2xl [&>video]:w-full [&>video]:object-cover"
              />
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-forest shadow-lg"
                onClick={handleCloseScanner}
                aria-label="Close scanner"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2 text-center text-sm text-cream">
                {startingCamera ? 'Starting camera...' : scanHint || 'Scanning...'}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-3xl border border-forest/10 bg-white p-3">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="STU-2024-001"
              className="w-full rounded-xl border border-forest/20 px-4 py-3 text-sm text-forest focus:border-accent focus:outline-none"
              disabled={loading}
            />
            <Button variant="primary" onClick={() => handleLookup(studentId)} disabled={loading}>
              <Search size={16} /> {loading ? '...' : 'Search'}
            </Button>
          </div>

          <p className="text-xs text-forest/60">
            Tip: USB barcode scanners type quickly and press Enter automatically.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-2xl bg-red-100 p-3 text-sm text-red-800">
            <AlertTriangle size={18} className="mr-2 inline-block" />
            {errorMessage}
          </div>
        )}

        {cameraError && (
          <div className="rounded-2xl bg-yellow-100 p-3 text-sm text-amber-900">
            <AlertTriangle size={18} className="mr-2 inline-block" />
            {cameraError}
          </div>
        )}

        {renderStudentCard()}
      </div>
    </div>
  );
}
