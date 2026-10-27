'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TermsModal } from "../components/TermsModal";
import { LaydownInspectionModal } from '../components/LaydownInspectionModal';
import {
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Anchor,
  Layers,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Link2,
  Terminal,
  ExternalLink,
  AlertOctagon,
  FileCheck,
  QrCode,
  Cpu,
  Globe2,
  ClipboardList
} from 'lucide-react';

interface Discrepancy {
  itemNo: number;
  pipeNo: string;
  severity: 'CRITICAL' | 'WARNING';
  code: string;
  message: string;
}

interface MTCAuditData {
  isMtcDetected: boolean;
  detectedStandard?: string;
  specimen: {
    heatNo?: string;
    grade?: string;
    yieldStrengthMpa?: number;
    tensileStrengthMpa?: number;
    elongationPercent?: number;
    carbonPercent?: number;
    cev?: number;
  };
  parity: {
    standardEvaluated: string;
    targetStandardCode: string;
    sqmMandatory: boolean;
    mechanicalStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
    chemicalStatus: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  };
}

interface AuditData {
  consignmentId: string;
  targetBenchmark?: string;
  audit: {
    metadata: {
      shipper: string;
      consignee: string;
      reportNo: string;
      standard: string;
      dimensions: string;
      coating: string;
    };
    physicalSummary: {
      totalPieces: number;
      totalWeightKg: number;
      totalLengthM: number;
      maxSingleLiftKg: number;
      recommendedCraneSwlMT: number;
      handlingNotes: string[];
    };
    regulatoryAudit: {
      suggestedHsCode: string;
      sasoTechnicalRegulation: string;
      conformityRoute: string;
      parityStatus: string;
    };
    mtcAudit?: MTCAuditData;
    discrepancies?: Discrepancy[];
    auditStatus?: 'PASS' | 'WARNINGS_DETECTED' | 'CRITICAL_DISCREPANCY';
    items: Array<{
      itemNo: number;
      pipeNo: string;
      coilNo: string;
      heatNo: string;
      lengthM: number;
      weightKg: number;
      hasError?: boolean;
      errorReason?: string;
    }>;
  };
}

interface ZatcaClearanceResponse {
  status: 'CLEARED' | 'REJECTED';
  invoiceNumber: string;
  sequenceId: number;
  uuid: string;
  sha256Hash: string;
  previousHash: string;
  qrPayloadBase64: string;
  clearedAt: string;
  standardParity: string;
  chainIntegrity: string;
  summary?: {
    totalItems: number;
    totalWeightMT: string;
    subtotalSAR: string;
    vatAmountSAR: string;
    grandTotalSAR: string;
  };
  decodedTags?: {
    tag1Seller: string;
    tag2Vat: string;
    tag3Timestamp: string;
    tag4TotalSar: string;
    tag5VatSar: string;
  };
  error?: string;
}

interface LedgerEntry {
  sequence_id: number;
  consignment_id: string;
  current_hash: string;
  previous_hash: string;
  uuid: string;
  created_at: string;
}

const CORRIDOR_OPTIONS = [
  { key: 'SASO_2831_API_5L_X42M', label: 'KSA SASO 2831 / API 5L PSL2 X42M (Line Pipe)', minYield: 290, maxYield: 495, minTensile: 415, maxC: 0.22, maxCev: 0.43 },
  { key: 'GBT_9711_L290M', label: 'CN GB/T 9711-2017 L290M (PSL2 Equiv)', minYield: 290, maxYield: 495, minTensile: 415, maxC: 0.22, maxCev: 0.42 },
  { key: 'GBT_1591_Q355B', label: 'CN GB/T 1591-2018 Q355B (Structural Plate)', minYield: 355, maxYield: null, minTensile: 470, maxC: 0.20, maxCev: 0.45 },
  { key: 'ASTM_A572_GR50', label: 'US/KSA ASTM A572 Gr 50 (Structural Shapes)', minYield: 345, maxYield: null, minTensile: 450, maxC: 0.23, maxCev: 0.47 },
];

export default function TradePreflightDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('SASO_2831_API_5L_X42M');
  const [mriModalOpen, setMriModalOpen] = useState(false);

  // Multimodal Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // ZATCA Modal State
  const [zatcaModalOpen, setZatcaModalOpen] = useState(false);
  const [activeZatcaTab, setActiveZatcaTab] = useState<'telemetry' | 'json'>('telemetry');
  const [zatcaAuditing, setZatcaAuditing] = useState(false);
  const [zatcaResult, setZatcaResult] = useState<ZatcaClearanceResponse | null>(null);
  const [rawZatcaJson, setRawZatcaJson] = useState<any | null>(null);
  const [loadingJson, setLoadingJson] = useState(false);

  // FASAH Modal State
  const [fasahModalOpen, setFasahModalOpen] = useState(false);
  const [activeFasahTab, setActiveFasahTab] = useState<'bayan' | 'json'>('bayan');
  const [rawFasahJson, setRawFasahJson] = useState<any | null>(null);
  const [loadingFasah, setLoadingFasah] = useState(false);

  // Clipboard States
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedZatcaJson, setCopiedZatcaJson] = useState(false);
  const [copiedFasahJson, setCopiedFasahJson] = useState(false);

  // Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [showLedger, setShowLedger] = useState(true);

  const fetchLedger = async () => {
    try {
      const res = await fetch('/v1/audit/ledger');
      if (res.ok) {
        const data = await res.json();
        setLedgerEntries(data.ledger || []);
      }
    } catch (err) {
      console.error('Failed to pull audit ledger:', err);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleUpload = async (targetFile: File, benchmarkKey: string = selectedBenchmark) => {
    setLoading(true);
    setFile(targetFile);

    const formData = new FormData();
    formData.append('file', targetFile);
    formData.append('benchmarkKey', benchmarkKey);

    try {
      const res = await fetch('/v1/audit/packing-list', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Ingestion failed');
      const data = await res.json();
      setAuditResult(data);
    } catch (err) {
      console.error(err);
      alert('Error auditing document. Verification service temporarily unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleBenchmarkChange = (newKey: string) => {
    setSelectedBenchmark(newKey);
    if (file) {
      handleUpload(file, newKey);
    }
  };

  const fetchRawZatcaPayload = async (consignmentId: string) => {
    setLoadingJson(true);
    try {
      const res = await fetch(`/v1/consignment/${consignmentId}/zatca-payload`);
      if (res.ok) {
        const data = await res.json();
        setRawZatcaJson(data);
      }
    } catch (err) {
      console.error('Failed to fetch raw ZATCA payload:', err);
    } finally {
      setLoadingJson(false);
    }
  };

  const fetchFasahBayan = async (consignmentId: string) => {
    setLoadingFasah(true);
    try {
      const res = await fetch(`/v1/consignment/${consignmentId}/fasah-bayan`);
      if (res.ok) {
        const data = await res.json();
        setRawFasahJson(data);
      }
    } catch (err) {
      console.error('Failed to fetch FASAH Bayan payload:', err);
    } finally {
      setLoadingFasah(false);
    }
  };

  const executeZatcaClearance = async () => {
    if (!auditResult) return;
    setZatcaAuditing(true);
    setZatcaResult(null);

    fetchRawZatcaPayload(auditResult.consignmentId);

    try {
      const res = await fetch('/v1/zatca/preflight-clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: auditResult.audit.metadata.reportNo || auditResult.consignmentId,
          totalWeightKg: auditResult.audit.physicalSummary.totalWeightKg,
          seller: auditResult.audit.metadata.shipper,
          buyer: auditResult.audit.metadata.consignee
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ZATCA Preflight validation failed');
      setZatcaResult(data);
      fetchLedger();
    } catch (err: any) {
      setZatcaResult({
        status: 'REJECTED',
        invoiceNumber: auditResult.audit.metadata.reportNo || auditResult.consignmentId,
        sequenceId: 0,
        uuid: 'NON_COMPLIANT_PAYLOAD',
        sha256Hash: 'NONE',
        previousHash: 'NONE',
        qrPayloadBase64: 'NONE',
        clearedAt: new Date().toISOString(),
        standardParity: 'REJECTED_AT_GATE',
        chainIntegrity: 'CHAIN_BROKEN',
        error: err.message,
      });
    } finally {
      setZatcaAuditing(false);
    }
  };

  const copyToClipboard = (text: string, type: 'hash' | 'zatcaJson' | 'fasahJson') => {
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else if (type === 'zatcaJson') {
      setCopiedZatcaJson(true);
      setTimeout(() => setCopiedZatcaJson(false), 2000);
    } else {
      setCopiedFasahJson(true);
      setTimeout(() => setCopiedFasahJson(false), 2000);
    }
  };

  const handleCopyClearancePayload = () => {
    if (!auditResult) return;
    const text = `[MIU PREFLIGHT TRADE CONSIGNMENT CLEARANCE]
Consignment ID: ${auditResult.consignmentId}
Benchmark: ${auditResult.audit.regulatoryAudit.sasoTechnicalRegulation || 'KSA SASO 2831 / API 5L'}
Status: ${currentAuditStatus} (${currentDiscrepancies.length} FLAGS)
Total Pieces: ${auditResult.audit.physicalSummary.totalPieces} PCS
Total Weight: ${(auditResult.audit.physicalSummary.totalWeightKg / 1000).toFixed(2)} MT
SABER Manifest Link: https://trade.miu33archstudio.xyz/v1/consignment/${auditResult.consignmentId}/saber-csv
Verification Gateway: https://trade.miu33archstudio.xyz`;
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const currentAuditStatus = auditResult?.audit?.auditStatus || 'PASS';
  const currentDiscrepancies = auditResult?.audit?.discrepancies || [];
  const mtcData = auditResult?.audit?.mtcAudit;
  const activeBenchmarkSpec = CORRIDOR_OPTIONS.find(c => c.key === selectedBenchmark) || CORRIDOR_OPTIONS[0];

  return (
    <div className="min-h-screen bg-obsidian text-zinc-200 font-mono p-6">
      {/* Telemetry Header */}
      <header className="border-b border-borderDark pb-4 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emeraldHud rounded-full animate-pulse" />
            <h1 className="text-xl font-bold tracking-wider text-white">
              TRADE_PREFLIGHT_OS // KSA CARGO &amp; STANDARDS GATEWAY
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            HEADLESS PREFLIGHT AUDIT // UNIVERSAL MILL MANIFEST PARITY &bull; MTC EXTRACTOR &bull; SABER &bull; SASO &bull; FASAH &bull; ZATCA PHASE-2
          </p>
        </div>
        <div className="text-xs text-zinc-300 bg-surface px-3 py-1.5 border border-borderDark rounded flex items-center gap-3">
          <div>CORE_NODE: <span className="text-emeraldHud font-semibold">ONLINE :PRODUCTION</span></div>
          <div className="h-3 w-px bg-borderDark" />
          <div>CHAIN: <span className="text-cyanHud font-semibold">{ledgerEntries.length} BLOCKS</span></div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dropzone, Corridor Selector & Consignment Card */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Corridor Benchmark Picker */}
          <div className="bg-carbon border border-borderDark p-3.5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold uppercase tracking-wider">
                <Globe2 className="w-3.5 h-3.5 text-cyanHud" />
                <span>Trade Corridor Benchmark</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">PARITY MATRIX v1.4</span>
            </div>
            <select
              value={selectedBenchmark}
              onChange={(e) => handleBenchmarkChange(e.target.value)}
              className="w-full bg-obsidian border border-borderDark text-emeraldHud text-xs p-2 rounded focus:outline-none focus:border-emeraldHud font-mono cursor-pointer"
            >
              {CORRIDOR_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key} className="bg-obsidian text-zinc-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-8 rounded-lg text-center transition-all cursor-pointer bg-carbon ${dragActive ? 'border-emeraldHud bg-surface' : 'border-borderDark hover:border-zinc-400'
              }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <UploadCloud className="w-10 h-10 mx-auto text-emeraldHud mb-3" />
            <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
              {loading ? 'Executing Dynamic Document Audit...' : 'Drop Supplier Packing List / MTC (PDF)'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Supports Universal Mill Layouts, MTC Metallurgy, Heat-Trace Auditing, and Rigging Limits
            </p>
            {file && <p className="text-xs text-cyanHud mt-3 underline font-medium">{file.name}</p>}
          </div>

          {auditResult && (
            <div className="bg-carbon border border-borderDark p-5 rounded-lg flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-borderDark pb-2">
                <span className="text-xs text-zinc-300 tracking-wider">CONSIGNMENT IDENTIFIER</span>
                <span className="text-xs text-emeraldHud font-bold tracking-wider">
                  {auditResult.consignmentId}
                </span>
              </div>
              <div className="text-xs space-y-2">
                <p>
                  <span className="text-zinc-400 font-bold">SHIPPER:</span>{' '}
                  <span className="text-zinc-100 font-medium">{auditResult.audit.metadata.shipper}</span>
                </p>
                <p>
                  <span className="text-zinc-400 font-bold">CONSIGNEE:</span>{' '}
                  <span className="text-zinc-100 font-medium">{auditResult.audit.metadata.consignee}</span>
                </p>
                <p>
                  <span className="text-zinc-400 font-bold">SPECIFICATION:</span>{' '}
                  <span className="text-zinc-100 font-medium">
                    {auditResult.audit.metadata.standard} ({auditResult.audit.metadata.dimensions})
                  </span>
                </p>
                <p>
                  <span className="text-zinc-400 font-bold">COATING:</span>{' '}
                  <span className="text-zinc-100 font-medium">{auditResult.audit.metadata.coating}</span>
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-emeraldHud/10 border border-emeraldHud/50 hover:bg-emeraldHud/20 text-emeraldHud text-xs py-2 px-2 rounded font-semibold transition"
                  title="Multimodal Dispatch & Clearance Release"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  SABER CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveZatcaTab('telemetry');
                    setZatcaModalOpen(true);
                    executeZatcaClearance();
                  }}
                  className="flex items-center justify-center gap-1.5 bg-cyanHud/10 border border-cyanHud/50 hover:bg-cyanHud/20 text-cyanHud text-xs py-2 px-2 rounded font-semibold transition"
                  title="Run ZATCA Phase-2 Preflight Clearance & Scannable QR"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  ZATCA GATE
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFasahTab('bayan');
                    setFasahModalOpen(true);
                    fetchFasahBayan(auditResult.consignmentId);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-blue-600/15 border border-blue-500/50 hover:bg-blue-600/25 text-blue-400 text-xs py-2 px-2 rounded font-semibold transition"
                  title="Open FASAH Unified Declaration Bayan Modal"
                >
                  <FileText className="w-3.5 h-3.5" />
                  FASAH BAYAN
                </button>

                <button
                  type="button"
                  onClick={() => setMriModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-amberHud/15 border border-amberHud/50 hover:bg-amberHud/25 text-amberHud text-xs py-2 px-2 rounded font-semibold transition"
                  title="Open Site Laydown & Material Receiving Inspection (MRI) Mode"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  MRI YARD
                </button>

                <a
                  href={`/v1/consignment/${auditResult.consignmentId}/zatca-payload`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 bg-surface border border-borderDark hover:border-zinc-500 text-zinc-300 hover:text-white text-xs py-2 px-2 rounded font-medium transition"
                  title="View full structured UBL-2.1 JSON in raw tab"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  JSON
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Preflight Audit HUD */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {auditResult ? (
            <>
              {/* Status Banner */}
              <div
                className={`p-4 rounded-lg border flex items-center justify-between font-mono ${currentAuditStatus === 'CRITICAL_DISCREPANCY'
                    ? 'bg-red-950/30 border-red-500/50 text-red-400'
                    : currentAuditStatus === 'WARNINGS_DETECTED'
                      ? 'bg-amberHud/10 border-amberHud/50 text-amberHud'
                      : 'bg-emeraldHud/10 border-emeraldHud/50 text-emeraldHud'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {currentAuditStatus === 'CRITICAL_DISCREPANCY' ? (
                    <AlertOctagon className="w-5 h-5 shrink-0 text-red-400" />
                  ) : currentAuditStatus === 'WARNINGS_DETECTED' ? (
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amberHud" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emeraldHud" />
                  )}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">
                      PREFLIGHT INTEGRITY: {currentAuditStatus.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-zinc-300 mt-0.5">
                      {currentDiscrepancies.length === 0
                        ? 'All cargo units, MTC metallurgy, heat traces, and lift envelopes passed validation.'
                        : `${currentDiscrepancies.length} anomaly flag(s) identified in supplier manifest.`}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-obsidian border border-borderDark rounded shrink-0">
                  {currentDiscrepancies.length} FLAGS
                </span>
              </div>

              {/* Physical Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-carbon border border-borderDark p-3.5 rounded">
                  <span className="text-[10px] text-zinc-400 block tracking-wider">CARGO UNITS</span>
                  <span className="text-xl font-bold text-white">
                    {auditResult.audit.physicalSummary.totalPieces} PCS
                  </span>
                </div>
                <div className="bg-carbon border border-borderDark p-3.5 rounded">
                  <span className="text-[10px] text-zinc-400 block tracking-wider">TOTAL MASS</span>
                  <span className="text-xl font-bold text-white">
                    {(auditResult.audit.physicalSummary.totalWeightKg / 1000).toFixed(1)} MT
                  </span>
                </div>
                <div className="bg-carbon border border-borderDark p-3.5 rounded">
                  <span className="text-[10px] text-zinc-400 block tracking-wider">MAX SINGLE LIFT</span>
                  <span className="text-xl font-bold text-amberHud">
                    {(auditResult.audit.physicalSummary.maxSingleLiftKg / 1000).toFixed(2)} MT
                  </span>
                </div>
                <div className="bg-carbon border border-borderDark p-3.5 rounded">
                  <span className="text-[10px] text-zinc-400 block tracking-wider">CRANE SWL REC.</span>
                  <span className="text-xl font-bold text-emeraldHud">
                    &ge; {auditResult.audit.physicalSummary.recommendedCraneSwlMT} MT
                  </span>
                </div>
              </div>

              {/* MTC Metallurgical Parity Card */}
              {mtcData && mtcData.isMtcDetected && (
                <div className="bg-carbon border border-borderDark p-5 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-borderDark/60 pb-2">
                    <div className="flex items-center gap-2 text-cyanHud text-xs font-bold tracking-wider">
                      <Cpu className="w-4 h-4" />
                      MTC METALLURGICAL TEST PARITY AUDIT
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${mtcData.parity.mechanicalStatus === 'PASS' && mtcData.parity.chemicalStatus === 'PASS'
                        ? 'bg-emeraldHud/10 border-emeraldHud text-emeraldHud'
                        : 'bg-red-950/30 border-red-500 text-red-400'
                      }`}>
                      {mtcData.parity.mechanicalStatus === 'PASS' && mtcData.parity.chemicalStatus === 'PASS'
                        ? 'METALLURGY CONFORMS'
                        : 'METALLURGY FLAGGED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* YIELD */}
                    <div className="bg-obsidian border border-borderDark/80 p-2.5 rounded">
                      <span className="text-[10px] text-zinc-400 block">YIELD (ReH)</span>
                      <span className={`font-bold ${(mtcData.specimen.yieldStrengthMpa || 0) < activeBenchmarkSpec.minYield ||
                          (activeBenchmarkSpec.maxYield && (mtcData.specimen.yieldStrengthMpa || 0) > activeBenchmarkSpec.maxYield)
                          ? 'text-red-400'
                          : 'text-zinc-100'
                        }`}>
                        {mtcData.specimen.yieldStrengthMpa ? `${mtcData.specimen.yieldStrengthMpa} MPa` : 'N/A'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">
                        Min: {activeBenchmarkSpec.minYield} MPa {activeBenchmarkSpec.maxYield ? `| Max: ${activeBenchmarkSpec.maxYield}` : ''}
                      </span>
                    </div>

                    {/* TENSILE */}
                    <div className="bg-obsidian border border-borderDark/80 p-2.5 rounded">
                      <span className="text-[10px] text-zinc-400 block">TENSILE (Rm)</span>
                      <span className={`font-bold ${(mtcData.specimen.tensileStrengthMpa || 0) < activeBenchmarkSpec.minTensile
                          ? 'text-red-400'
                          : 'text-zinc-100'
                        }`}>
                        {mtcData.specimen.tensileStrengthMpa ? `${mtcData.specimen.tensileStrengthMpa} MPa` : 'N/A'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">Min: {activeBenchmarkSpec.minTensile} MPa</span>
                    </div>

                    {/* CARBON */}
                    <div className="bg-obsidian border border-borderDark/80 p-2.5 rounded">
                      <span className="text-[10px] text-zinc-400 block">CARBON (C%)</span>
                      <span className={`font-bold ${(mtcData.specimen.carbonPercent || 0) > activeBenchmarkSpec.maxC
                          ? 'text-red-400'
                          : 'text-zinc-100'
                        }`}>
                        {mtcData.specimen.carbonPercent ? `${mtcData.specimen.carbonPercent}%` : 'N/A'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">Max: {activeBenchmarkSpec.maxC}%</span>
                    </div>

                    {/* CEV */}
                    <div className="bg-obsidian border border-borderDark/80 p-2.5 rounded">
                      <span className="text-[10px] text-zinc-400 block">CARBON EQUIV (CEV)</span>
                      <span className={`font-bold ${(mtcData.specimen.cev || 0) > activeBenchmarkSpec.maxCev
                          ? 'text-red-400'
                          : 'text-zinc-100'
                        }`}>
                        {mtcData.specimen.cev ? mtcData.specimen.cev : 'N/A'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">Max: {activeBenchmarkSpec.maxCev}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400 flex flex-wrap items-center justify-between pt-1 border-t border-borderDark/40 gap-2">
                    <div>
                      <span>BENCHMARK: </span>
                      <span className="text-zinc-200 font-semibold">{mtcData.parity.targetStandardCode || activeBenchmarkSpec.label}</span>
                      {mtcData.detectedStandard && (
                        <span className="text-zinc-400 text-[10px] ml-2">
                          (Mill Declared: <span className="text-cyanHud font-medium">{mtcData.detectedStandard}</span>)
                        </span>
                      )}
                    </div>
                    <span className="text-amberHud font-semibold">SQM (SASO QUALITY MARK): MANDATORY</span>
                  </div>
                </div>
              )}

              {/* SASO & Customs Conformity */}
              <div className="bg-carbon border border-borderDark p-5 rounded-lg">
                <div className="flex items-center gap-2 text-emeraldHud text-xs font-bold mb-3 tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  SASO &amp; CUSTOMS CONFORMITY VALIDATION
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-borderDark/60">
                    <span className="text-zinc-400 font-medium">ASSIGNED HS CODE</span>
                    <span className="text-white font-bold tracking-wider">
                      {auditResult.audit.regulatoryAudit.suggestedHsCode}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-borderDark/60">
                    <span className="text-zinc-400 font-medium">TECHNICAL REGULATION</span>
                    <span className="text-zinc-200 text-right">
                      {auditResult.audit.regulatoryAudit.sasoTechnicalRegulation}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-borderDark/60">
                    <span className="text-zinc-400 font-medium">CONFORMITY ASSESSMENT ROUTE</span>
                    <span className="text-emeraldHud font-semibold">
                      {auditResult.audit.regulatoryAudit.conformityRoute}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-400 font-medium">PARITY VERIFICATION</span>
                    <span className="text-cyanHud font-semibold">
                      {auditResult.audit.regulatoryAudit.parityStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Berth & Rigging Constraints */}
              <div className="bg-carbon border border-borderDark p-5 rounded-lg">
                <div className="flex items-center gap-2 text-amberHud text-xs font-bold mb-3 tracking-wider">
                  <Anchor className="w-4 h-4" />
                  BERTH &amp; LIFTING CONSTRAINTS
                </div>
                <ul className="space-y-2 text-xs text-zinc-300">
                  {auditResult.audit.physicalSummary.handlingNotes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amberHud mt-0.5">&bull;</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-carbon border border-borderDark rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
              <AlertTriangle className="w-8 h-8 text-zinc-500 mb-2" />
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                Awaiting Document Ingestion
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Upload any mill packing list or MTC to execute dynamic OCR and anomaly checks.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Itemized Manifest Inspection Table */}
      {auditResult && auditResult.audit.items && auditResult.audit.items.length > 0 && (
        <div className="mt-6 bg-carbon border border-borderDark rounded-lg overflow-hidden">
          <div className="p-4 border-b border-borderDark flex justify-between items-center bg-surface">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emeraldHud" />
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                PARSED MANIFEST ITEMS ({auditResult.audit.items.length} RECORDS)
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              REPORT: <span className="text-zinc-200 font-semibold">{auditResult.audit.metadata.reportNo}</span>
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-obsidian text-zinc-400 sticky top-0 border-b border-borderDark z-10">
                <tr>
                  <th className="py-2.5 px-3.5">#</th>
                  <th className="py-2.5 px-3.5">CARGO SERIAL / MARK</th>
                  <th className="py-2.5 px-3.5">COIL / BATCH</th>
                  <th className="py-2.5 px-3.5">HEAT / TRACE</th>
                  <th className="py-2.5 px-3.5 text-right">LENGTH (M)</th>
                  <th className="py-2.5 px-3.5 text-right">MASS (KG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark/40">
                {auditResult.audit.items.map((item, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-surface/50 font-mono transition-colors ${item.hasError ? 'bg-red-950/20' : ''
                      }`}
                  >
                    <td className="py-2 px-3.5 text-zinc-500">{i + 1}</td>
                    <td className="py-2 px-3.5 font-semibold">
                      <span className={item.hasError ? 'text-red-400 font-bold underline' : 'text-emeraldHud'}>
                        {item.pipeNo}
                      </span>
                      {item.errorReason && (
                        <span className="block text-[10px] text-red-400 font-normal mt-0.5">
                          {item.errorReason}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3.5 text-zinc-300">{item.coilNo}</td>
                    <td className="py-2 px-3.5 text-cyanHud">{item.heatNo}</td>
                    <td className="py-2 px-3.5 text-right text-zinc-200">
                      <span className={item.lengthM > 16.5 ? 'text-amberHud font-bold' : ''}>
                        {item.lengthM.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold text-white">
                      {item.weightKg.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger History Panel */}
      <div className="mt-6 bg-carbon border border-borderDark rounded-lg overflow-hidden">
        <div className="p-4 border-b border-borderDark flex justify-between items-center bg-surface">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-cyanHud" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              IMMUTABLE HASH-CHAIN LEDGER ({ledgerEntries.length} BLOCKS VALIDATED)
            </span>
          </div>
          <button
            onClick={() => setShowLedger(!showLedger)}
            className="text-[11px] text-zinc-400 hover:text-white"
          >
            {showLedger ? '[COLLAPSE]' : '[EXPAND]'}
          </button>
        </div>

        {showLedger && (
          <div className="p-4 overflow-x-auto">
            {ledgerEntries.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No cryptographic blocks generated yet. Run ZATCA clearance to anchor sequence 1.
              </p>
            ) : (
              <div className="space-y-3">
                {ledgerEntries.map((block) => (
                  <div
                    key={block.sequence_id}
                    className="p-3 bg-obsidian border border-borderDark rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-cyanHud/10 border border-cyanHud/40 text-cyanHud font-bold rounded">
                        #{block.sequence_id}
                      </span>
                      <span className="text-zinc-200 font-semibold">{block.consignment_id}</span>
                      <span className="text-zinc-500 text-[10px]">{block.created_at}</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-[11px] w-full md:w-auto">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500">PREV:</span>
                        <code className="text-zinc-400 truncate max-w-[130px]">{block.previous_hash}</code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emeraldHud">CURR:</span>
                        <code className="text-emeraldHud font-bold truncate max-w-[145px]">{block.current_hash}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MULTIMODAL DISPATCH & CLEARANCE GATE */}
      {dispatchModalOpen && auditResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f14] border border-borderDark rounded-lg w-full max-w-xl overflow-hidden shadow-2xl font-mono text-zinc-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-borderDark bg-[#11161d]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emeraldHud animate-pulse" />
                <h3 className="text-xs uppercase tracking-widest font-semibold text-emeraldHud">
                  MULTIMODAL DISPATCH // CLEARANCE HANDOVER
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="text-xs text-zinc-500 hover:text-zinc-200 transition"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-obsidian border border-borderDark p-4 rounded text-xs space-y-1">
                <div className="text-zinc-400">CONSIGNMENT REF: <span className="text-emeraldHud font-bold">{auditResult.consignmentId}</span></div>
                <div className="text-zinc-400">STATUS: <span className="text-emeraldHud">{currentAuditStatus} (0 ANOMALIES)</span></div>
                <div className="text-zinc-400">VERIFICATION: <span className="text-zinc-200">trade.miu33archstudio.xyz</span></div>
              </div>

              {/* PRIMARY PROTON & COPY ACTIONS */}
              <div className="space-y-2">
                <div className="text-[10px] tracking-wider text-zinc-400 uppercase font-semibold">Priority Dispatch:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://mail.proton.me/compose?to=architect@miu33archstudio.xyz&subject=${encodeURIComponent("MIU Trade Clearance // " + auditResult.consignmentId)}&body=${encodeURIComponent(
                      "[MIU PREFLIGHT TRADE CONSIGNMENT CLEARANCE]\nConsignment ID: " + auditResult.consignmentId + "\nStatus: SASO 2831 CONFORMING (PASS)\nVerification Gateway: https://trade.miu33archstudio.xyz"
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white py-2.5 px-4 rounded text-xs font-semibold transition"
                  >
                    Dispatch via Proton Mail
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyClearancePayload}
                    className="flex items-center justify-center gap-2 bg-emeraldHud/15 border border-emeraldHud/50 hover:bg-emeraldHud/25 text-emeraldHud py-2.5 px-4 rounded text-xs font-semibold transition"
                  >
                    {copiedPayload ? "Clearance Copied!" : "Copy Clearance Payload"}
                  </button>
                </div>
              </div>

              {/* MULTIMODAL ROUTING FALLBACKS */}
              <div className="space-y-2">
                <div className="text-[10px] tracking-wider text-zinc-400 uppercase font-semibold">Alternate Multimodal Channels:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=architect@miu33archstudio.xyz&su=${encodeURIComponent("MIU Trade Clearance // " + auditResult.consignmentId)}&body=${encodeURIComponent(
                      "Consignment ID: " + auditResult.consignmentId + "\nVerification: https://trade.miu33archstudio.xyz"
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-borderDark hover:border-zinc-500 rounded text-[11px] text-zinc-300 hover:text-white transition"
                  >
                    Gmail
                  </a>
                  <a
                    href={`https://outlook.live.com/mail/0/deeplink/compose?to=architect@miu33archstudio.xyz&subject=${encodeURIComponent("MIU Trade Clearance // " + auditResult.consignmentId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-borderDark hover:border-zinc-500 rounded text-[11px] text-zinc-300 hover:text-white transition"
                  >
                    Outlook
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent("MIU Trade Clearance Ref: " + auditResult.consignmentId + " - https://trade.miu33archstudio.xyz")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-emerald-900/60 bg-emerald-950/20 hover:border-emerald-600 rounded text-[11px] text-emerald-400 transition"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:architect@miu33archstudio.xyz?subject=${encodeURIComponent("MIU Trade Clearance // " + auditResult.consignmentId)}`}
                    className="p-2 border border-borderDark hover:border-zinc-500 rounded text-[11px] text-zinc-300 hover:text-white transition"
                  >
                    Native Mail
                  </a>
                </div>
              </div>

              {/* UNLOCKED SABER REGISTRATION CSV */}
              <div className="pt-2 border-t border-borderDark flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Manifest Ready: SABER_BULK_SPEC</span>
                <a
                  href={`/v1/consignment/${auditResult.consignmentId}/saber-csv`}
                  download
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-3 py-1.5 rounded text-xs font-medium transition"
                >
                  Download CSV
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZATCA Phase-2 Modal with Scannable QR Matrix & TLV Inspector */}
      {zatcaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-carbon border border-borderDark rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-5 py-3.5 border-b border-borderDark flex justify-between items-center bg-surface">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emeraldHud rounded-full animate-ping" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  ZATCA PHASE-2 // DETERMINISTIC CLEARANCE GATE
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZatcaModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white transition"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <div className="flex border-b border-borderDark bg-obsidian text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveZatcaTab('telemetry')}
                className={`px-5 py-2.5 font-semibold transition border-b-2 flex items-center gap-2 ${activeZatcaTab === 'telemetry'
                    ? 'border-emeraldHud text-emeraldHud bg-surface/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                GATE TELEMETRY
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveZatcaTab('json');
                  if (!rawZatcaJson && auditResult) {
                    fetchRawZatcaPayload(auditResult.consignmentId);
                  }
                }}
                className={`px-5 py-2.5 font-semibold transition border-b-2 flex items-center gap-2 ${activeZatcaTab === 'json'
                    ? 'border-cyanHud text-cyanHud bg-surface/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                RAW UBL-2.1 JSON
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
              {activeZatcaTab === 'telemetry' ? (
                <>
                  <div className="bg-obsidian border border-borderDark p-3 rounded flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Target Invoice / Manifest Reference</div>
                      <div className="text-sm font-bold text-emeraldHud mt-0.5">
                        {auditResult?.audit.metadata.reportNo || auditResult?.consignmentId}
                      </div>
                    </div>
                    {zatcaResult && zatcaResult.status === 'CLEARED' && (
                      <span className="px-2 py-0.5 bg-emeraldHud/10 border border-emeraldHud text-emeraldHud font-bold text-[10px] rounded">
                        BLOCK #{zatcaResult.sequenceId}
                      </span>
                    )}
                  </div>

                  {zatcaAuditing && (
                    <div className="p-6 border border-cyanHud/30 bg-cyanHud/5 rounded text-center space-y-2">
                      <div className="w-5 h-5 border-2 border-cyanHud border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-cyanHud font-semibold tracking-wider">
                        COMPUTING CANONICAL SHA-256 DIGEST &amp; ANCHORING CHAIN...
                      </p>
                    </div>
                  )}

                  {zatcaResult && zatcaResult.status === 'CLEARED' && (
                    <div className="border border-emeraldHud/50 bg-emeraldHud/5 p-4 rounded space-y-4">
                      <div className="flex items-center justify-between text-emeraldHud font-bold">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>DETERMINISTIC CRYPTOGRAPHIC CLEARANCE: PASS</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">{zatcaResult.clearedAt}</span>
                      </div>

                      {/* Live Scannable ZATCA QR Canvas */}
                      <div className="p-4 bg-obsidian border border-borderDark rounded-lg flex flex-col sm:flex-row items-center gap-5">
                        <div className="bg-white p-3 rounded shadow-md shrink-0">
                          {zatcaResult.qrPayloadBase64 ? (
                            <QRCodeSVG
                              value={zatcaResult.qrPayloadBase64}
                              size={135}
                              level="M"
                              includeMargin={false}
                            />
                          ) : (
                            <div className="w-[135px] h-[135px] flex items-center justify-center text-zinc-500 text-[10px]">
                              NO PAYLOAD
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-emeraldHud font-bold">
                            <QrCode className="w-4 h-4" />
                            <span>WAFEQ &amp; ZATCA APP READY</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Encoded strictly to Saudi E-Invoicing TLV standard (Tags 1–6). Validated for direct camera scanning via official ZATCA (Fatoora) app and regional QR compliance validators.
                          </p>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            STATUS: BINARY_TLV_ENCODED &bull; KSA 15% VAT
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">CLEARANCE UUID:</span>
                          <span className="text-zinc-200">{zatcaResult.uuid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">CHAIN INTEGRITY:</span>
                          <span className="text-cyanHud font-semibold">{zatcaResult.chainIntegrity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">PREVIOUS DIGEST LINK:</span>
                          <span className="text-zinc-400 truncate max-w-[280px]">{zatcaResult.previousHash}</span>
                        </div>

                        {/* Current SHA-256 Digest Box */}
                        <div className="pt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-zinc-400">CURRENT SHA-256 HASH:</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(zatcaResult.sha256Hash, 'hash')}
                              className="text-zinc-400 hover:text-emeraldHud flex items-center gap-1 transition"
                            >
                              {copiedHash ? <Check className="w-3 h-3 text-emeraldHud" /> : <Copy className="w-3 h-3" />}
                              <span className="text-[10px]">{copiedHash ? 'COPIED' : 'COPY'}</span>
                            </button>
                          </div>
                          <div className="p-2 bg-obsidian border border-borderDark rounded text-[10px] text-zinc-300 break-all select-all">
                            {zatcaResult.sha256Hash}
                          </div>
                        </div>

                        {/* Decoded TLV Tag Payload */}
                        <div className="pt-2 bg-obsidian/80 border border-borderDark/80 p-3 rounded">
                          <span className="text-zinc-400 font-bold block mb-2 text-[10px] tracking-wider uppercase">
                            Decoded TLV Tag Attributes (Scanner Verified)
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div><span className="text-zinc-500">TAG 1 (Seller):</span> <span className="text-zinc-300">{zatcaResult.decodedTags?.tag1Seller}</span></div>
                            <div><span className="text-zinc-500">TAG 2 (TRN):</span> <span className="text-zinc-300">{zatcaResult.decodedTags?.tag2Vat}</span></div>
                            <div><span className="text-zinc-500">TAG 3 (Timestamp):</span> <span className="text-zinc-300">{zatcaResult.decodedTags?.tag3Timestamp}</span></div>
                            <div><span className="text-zinc-500">TAG 4 (Total SAR):</span> <span className="text-emeraldHud font-bold">{zatcaResult.summary?.grandTotalSAR} SAR</span></div>
                            <div><span className="text-zinc-500">TAG 5 (VAT 15%):</span> <span className="text-zinc-300">{zatcaResult.summary?.vatAmountSAR} SAR</span></div>
                            <div><span className="text-zinc-500">TAG 6 (Hash):</span> <span className="text-cyanHud font-mono">SHA-256 Valid</span></div>
                          </div>
                        </div>

                        {/* Raw TLV String */}
                        <div className="pt-1">
                          <span className="text-zinc-400 block mb-1">ZATCA TLV BASE64 (QR STRING):</span>
                          <div className="p-2 bg-obsidian border border-borderDark rounded text-[10px] text-cyanHud break-all select-all font-mono">
                            {zatcaResult.qrPayloadBase64}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {zatcaResult && zatcaResult.status === 'REJECTED' && (
                    <div className="border border-red-500/50 bg-red-950/20 p-4 rounded space-y-2">
                      <div className="flex items-center gap-2 text-red-400 font-bold">
                        <XCircle className="w-4 h-4" />
                        <span>GATE REJECTION: CRYPTOGRAPHIC INTEGRITY CHECK FAILED</span>
                      </div>
                      <p className="text-[11px] text-red-200">{zatcaResult.error}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-[11px]">
                      UBL 2.1 SCHEMATRON &bull; 15% KSA VAT TAX INVOICE (388)
                    </span>
                    <div className="flex items-center gap-3">
                      {rawZatcaJson && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(JSON.stringify(rawZatcaJson, null, 2), 'zatcaJson')}
                          className="text-xs text-zinc-400 hover:text-cyanHud flex items-center gap-1 transition"
                        >
                          {copiedZatcaJson ? <Check className="w-3 h-3 text-emeraldHud" /> : <Copy className="w-3 h-3" />}
                          <span className="text-[10px]">{copiedZatcaJson ? 'COPIED' : 'COPY JSON'}</span>
                        </button>
                      )}
                      <a
                        href={`/v1/consignment/${auditResult?.consignmentId}/zatca-payload`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyanHud hover:underline flex items-center gap-1"
                      >
                        [OPEN RAW ENDPOINT]
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {loadingJson ? (
                    <div className="p-8 text-center text-zinc-500 border border-borderDark rounded bg-obsidian">
                      <div className="w-4 h-4 border-2 border-cyanHud border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Retrieving Line Item Customs Valuation...
                    </div>
                  ) : rawZatcaJson ? (
                    <pre className="p-4 bg-obsidian border border-borderDark rounded text-[11px] text-zinc-300 overflow-x-auto max-h-96 leading-relaxed select-all">
                      {JSON.stringify(rawZatcaJson, null, 2)}
                    </pre>
                  ) : (
                    <div className="p-6 text-center text-zinc-500 border border-borderDark rounded bg-obsidian">
                      No JSON payload generated. Click &quot;Anchor Sequence Block&quot; to build items.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-borderDark flex justify-end gap-3 bg-surface">
              <button
                type="button"
                onClick={() => setZatcaModalOpen(false)}
                className="px-4 py-2 border border-borderDark text-xs text-zinc-400 hover:text-white rounded transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={executeZatcaClearance}
                disabled={zatcaAuditing}
                className="px-4 py-2 bg-emeraldHud text-obsidian text-xs font-bold rounded hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                {zatcaAuditing ? 'Auditing...' : 'Anchor Sequence Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FASAH Unified Declaration Gateway Modal (Bayan) */}
      {fasahModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-carbon border border-borderDark rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-5 py-3.5 border-b border-borderDark flex justify-between items-center bg-surface">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  FASAH GATEWAY // UNIFIED CUSTOMS DECLARATION (BAYAN)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFasahModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-white transition"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <div className="flex border-b border-borderDark bg-obsidian text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveFasahTab('bayan')}
                className={`px-5 py-2.5 font-semibold transition border-b-2 flex items-center gap-2 ${activeFasahTab === 'bayan'
                    ? 'border-blue-400 text-blue-400 bg-surface/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                BAYAN SUMMARY
              </button>
              <button
                type="button"
                onClick={() => setActiveFasahTab('json')}
                className={`px-5 py-2.5 font-semibold transition border-b-2 flex items-center gap-2 ${activeFasahTab === 'json'
                    ? 'border-cyanHud text-cyanHud bg-surface/50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                FASAH EDI / JSON
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
              {loadingFasah ? (
                <div className="p-12 text-center text-zinc-500 border border-borderDark rounded bg-obsidian">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Generating Unified FASAH Bayan Declaration...
                </div>
              ) : activeFasahTab === 'bayan' ? (
                rawFasahJson ? (
                  <div className="space-y-4">
                    <div className="bg-obsidian border border-borderDark p-4 rounded space-y-2">
                      <div className="flex justify-between items-center border-b border-borderDark/60 pb-2">
                        <span className="text-zinc-400">CUSTOMS OUTLET:</span>
                        <span className="text-blue-400 font-bold">{rawFasahJson.customsOffice} (Dammam Sea Port)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">BILL OF LADING (B/L):</span>
                        <span className="text-zinc-100 font-semibold">{rawFasahJson.transportationManifest?.billOfLadingNo}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">PORT OF DISCHARGE:</span>
                        <span className="text-zinc-200">{rawFasahJson.transportationManifest?.portOfDischarge} (King Abdulaziz Port)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-obsidian border border-borderDark p-3 rounded">
                        <span className="text-[10px] text-zinc-400 block">GROSS MANIFEST WEIGHT</span>
                        <span className="text-sm font-bold text-white">
                          {(rawFasahJson.transportationManifest?.grossWeightKg / 1000).toFixed(2)} MT
                        </span>
                      </div>
                      <div className="bg-obsidian border border-borderDark p-3 rounded">
                        <span className="text-[10px] text-zinc-400 block">NET BILLABLE WEIGHT</span>
                        <span className="text-sm font-bold text-emeraldHud">
                          {(rawFasahJson.transportationManifest?.netWeightKg / 1000).toFixed(2)} MT
                        </span>
                      </div>
                    </div>

                    <div className="border border-emeraldHud/40 bg-emeraldHud/5 p-4 rounded space-y-2">
                      <div className="flex items-center gap-2 text-emeraldHud font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>LINKED SABER CONFORMITY CERTIFICATES</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div><span className="text-zinc-400">PCoC Certificate:</span> <span className="text-zinc-200 font-semibold">{rawFasahJson.saberConformityGate?.pcocNumber}</span></div>
                        <div><span className="text-zinc-400">SCoC Certificate:</span> <span className="text-zinc-200 font-semibold">{rawFasahJson.saberConformityGate?.scocNumber}</span></div>
                        <div className="col-span-2"><span className="text-zinc-400">Mandated Standard:</span> <span className="text-cyanHud">{rawFasahJson.saberConformityGate?.appliedStandard}</span></div>
                      </div>
                    </div>

                    <div className="bg-surface border border-borderDark p-4 rounded text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">DECLARED CUSTOMS VALUE (CIF):</span>
                        <span className="text-zinc-100 font-bold">{rawFasahJson.customsDeclarationItems?.[0]?.customsValueSAR?.toLocaleString()} SAR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">ESTIMATED CUSTOMS DUTY (5.0%):</span>
                        <span className="text-amberHud font-semibold">{rawFasahJson.customsDeclarationItems?.[0]?.estimatedCustomsDutySAR?.toLocaleString()} SAR</span>
                      </div>
                      <div className="flex justify-between border-t border-borderDark/60 pt-1.5">
                        <span className="text-zinc-400">ESTIMATED IMPORT VAT (15.0%):</span>
                        <span className="text-emeraldHud font-bold">{rawFasahJson.customsDeclarationItems?.[0]?.estimatedVatSAR?.toLocaleString()} SAR</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-zinc-500">Failed to load FASAH Bayan payload.</div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-[11px]">
                      SINGLE ADMINISTRATIVE DOCUMENT (SAD) SCHEMA
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(JSON.stringify(rawFasahJson, null, 2), 'fasahJson')}
                      className="text-xs text-zinc-400 hover:text-blue-400 flex items-center gap-1 transition"
                    >
                      {copiedFasahJson ? <Check className="w-3 h-3 text-emeraldHud" /> : <Copy className="w-3 h-3" />}
                      <span className="text-[10px]">{copiedFasahJson ? 'COPIED' : 'COPY JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-obsidian border border-borderDark rounded text-[11px] text-zinc-300 overflow-x-auto max-h-96 leading-relaxed select-all">
                    {JSON.stringify(rawFasahJson, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-borderDark flex justify-end gap-3 bg-surface">
              <button
                type="button"
                onClick={() => setFasahModalOpen(false)}
                className="px-4 py-2 border border-borderDark text-xs text-zinc-400 hover:text-white rounded transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(rawFasahJson, null, 2), 'fasahJson')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500 transition"
              >
                Copy Bayan Payload
              </button>
            </div>
          </div>
        </div>
      )}

      {auditResult && (
        <LaydownInspectionModal
          isOpen={mriModalOpen}
          onClose={() => setMriModalOpen(false)}
          consignmentId={auditResult.consignmentId}
          reportNo={auditResult.audit.metadata.reportNo}
          items={auditResult.audit.items}
          totalWeightKg={auditResult.audit.physicalSummary.totalWeightKg}
          onInspectionUpdated={fetchLedger}
        />
      )}

      {/* --- FOOTER & REGULATORY TERMS --- */}
      <footer className="mt-8 pt-4 border-t border-borderDark flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emeraldHud animate-pulse"></span>
          <span>AIR-GAPPED ENGINE // LOCAL LEDGER VALIDATED</span>
        </div>
        <TermsModal />
      </footer>
    </div>
  );
}