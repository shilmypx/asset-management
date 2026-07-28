import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, AlertCircle } from "lucide-react";

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

/** Full-screen camera scanner for barcodes/QR codes — used anywhere a barcode input exists, as an alternative to typing/hardware scanners. */
export default function CameraScanner({ onDetected, onClose }: Props) {
  const containerId = useRef(`scanner-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId.current);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          onDetected(decodedText);
        },
        () => {
          // per-frame "nothing found" callback — expected constantly while scanning, not an error
        }
      )
      .catch(() => {
        setError("Couldn't access the camera. Check browser permissions, or type the code instead.");
      });

    return () => {
      scanner.stop().catch(() => {}).finally(() => scanner.clear());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl overflow-hidden w-[360px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><Camera size={14} /> Scan barcode / QR</div>
          <button onClick={onClose} className="text-slate-400"><X size={18} /></button>
        </div>
        <div id={containerId.current} className="w-full aspect-square bg-black" />
        {error && (
          <div className="flex items-start gap-2 text-xs text-red-500 p-4">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div className="text-xs text-slate-400 text-center p-3">Point the camera at a barcode or QR label.</div>
      </div>
    </div>
  );
}
