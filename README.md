# TRADE_PREFLIGHT_OS // KSA CARGO & STANDARDS GATEWAY

Headless preflight discrepancy audit engine, customs manifest normalizer, and regulatory compliance gateway designed for Saudi customs clearance agents (`Mokhallis Jumruki`), project cargo logistics handlers, and heavy industrial EPC importers.

The system performs zero-cloud PDF parsing, physical transport safety auditing, and direct cryptographic compilation for official Saudi clearance platforms (**ZATCA Phase-2**, **FASAH Bayan**, and **SASO SABER**).

---

## Core Capabilities

- **Universal Mill Manifest Parsing:** Ingests complex supplier packing lists and bill of lading documents across dynamic, un-hardcoded column layouts.
- **Physical Safety & Rigging Overhang Checks:** Automatically identifies line-item tare/net mass drops, center-of-gravity discrepancies, and structural transport envelopes exceeding standard Saudi road limits ($>16.5\text{ m}$).
- **SASO 2831 & Saber Parity:** Mappable bulk CSV generation for immediate product registration (PCoC) and shipment conformity certification (SCoC).
- **FASAH Single Administrative Document (Bayan):** Instant compilation of customs declaration payloads mapped to Saudi port outlets (e.g., King Abdulaziz Port Customs, Dammam - `KAP_DAMMAM_01`).
- **ZATCA Phase-2 UBL-2.1 Clearance:** Generates Schematron-compliant tax payloads and renders dynamic Tag 1–5 binary TLV Base64 QR codes verified against live mobile validators (Wafeq, AmalERP, ZATCA Fatoora).
- **Air-Gapped Immutable Sequence Ledger:** Cryptographically links every audit run into a persistent local SQLite Write-Ahead Logging (WAL) hash chain ($H_n = \text{SHA256}(H_{n-1} \parallel \text{Payload})$).

---

## Architecture & Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS v4, `qrcode.react`, native air-gapped system monospace font fallback.
- **Backend:** Express, TypeScript, Multer, `pdf-parse`, native Node `crypto`.
- **Persistence:** SQLite3 configured with Write-Ahead Logging (`WAL`).
- **Runtime Target:** Air-gapped containerized deployment, intranet port terminals, or edge LAN nodes.

---

## Local Development

### 1. Prerequisites
- Node.js 20+ LTS
- Backend engine active on `http://localhost:4000`

### 2. Installation
```bash
npm install