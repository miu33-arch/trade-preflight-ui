'use client';

import React, { useState } from 'react';
import { ShieldAlert, X, Scale } from 'lucide-react';

export function TermsModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[11px] font-mono text-zinc-500 hover:text-emeraldHud transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <Scale className="w-3.5 h-3.5 text-emeraldHud" />
        <span>LEGAL_DISCLAIMER // REGULATORY_TERMS</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono">
          <div className="bg-[#0c0d0e] border border-zinc-700 w-full max-w-2xl rounded-lg p-6 shadow-2xl relative text-zinc-300 text-xs space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>TRADE_PREFLIGHT_OS // TERMS OF USE & DISCLAIMER</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-3 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 text-zinc-300 text-[12px]">
              <p>
                <strong className="text-white">1. Nature of the System:</strong>{" "}
                TRADE_PREFLIGHT_OS is an automated, edge-native mathematical audit and preflight anomaly verification engine. It is designed to assist licensed customs brokers (<em>Mokhallis Jumruki</em>), logistics agents, and industrial importers in detecting dimensional, weight, and tariff discrepancies prior to regulatory transmission.
              </p>

              <p>
                <strong className="text-white">2. Statutory Declaration Responsibility:</strong>{" "}
                The generated outputs—including FASAH Bayan JSON payloads, SASO SABER batch manifests, and ZATCA UBL-2.1 XML data—are preflight structural reconciliations. Use of this software does not constitute statutory customs clearance or official submission to the Zakat, Tax and Customs Authority (ZATCA) or the General Authority of Foreign Trade (GAFT). Final statutory compliance and declaration accuracy remain solely with the designated declarant and licensed broker.
              </p>

              <p>
                <strong className="text-white">3. Physical Transport &amp; Rigging Verification:</strong>{" "}
                Physical envelope checks (e.g., standard maximum lengths &gt; 16.5 meters, gross/net mass reconciliation, and axle constraints) are calculated based on supplied commercial packing lists. Importers and transport handlers must conduct independent physical load and rigging evaluations prior to highway transit under Saudi transport regulations.
              </p>

              <p>
                <strong className="text-white">4. Zero-Cloud Data Custody:</strong>{" "}
                This deployment operates under a strict air-gapped runtime model. Ingested documents, line-item tariffs, cryptographic hashes, and audit ledger records are processed strictly within your local environment and local SQLite database. No proprietary commercial data is transmitted to external cloud systems.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 rounded text-xs transition-colors font-bold cursor-pointer"
              >
                ACKNOWLEDGE &amp; CLOSE
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}