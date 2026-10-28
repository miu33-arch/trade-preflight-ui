'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  ClipboardList,
  ShieldAlert,
  Save,
  Check,
  X,
  Printer
} from 'lucide-react';

interface ManifestItem {
  itemNo: number;
  pipeNo: string;
  coilNo: string;
  heatNo: string;
  lengthM: number;
  weightKg: number;
  receiving_status?: 'PENDING' | 'ACCEPTED' | 'DAMAGED' | 'SHORT' | 'OVER';
  inspection_notes?: string;
}

interface LaydownInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignmentId: string;
  reportNo: string;
  items: ManifestItem[];
  totalWeightKg: number;
  onInspectionUpdated?: () => void;
}

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    return 'https://api.miu33archstudio.xyz';
  }
  return 'https://api.miu33archstudio.xyz';
};

export function LaydownInspectionModal({
  isOpen,
  onClose,
  consignmentId,
  reportNo,
  items: initialItems,
  totalWeightKg,
  onInspectionUpdated,
}: LaydownInspectionModalProps) {
  const [items, setItems] = useState<ManifestItem[]>(initialItems);
  const [inspectorName, setInspectorName] = useState('SITE_QC_ENGINEER_01');
  const [signoffNotes, setSignoffNotes] = useState('');
  const [activeNoteItem, setActiveNoteItem] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [signoffResult, setSignoffResult] = useState<any | null>(null);

  if (!isOpen) return null;

  // Real-time site tallies
  const acceptedCount = items.filter((i) => i.receiving_status === 'ACCEPTED').length;
  const damagedCount = items.filter((i) => i.receiving_status === 'DAMAGED').length;
  const shortCount = items.filter((i) => i.receiving_status === 'SHORT').length;
  const pendingCount = items.filter(
    (i) => !i.receiving_status || i.receiving_status === 'PENDING'
  ).length;

  const receivedWeightKg = items
    .filter((i) => i.receiving_status === 'ACCEPTED')
    .reduce((sum, i) => sum + (i.weightKg || 0), 0);

  const handleUpdateStatus = async (
    itemNo: number,
    status: 'ACCEPTED' | 'DAMAGED' | 'SHORT' | 'PENDING' | 'OVER',
    notes?: string
  ) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(
        `${baseUrl}/v1/consignment/${consignmentId}/item/${itemNo}/inspect`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, notes: notes || null }),
        }
      );

      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.itemNo === itemNo
              ? { ...item, receiving_status: status, inspection_notes: notes ?? item.inspection_notes }
              : item
          )
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('API Error updating item status:', errData);
      }
    } catch (err) {
      console.error('Failed to update item inspection status:', err);
    }
  };

  const handleBatchAcceptPending = async () => {
    const pendings = items.filter(
      (i) => !i.receiving_status || i.receiving_status === 'PENDING'
    );
    for (const item of pendings) {
      await handleUpdateStatus(item.itemNo, 'ACCEPTED');
    }
  };

  const handleExecuteSignoff = async () => {
    setIsSigningOff(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(
        `${baseUrl}/v1/consignment/${consignmentId}/mri-signoff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inspectorName,
            signoffNotes: signoffNotes.trim() || undefined,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setSignoffResult(data);
        if (onInspectionUpdated) onInspectionUpdated();
      } else {
        alert(`Sign-off error: ${data.error || 'Server rejected sign-off.'}`);
      }
    } catch (err) {
      console.error('Sign-off failed:', err);
      alert('Network error connecting to backend inspection service.');
    } finally {
      setIsSigningOff(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono">
      <div className="w-full max-w-5xl bg-carbon border border-borderDark rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-borderDark flex justify-between items-center bg-surface">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emeraldHud" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              SITE LAYDOWN // MATERIAL RECEIVING INSPECTION (MRI &amp; OS&amp;D)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Tally / Metric Strip */}
        <div className="bg-obsidian border-b border-borderDark px-5 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-carbon border border-borderDark p-2.5 rounded">
            <span className="text-[10px] text-zinc-400 block">TOTAL MANIFEST</span>
            <span className="text-sm font-bold text-white">{items.length} PCS</span>
          </div>

          <div className="bg-carbon border border-emeraldHud/40 p-2.5 rounded">
            <span className="text-[10px] text-emeraldHud block">ACCEPTED (GRN)</span>
            <span className="text-sm font-bold text-emeraldHud">{acceptedCount} PCS</span>
          </div>

          <div className="bg-carbon border border-red-500/40 p-2.5 rounded">
            <span className="text-[10px] text-red-400 block">DAMAGED / NCR</span>
            <span className="text-sm font-bold text-red-400">{damagedCount} PCS</span>
          </div>

          <div className="bg-carbon border border-amberHud/40 p-2.5 rounded">
            <span className="text-[10px] text-amberHud block">SHORT SHIPMENT</span>
            <span className="text-sm font-bold text-amberHud">{shortCount} PCS</span>
          </div>

          <div className="bg-carbon border border-borderDark p-2.5 rounded col-span-2 sm:col-span-1">
            <span className="text-[10px] text-zinc-400 block">RECEIVED WEIGHT</span>
            <span className="text-sm font-bold text-cyanHud">
              {(receivedWeightKg / 1000).toFixed(2)} / {(totalWeightKg / 1000).toFixed(2)} MT
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-surface/50 border-b border-borderDark flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">INSPECTOR:</span>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="bg-obsidian border border-borderDark text-zinc-200 text-xs px-2 py-1 rounded focus:outline-none focus:border-emeraldHud font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleBatchAcceptPending}
                className="px-2.5 py-1 bg-emeraldHud/10 border border-emeraldHud/40 text-emeraldHud rounded text-xs hover:bg-emeraldHud/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                ACCEPT ALL REMAINING ({pendingCount})
              </button>
            )}
          </div>
        </div>

        {/* Interactive Manifest Table */}
        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-obsidian text-zinc-400 sticky top-0 border-b border-borderDark z-10">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">PIPE / SERIAL</th>
                <th className="py-2.5 px-3">HEAT / TRACE</th>
                <th className="py-2.5 px-3 text-right">MASS (KG)</th>
                <th className="py-2.5 px-3 text-center">RECEIVING STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderDark/40 font-mono">
              {items.map((item) => {
                const status = item.receiving_status || 'PENDING';
                return (
                  <tr
                    key={`${item.itemNo}-${item.pipeNo || item.itemNo}`}
                    className={`hover:bg-surface/60 transition ${
                      status === 'DAMAGED'
                        ? 'bg-red-950/20'
                        : status === 'SHORT'
                        ? 'bg-amberHud/10'
                        : status === 'ACCEPTED'
                        ? 'bg-emeraldHud/5'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-zinc-500">{item.itemNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">
                      {item.pipeNo}
                      {item.inspection_notes && (
                        <span className="block text-[10px] text-red-400 font-normal mt-0.5">
                          DEFECT NOTE: {item.inspection_notes}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-cyanHud">{item.heatNo}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-zinc-200">
                      {item.weightKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                          status === 'ACCEPTED'
                            ? 'bg-emeraldHud/10 border-emeraldHud text-emeraldHud'
                            : status === 'DAMAGED'
                            ? 'bg-red-950/40 border-red-500 text-red-400'
                            : status === 'SHORT'
                            ? 'bg-amberHud/10 border-amberHud text-amberHud'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.itemNo, 'ACCEPTED')}
                          title="Accept Pipe / Conforming"
                          className="p-1 rounded bg-emeraldHud/10 hover:bg-emeraldHud/25 border border-emeraldHud/50 text-emeraldHud transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNoteItem(item.itemNo);
                            setTempNote(item.inspection_notes || '');
                          }}
                          title="Flag Damaged / Issue NCR"
                          className="p-1 rounded bg-red-950/30 hover:bg-red-950/50 border border-red-500/50 text-red-400 transition cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.itemNo, 'SHORT')}
                          title="Flag Short / Missing"
                          className="p-1 rounded bg-amberHud/10 hover:bg-amberHud/25 border border-amberHud/50 text-amberHud transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Defect Note Input Popover */}
          {activeNoteItem !== null && (
            <div className="mt-4 p-3 bg-obsidian border border-red-500/50 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <input
                type="text"
                placeholder="Enter OS&D defect note (e.g. Bevel deformed, 3LPE scratched, heat stamp illegible)..."
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                className="flex-1 bg-carbon border border-borderDark text-xs text-zinc-100 p-1.5 rounded focus:outline-none focus:border-red-400"
              />
              <button
                type="button"
                onClick={() => {
                  handleUpdateStatus(activeNoteItem, 'DAMAGED', tempNote);
                  setActiveNoteItem(null);
                }}
                className="px-3 py-1 bg-red-950/60 border border-red-500 text-red-400 text-xs font-bold rounded hover:bg-red-900 transition flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                SAVE NCR
              </button>
              <button
                type="button"
                onClick={() => setActiveNoteItem(null)}
                className="px-2 py-1 text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Signoff Report Summary Box (If Completed) */}
          {signoffResult && (
            <div className="mt-5 p-4 bg-emeraldHud/5 border border-emeraldHud/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emeraldHud font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>MATERIAL RECEIVING REPORT SIGNED OFF ({signoffResult.mriReportId})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-300">
                <div><span className="text-zinc-500">OVERALL STATUS:</span> {signoffResult.overallStatus}</div>
                <div><span className="text-zinc-500">ACCEPTED:</span> {signoffResult.totalAccepted} PCS</div>
                <div><span className="text-zinc-500">REJECTED/OS&amp;D:</span> {signoffResult.totalRejected} PCS</div>
                <div><span className="text-zinc-500">NET ACCEPTED MASS:</span> {(signoffResult.receivedWeightKg / 1000).toFixed(2)} MT</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-borderDark flex flex-wrap justify-between items-center gap-3 bg-surface">
          <div className="text-[11px] text-zinc-400">
            REPORT REF: <span className="text-zinc-200">{reportNo}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* View/Print OS&D Report Dossier */}
            {(damagedCount > 0 || shortCount > 0 || signoffResult) && (
              <a
                href={`${getApiBaseUrl()}/v1/consignment/${consignmentId}/osd-print`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-red-950/40 border border-red-500/60 text-red-400 text-xs font-semibold rounded hover:bg-red-900/50 transition flex items-center gap-1.5"
                title="Open Printable OS&D Non-Conformance Claim Dossier"
              >
                <Printer className="w-3.5 h-3.5" />
                PRINT OS&amp;D DOSSIER
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-borderDark text-xs text-zinc-400 hover:text-white rounded transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExecuteSignoff}
              disabled={isSigningOff || pendingCount > 0}
              className="px-4 py-2 bg-emeraldHud text-obsidian text-xs font-bold rounded hover:bg-emerald-400 disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              {isSigningOff ? 'Signing off...' : 'Sign Off MRI & Complete Handover'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}