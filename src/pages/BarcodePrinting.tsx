import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Printer, Barcode as BarcodeIcon } from "lucide-react";
import { fetchAssets } from "../lib/api/assets";
import { Asset } from "../lib/mockData";

function Label({ asset, format }: { asset: Asset; format: "barcode" | "qr" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (format === "barcode") {
      try { JsBarcode(canvasRef.current, asset.tag, { format: "CODE128", width: 1.6, height: 40, fontSize: 11, margin: 6 }); } catch { /* invalid chars for barcode encoding */ }
    } else {
      QRCode.toCanvas(canvasRef.current, asset.tag, { width: 96, margin: 1 });
    }
  }, [asset.tag, format]);

  return (
    <div className="border border-slate-200 rounded-md p-3 flex flex-col items-center gap-1 bg-white break-inside-avoid">
      <canvas ref={canvasRef} />
      <div className="text-[11px] text-slate-600 text-center leading-tight">
        <div className="font-medium">{asset.manufacturer} {asset.model}</div>
        <div className="text-slate-400">{asset.company}</div>
      </div>
    </div>
  );
}

export default function BarcodePrinting() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<"barcode" | "qr">("barcode");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAssets().then(setAssets); }, []);

  const filtered = assets.filter((a) => a.tag.toLowerCase().includes(search.toLowerCase()) || a.model.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }

  const selected = assets.filter((a) => selectedIds.has(a.id));

  return (
    <div className="p-8">
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…" className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-sm" />
            <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
              <option value="barcode">Code128</option>
              <option value="qr">QR</option>
            </select>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden max-h-[520px] overflow-y-auto">
            {filtered.map((a) => (
              <label key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggle(a.id)} />
                <div className="text-sm">
                  <div className="font-medium text-slate-800">{a.manufacturer} {a.model}</div>
                  <div className="text-xs text-slate-400 font-mono">{a.tag}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-600 flex items-center gap-1.5"><BarcodeIcon size={14} /> {selected.length} label{selected.length === 1 ? "" : "s"} selected</div>
            <button onClick={() => window.print()} disabled={selected.length === 0} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
              <Printer size={14} /> Print labels
            </button>
          </div>
          <div id="print-area" className="grid grid-cols-3 gap-3">
            {selected.map((a) => <Label key={a.id} asset={a} format={format} />)}
            {selected.length === 0 && <div className="col-span-3 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg p-8 text-center">Select assets from the list to preview and print labels.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
