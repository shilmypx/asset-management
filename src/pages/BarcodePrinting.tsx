import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Printer, Barcode as BarcodeIcon, Settings } from "lucide-react";
import { fetchAssets } from "../lib/api/assets";
import { fetchLabelSettings, LabelPrintSettings } from "../lib/api/configuration";
import { Asset } from "../lib/mockData";

function Label({ asset, format, settings }: { asset: Asset; format: "barcode" | "qr"; settings: LabelPrintSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (format === "barcode") {
      try {
        JsBarcode(canvasRef.current, asset.tag, { format: "CODE128", width: 1.6, height: 40, fontSize: settings.font_size_pt * 1.3, margin: 6 });
      } catch { /* invalid chars for barcode encoding */ }
    } else {
      QRCode.toCanvas(canvasRef.current, asset.tag, { width: 96, margin: 1 });
    }
  }, [asset.tag, format, settings.font_size_pt]);

  return (
    <div
      className="border border-slate-200 rounded-md p-2 flex flex-col items-center justify-center gap-1 bg-white break-inside-avoid overflow-hidden"
      style={{
        width: `${settings.label_width_mm}mm`,
        height: `${settings.label_height_mm}mm`,
        fontFamily: settings.font_family,
      }}
    >
      <canvas ref={canvasRef} />
      <div className="text-center leading-tight" style={{ fontSize: `${settings.font_size_pt}pt` }}>
        <div className="font-medium truncate max-w-full">{asset.manufacturer} {asset.model}</div>
        <div className="text-slate-400 truncate max-w-full">{asset.company}</div>
      </div>
    </div>
  );
}

export default function BarcodePrinting() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [settings, setSettings] = useState<LabelPrintSettings | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<"barcode" | "qr" | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAssets().then(setAssets);
    fetchLabelSettings().then((s) => {
      setSettings(s);
      setFormat(s.barcode_format === "qr" ? "qr" : "barcode"); // default format comes from Configuration → Barcode / Label Printing
    });
  }, []);

  const filtered = assets.filter((a) => a.tag.toLowerCase().includes(search.toLowerCase()) || a.model.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }

  const selected = assets.filter((a) => selectedIds.has(a.id));

  if (!settings || format === null) {
    return <div className="p-8 text-sm text-slate-400">Loading label configuration…</div>;
  }

  return (
    <div className="p-8">
      <style>{`@page { size: ${settings.page_width_mm}mm ${settings.page_height_mm}mm; margin: ${settings.margin_top_mm}mm ${settings.margin_left_mm}mm; }`}</style>
      <div className="flex items-center justify-between mb-3 no-print">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Settings size={12} />
          Layout: {settings.labels_per_row}×{settings.labels_per_column} per page, {settings.label_width_mm}×{settings.label_height_mm}mm labels
          {settings.printer_name ? ` · ${settings.printer_name}` : ""}
        </div>
        <a href="/admin/configuration" className="text-xs text-accent-dark hover:underline">Edit layout in Configuration →</a>
      </div>

      <div className="grid grid-cols-5 gap-4 print:block">
        <div className="col-span-2 no-print">
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
          <div className="flex items-center justify-between mb-3 no-print">
            <div className="text-sm text-slate-600 flex items-center gap-1.5"><BarcodeIcon size={14} /> {selected.length} label{selected.length === 1 ? "" : "s"} selected</div>
            <button onClick={() => window.print()} disabled={selected.length === 0} className="flex items-center gap-1.5 text-sm bg-accent text-white px-3 py-1.5 rounded-md disabled:opacity-40">
              <Printer size={14} /> Print labels
            </button>
          </div>
          <div
            id="print-area"
            className="flex flex-wrap"
            style={{ gap: `${settings.vertical_spacing_mm}mm ${settings.horizontal_spacing_mm}mm` }}
          >
            {selected.map((a) => <Label key={a.id} asset={a} format={format} settings={settings} />)}
            {selected.length === 0 && <div className="w-full text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg p-8 text-center">Select assets from the list to preview and print labels.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
