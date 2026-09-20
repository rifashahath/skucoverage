import React, { useState } from 'react';
import { StoreAuditData, CatalogIssue, FlaggedProduct, NavigationTab } from '../types';

interface CatalogHealthViewProps {
  auditStage: 'empty' | 'scanning' | 'results';
  auditData: StoreAuditData;
  onStartAudit: (storeDomain: string) => void;
  onCancelAudit: () => void;
  onInspectIssue: (issue: CatalogIssue) => void;
  onInspectProduct: (product: FlaggedProduct) => void;
  onBatchFix: () => void;
  onDownloadCsv: () => void;
  onOpenAuditScope: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
}

export const CatalogHealthView: React.FC<CatalogHealthViewProps> = ({
  auditStage,
  auditData,
  onStartAudit,
  onCancelAudit,
  onInspectIssue,
  onInspectProduct,
  onBatchFix,
  onDownloadCsv,
  onOpenAuditScope,
  onNavigateTab,
}) => {
  const [storeInput, setStoreInput] = useState(auditData?.storeDomain || '');
  const [scanStep] = useState<1 | 2 | 3>(2);
  const [findingFilter, setFindingFilter] = useState<'all' | 'confirmed' | 'verify' | 'improvements'>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = storeInput.trim();
    if (domain) {
      onStartAudit(domain);
    }
  };

  /* =========================================================================================
     STAGE 1: EMPTY / INITIAL DIAGNOSTIC STATE (Matches Image 1 & 7 HTML)
     ========================================================================================= */
  if (auditStage === 'empty') {
    return (
      <div className="flex flex-col w-full">
        {/* Subtle decorative ambient background glows */}
        <div className="relative w-full overflow-hidden pb-12">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-[#0058be]/10 via-[#eaedff]/40 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
          <div className="absolute top-48 -right-24 w-80 h-80 bg-[#6ffbbe]/20 blur-3xl pointer-events-none -z-10 rounded-full" />

          {/* Section 1: Hero & Scan Input Bar */}
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto pt-4 pb-10 px-4">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[11px] font-bold uppercase tracking-wider mb-4 shadow-xs">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>Diagnostic Engine Ready</span>
            </div>

            <h1 className="text-[32px] sm:text-[40px] font-extrabold text-[#131b2e] tracking-tight mb-2 leading-tight">
              Catalog Health Diagnostic
            </h1>

            <p className="text-[16px] text-[#424754] max-w-xl mb-8 leading-relaxed">
              Run deep structural checks on your Shopify product feed. Detect broken GTINs, orphaned variants, missing attributes, and SEO gaps.
            </p>

            {/* Search Pill Bar */}
            <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_25px_50px_-12px_rgba(15,23,42,0.12)] border border-[#e2e8f0]">
              <form onSubmit={handleSubmit} className="flex items-center w-full gap-2">
                <div className="flex items-center gap-2 pl-4 flex-1 min-w-0">
                  <span className="material-symbols-outlined text-[#727785] text-[22px] select-none shrink-0">
                    storefront
                  </span>
                  <input
                    type="text"
                    value={storeInput}
                    onChange={(e) => setStoreInput(e.target.value)}
                    placeholder="your-store.myshopify.com"
                    required
                    className="w-full bg-transparent text-[14px] text-[#131b2e] placeholder:text-[#727785] focus:outline-hidden py-2 tracking-tight truncate"
                  />
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-[#f2f3ff] text-[11px] font-semibold text-[#424754] shrink-0 select-none">
                    Shopify
                  </span>
                </div>
                <button
                  type="submit"
                  className="shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-[#3b82f6] to-[#406ae4] text-white text-[14px] px-6 py-3 rounded-full shadow-[0_8px_20px_-2px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_24px_-2px_rgba(59,130,246,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold cursor-pointer"
                >
                  <span>Run audit</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>
            </div>

            {/* Verified metadata tags under input */}
            <div className="flex items-center justify-center flex-wrap gap-4 mt-4 text-[11px] font-semibold text-[#727785]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#006c49]">lock</span>
                Read-only storefront API
              </span>
              <span className="w-1 h-1 rounded-full bg-[#c2c6d6]" />
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#006c49]">bolt</span>
                ~45 seconds scan
              </span>
              <span className="w-1 h-1 rounded-full bg-[#c2c6d6]" />
              <span>Zero app install</span>
            </div>
          </div>

          {/* Section 2: Four Diagnostic Metric Tiles (Empty State) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {/* Card 1: Health Score */}
            <div className="group relative bg-[#f2f3ff] rounded-[14px] p-6 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
                  Health score
                </span>
                <div className="w-8 h-8 rounded-full bg-[#eaedff] flex items-center justify-center text-[#727785] group-hover:text-[#0058be] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">favorite</span>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[40px] text-[#727785] font-extrabold leading-none">—</span>
                <span className="text-[11px] text-[#727785] font-semibold">/ 100</span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#727785] text-[12px]">
                <span className="material-symbols-outlined text-[15px]">hourglass_empty</span>
                <span>Awaiting first store run</span>
              </div>
            </div>

            {/* Card 2: Total Products */}
            <div className="group relative bg-[#f2f3ff] rounded-[14px] p-6 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
                  Products
                </span>
                <div className="w-8 h-8 rounded-full bg-[#eaedff] flex items-center justify-center text-[#727785] group-hover:text-[#0058be] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[40px] text-[#131b2e] font-extrabold leading-none">0</span>
                <span className="text-[11px] text-[#727785] font-semibold">SKUs</span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#727785] text-[12px]">
                <span className="material-symbols-outlined text-[15px]">pending</span>
                <span>0 variants indexed</span>
              </div>
            </div>

            {/* Card 3: Confirmed Issues */}
            <div className="group relative bg-[#f2f3ff] rounded-[14px] p-6 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
                  Confirmed issues
                </span>
                <div className="w-8 h-8 rounded-full bg-[#eaedff] flex items-center justify-center text-[#727785] group-hover:text-[#0058be] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">rule</span>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[40px] text-[#131b2e] font-extrabold leading-none">0</span>
                <span className="text-[11px] text-[#727785] font-semibold">confirmed</span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#727785] text-[12px]">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                <span>No confirmed issues yet</span>
              </div>
            </div>

            {/* Card 4: Needs Verification */}
            <div className="group relative bg-[#f2f3ff] rounded-[14px] p-6 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
                  Needs verification
                </span>
                <div className="w-8 h-8 rounded-full bg-[#eaedff] flex items-center justify-center text-[#727785] group-hover:text-[#ba1a1a] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[40px] text-[#131b2e] font-extrabold leading-none">0</span>
                <span className="text-[11px] text-[#727785] font-semibold">to verify</span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-[#727785] text-[12px]">
                <span className="material-symbols-outlined text-[15px]">shield</span>
                <span>Nothing awaiting verification</span>
              </div>
            </div>
          </div>

          {/* Section 3: 3-Step Getting Started Card */}
          <div className="bg-white rounded-[20px] p-6 sm:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.08)] relative overflow-hidden border border-[#e2e8f0]">
            <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 mb-6 gap-4 border-b border-[#eaedff]">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0058be] mb-1">
                  <span className="material-symbols-outlined text-[16px]">speed</span>
                  <span>Zero-configuration workflow</span>
                </div>
                <h2 className="text-[28px] sm:text-[32px] font-extrabold text-[#131b2e] tracking-tight">
                  Get started in 3 simple steps
                </h2>
                <p className="text-[15px] text-[#424754] mt-1">
                  Audit your catalog against Shopify best practices in under 60 seconds.
                </p>
              </div>

              {/* Visual live readiness badge */}
              <div className="flex items-center gap-2 self-start md:self-auto bg-[#f2f3ff] px-4 py-1.5 rounded-full">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c49] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#006c49]"></span>
                </span>
                <span className="text-[12px] font-bold text-[#131b2e]">Engine v2.4 Active</span>
              </div>
            </div>

            {/* 3 Steps Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Step 1 */}
              <div className="flex flex-col bg-[#f2f3ff] rounded-2xl p-6 transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#d8e2ff] flex items-center justify-center shadow-inner">
                    <span className="text-[18px] font-bold text-[#001a42]">1</span>
                  </div>
                  <span className="material-symbols-outlined text-[#727785] text-[24px]">link</span>
                </div>
                <h3 className="text-[18px] font-bold text-[#131b2e] mb-1">
                  Enter your store URL
                </h3>
                <p className="text-[14px] text-[#424754] flex-1 mb-4">
                  Paste your public{' '}
                  <code className="text-[11px] bg-[#eaedff] px-1 py-0.5 rounded text-[#0058be]">
                    myshopify.com
                  </code>{' '}
                  domain above. No code or app install required.
                </p>
                <div className="pt-2 flex items-center gap-1 text-[#0058be] text-[12px] font-semibold">
                  <span>Instant connection</span>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col bg-[#f2f3ff] rounded-2xl p-6 transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#d8e2ff] flex items-center justify-center shadow-inner">
                    <span className="text-[18px] font-bold text-[#001a42]">2</span>
                  </div>
                  <span className="material-symbols-outlined text-[#727785] text-[24px]">
                    document_scanner
                  </span>
                </div>
                <h3 className="text-[18px] font-bold text-[#131b2e] mb-1">
                  Run instant catalog audit
                </h3>
                <p className="text-[14px] text-[#424754] flex-1 mb-4">
                  We scan titles, descriptions, GTINs, image attributes, and product variants across all collections.
                </p>
                <div className="pt-2 flex items-center gap-1 text-[#0058be] text-[12px] font-semibold">
                  <span>50+ parameter tests</span>
                  <span className="material-symbols-outlined text-[16px]">insights</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col bg-[#f2f3ff] rounded-2xl p-6 transition-transform hover:-translate-y-1 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#d8e2ff] flex items-center justify-center shadow-inner">
                    <span className="text-[18px] font-bold text-[#001a42]">3</span>
                  </div>
                  <span className="material-symbols-outlined text-[#727785] text-[24px]">
                    download_for_offline
                  </span>
                </div>
                <h3 className="text-[18px] font-bold text-[#131b2e] mb-1">
                  Export &amp; fix issues
                </h3>
                <p className="text-[14px] text-[#424754] flex-1 mb-4">
                  Download priority fix lists and boost your Google Shopping / Meta feed coverage immediately.
                </p>
                <div className="pt-2 flex items-center gap-1 text-[#006c49] text-[12px] font-semibold">
                  <span>Ready-to-use CSV / Matrix</span>
                  <span className="material-symbols-outlined text-[16px]">file_download</span>
                </div>
              </div>
            </div>

            {/* Interactive Benchmark Graphic Banner */}
            <div className="mt-6 bg-[#eaedff] rounded-2xl p-6 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#6ffbbe] flex items-center justify-center shrink-0 text-[#002113]">
                  <span className="material-symbols-outlined text-[22px]">trending_up</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-[#131b2e]">
                    Standard Catalog Benchmark
                  </span>
                  <span className="text-[12px] text-[#424754]">
                    Top-performing Shopify Plus merchants maintain an average Health Score of 94.2/100.
                  </span>
                </div>
              </div>

              {/* Inline SVG Visualization: mini score bar */}
              <div className="flex items-center gap-3 w-full lg:w-72 shrink-0">
                <div className="flex-1 bg-white h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div className="bg-gradient-to-r from-[#0058be] to-[#006c49] h-full rounded-full w-[94.2%] transition-all duration-700" />
                </div>
                <span className="text-[12px] font-bold text-[#131b2e] shrink-0">94.2% Peak</span>
              </div>
            </div>
          </div>

          {/* Visual Sample Previews / Mock Insights Strip */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f2f3ff] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#0058be] shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[24px]">barcode_scanner</span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] text-[#131b2e] font-bold truncate">Barcode &amp; GTIN Coverage</div>
                <div className="text-[12px] text-[#424754]">Flags UPC, EAN, and ISBN format syntax errors.</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f2f3ff] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#006c49] shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[24px]">image_search</span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] text-[#131b2e] font-bold truncate">Variant Media Mapping</div>
                <div className="text-[12px] text-[#424754]">Uncovers unassigned variant thumbnails &amp; low-res assets.</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f2f3ff] shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#825100] shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[24px]">troubleshoot</span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] text-[#131b2e] font-bold truncate">Merchant Center Compliance</div>
                <div className="text-[12px] text-[#424754]">Matches product types against taxonomy taxonomies.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================================
     STAGE 2: SCANNING IN PROGRESS STATE (Matches Image 3 & 9 HTML)
     ========================================================================================= */
  if (auditStage === 'scanning') {
    return (
      <div className="flex flex-col w-full gap-6">
        {/* Top Scan Control Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-2 bg-white rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] border border-[#c2c6d6]/30">
          <div className="flex items-center gap-3 pl-4 flex-1">
            <span className="material-symbols-outlined text-[#0058be] text-[22px]">storefront</span>
            <div className="flex items-center gap-2 text-[14px] text-[#131b2e]">
              <span className="font-bold text-[#131b2e]">{auditData.storeDomain}</span>
              <span className="text-[11px] text-[#006c49] bg-[#006c49]/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                Live API
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#e2e7ff] text-[#424754] text-[13px] font-semibold shadow-inner select-none cursor-wait">
              <span>Scanning...</span>
              <svg className="animate-spin h-4 w-4 text-[#0058be]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <button
              onClick={onCancelAudit}
              className="h-10 px-4 rounded-full text-[#424754] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors text-[14px] font-semibold flex items-center justify-center cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Metric Placeholder Row (Empty State during scan) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col justify-between p-5 rounded-[14px] bg-[#f2f3ff] border border-[#c2c6d6]/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#727785] font-bold">
                Catalog quality score
              </span>
              <span className="material-symbols-outlined text-[#727785] text-[18px]">verified_user</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-[36px] text-[#c2c6d6] tracking-tight font-extrabold animate-pulse">—</span>
            </div>
            <span className="text-[12px] text-[#727785] mt-1">Awaiting scan results</span>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c2c6d6]/30" />
          </div>

          <div className="flex flex-col justify-between p-5 rounded-[14px] bg-[#f2f3ff] border border-[#c2c6d6]/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#727785] font-bold">
                Total SKUs
              </span>
              <span className="material-symbols-outlined text-[#727785] text-[18px]">inventory_2</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-[36px] text-[#c2c6d6] tracking-tight font-extrabold animate-pulse">—</span>
            </div>
            <span className="text-[12px] text-[#727785] mt-1">Fetching payload...</span>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c2c6d6]/30" />
          </div>

          <div className="flex flex-col justify-between p-5 rounded-[14px] bg-[#f2f3ff] border border-[#c2c6d6]/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#727785] font-bold">
                Audit Issues
              </span>
              <span className="material-symbols-outlined text-[#727785] text-[18px]">rule</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-[36px] text-[#c2c6d6] tracking-tight font-extrabold animate-pulse">—</span>
            </div>
            <span className="text-[12px] text-[#727785] mt-1">Evaluating catalog rules</span>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c2c6d6]/30" />
          </div>

          <div className="flex flex-col justify-between p-5 rounded-[14px] bg-[#f2f3ff] border border-[#c2c6d6]/30 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#727785] font-bold">
                High-confidence warnings
              </span>
              <span className="material-symbols-outlined text-[#727785] text-[18px]">error</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-[36px] text-[#c2c6d6] tracking-tight font-extrabold animate-pulse">—</span>
            </div>
            <span className="text-[12px] text-[#727785] mt-1">GTIN &amp; variant blockers</span>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c2c6d6]/30" />
          </div>
        </div>

        {/* Central Live Diagnostic Card */}
        <div className="w-full bg-white rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-[#c2c6d6]/30 p-8 sm:p-12 text-center relative overflow-hidden">
          {/* Ambient glowing backdrop effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d8e2ff]/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            {/* Animated Circular Radar / Pulse Loader */}
            <div className="relative flex items-center justify-center w-36 h-36 mb-6">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#0058be]/15 animate-ping duration-1000" />
              <span className="absolute inline-flex h-28 w-28 rounded-full bg-[#0058be]/20 animate-pulse" />

              {/* Rotating SVG Ring */}
              <svg className="w-24 h-24 -rotate-90 animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 100 100">
                <circle className="text-[#e2e7ff]" cx="50" cy="50" fill="none" r="42" stroke="currentColor" strokeWidth="5" />
                <circle
                  className="text-[#0058be]"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="42"
                  stroke="currentColor"
                  strokeDasharray="264"
                  strokeDashoffset="140"
                  strokeLinecap="round"
                  strokeWidth="5"
                />
              </svg>

              {/* Center Node Icon */}
              <div className="absolute flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-[0_8px_20px_-2px_rgba(59,130,246,0.25)] border border-[#c2c6d6]/20">
                <span className="material-symbols-outlined text-[#0058be] text-[28px]">
                  barcode_scanner
                </span>
              </div>
            </div>

            {/* Main Scan Heading */}
            <h2 className="text-[26px] sm:text-[32px] text-[#131b2e] tracking-tight font-extrabold mb-1">
              Analyzing <span className="text-[#0058be]">{auditData.storeDomain}</span>...
            </h2>
            <p className="text-[15px] text-[#424754] max-w-lg mb-8 leading-relaxed">
              Checking product titles, missing GTIN barcodes, variant image mapping, and Google Shopping attributes.
            </p>

            {/* Step Indicators with Live Check Badges */}
            <div className="w-full flex flex-col gap-2.5 mb-8 text-left">
              {/* Step 1 */}
              <div className="flex items-center justify-between p-3 px-4 rounded-full bg-[#f2f3ff] border border-[#c2c6d6]/30 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#006c49] text-white">
                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                  </span>
                  <span className="text-[14px] text-[#131b2e] font-semibold">Shopify public storefront feed connected</span>
                </div>
                <span className="text-[11px] text-[#006c49] font-bold tracking-wide">CONNECTED</span>
              </div>

              {/* Step 2: Running */}
              <div
                className={`flex items-center justify-between p-3 px-4 rounded-full border shadow-xs transition-all ${
                  scanStep === 2
                    ? 'bg-[#e2e7ff] border-[#0058be]/30 relative overflow-hidden'
                    : 'bg-[#f2f3ff] border-[#c2c6d6]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${
                    scanStep === 2 ? 'bg-[#0058be] text-white animate-pulse' : 'bg-[#006c49] text-white'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {scanStep === 2 ? 'sync' : 'check'}
                    </span>
                  </span>
                  <span className="text-[14px] text-[#131b2e] font-semibold">
                    Inspecting Google Shopping attributes &amp; GTINs...
                  </span>
                </div>
                {scanStep === 2 ? (
                  <span className="text-[11px] text-[#0058be] font-bold tracking-wide flex items-center gap-1">
                    RUNNING
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0058be] animate-ping" />
                  </span>
                ) : (
                  <span className="text-[11px] text-[#006c49] font-bold tracking-wide">COMPLETED</span>
                )}
              </div>

              {/* Step 3: Queued or Running */}
              <div
                className={`flex items-center justify-between p-3 px-4 rounded-full border transition-all ${
                  scanStep === 3
                    ? 'bg-[#e2e7ff] border-[#0058be]/30'
                    : 'bg-[#f2f3ff] border-[#c2c6d6]/20 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${
                    scanStep === 3 ? 'bg-[#0058be] text-white animate-pulse' : 'bg-[#c2c6d6]/40 text-[#424754]'
                  }`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {scanStep === 3 ? 'sync' : 'hourglass_empty'}
                    </span>
                  </span>
                  <span className={`text-[14px] ${scanStep === 3 ? 'text-[#131b2e] font-semibold' : 'text-[#424754]'}`}>
                    Calculating catalog health score &amp; fixes...
                  </span>
                </div>
                <span className={`text-[11px] font-bold tracking-wide ${scanStep === 3 ? 'text-[#0058be]' : 'text-[#727785]'}`}>
                  {scanStep === 3 ? 'RUNNING' : 'QUEUED'}
                </span>
              </div>
            </div>

            {/* Live Scan Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e2e7ff] text-[#424754] text-[13px] border border-[#c2c6d6]/30">
              <span className="material-symbols-outlined text-[#0058be] text-[16px] animate-spin">progress_activity</span>
              <span>
                Audit in progress: <strong className="text-[#131b2e] font-bold">Scanning catalog products &amp; taxonomy</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Event Stream / Stream Logs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white border border-[#c2c6d6]/30 shadow-xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e2e7ff] flex items-center justify-center text-[#0058be] shrink-0">
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] text-[#131b2e] font-bold">GTIN Barcode Validation</span>
              <span className="text-[12px] text-[#424754] mt-0.5">
                Scanning 12-digit UPCs &amp; 13-digit EAN records across all variant matrices.
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white border border-[#c2c6d6]/30 shadow-xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e2e7ff] flex items-center justify-center text-[#0058be] shrink-0">
              <span className="material-symbols-outlined text-[20px]">aspect_ratio</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] text-[#131b2e] font-bold">Media Fidelity Check</span>
              <span className="text-[12px] text-[#424754] mt-0.5">
                Auditing image resolutions against Merchant Center &amp; Meta 1000px standards.
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white border border-[#c2c6d6]/30 shadow-xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e2e7ff] flex items-center justify-center text-[#0058be] shrink-0">
              <span className="material-symbols-outlined text-[20px]">account_tree</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] text-[#131b2e] font-bold">Taxonomy Hierarchy</span>
              <span className="text-[12px] text-[#424754] mt-0.5">
                Ensuring standard product categories align with latest Shopify 2025 specs.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================================
     STAGE 3: AUDIT RESULTS STATE (Matches Image 5 HTML)
     ========================================================================================= */
  const titleQualityScore = auditData.attributeBreakdown.find((attr) => attr.name === 'Titles')?.score;
  const incompleteTitleCount = auditData.issues.find((issue) => issue.id.includes('incomplete_title'))?.count;
  const gtinAttribute = auditData.attributeBreakdown.find((attr) => attr.name === 'GTIN / barcode format');
  // The bucket split the report displays; totals always reconcile with the list.
  const findingSummary = auditData.findingSummary ?? {
    confirmedIssues: auditData.detectedIssuesCount,
    verificationItems: 0,
    opportunities: 0,
    totalFindings: auditData.detectedIssuesCount,
    highPriorityConfirmed: auditData.highPriorityCount,
  };
  const confirmedIssuesList = auditData.issues.filter((issue) => (issue.status || 'observed') === 'observed');
  const verificationIssuesList = auditData.issues.filter((issue) => issue.status === 'needs_verification');
  const opportunityIssuesList = auditData.issues.filter((issue) => issue.status === 'heuristic');

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Scan Status & Re-run Bar */}
      <section className="w-full flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 sm:p-2 sm:pl-6 sm:pr-2 bg-white rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#c2c6d6]/30">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#eaedff] text-[#0058be]">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
              Target Storefront
            </span>
            <span className="break-all text-[14px] min-[390px]:text-[16px] font-bold text-[#131b2e]">{auditData.storeDomain}</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6ffbbe] text-[#002113] text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#006c49]" />
            Audit Complete
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:justify-end">
          <button
            onClick={onOpenAuditScope}
            className="min-h-11 justify-center text-[12px] min-[390px]:text-[14px] font-semibold text-[#424754] hover:text-[#131b2e] px-2 min-[390px]:px-4 py-2 transition-colors flex items-center gap-1 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Audit Scope
          </button>
          <button
            onClick={() => onStartAudit(auditData.storeDomain)}
            className="min-h-11 justify-center text-[12px] min-[390px]:text-[14px] font-bold text-white bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:opacity-95 px-6 py-2 rounded-full shadow-[0_8px_20px_rgba(59,130,246,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer active:translate-y-0"
            type="button"
          >
            <span>Re-run audit</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Merchant-first summary: the result in plain language before any detail. */}
      <section className="rounded-[20px] border border-[#c2c6d6]/40 bg-gradient-to-br from-white to-[#f2f3ff] p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <span className={`material-symbols-outlined mt-0.5 text-[24px] ${findingSummary.confirmedIssues > 0 ? 'text-[#ba1a1a]' : 'text-[#006c49]'}`}>
            {findingSummary.confirmedIssues > 0 ? 'warning' : 'check_circle'}
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#0058be]">Your audit summary</div>
            <h2 className="mt-1 text-[20px] font-extrabold leading-snug text-[#131b2e] sm:text-[24px]">
              {findingSummary.confirmedIssues === 0
                ? 'No confirmed storefront errors found.'
                : `${findingSummary.confirmedIssues} confirmed storefront ${findingSummary.confirmedIssues === 1 ? 'issue' : 'issues'} found.`}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#424754]">
              {findingSummary.verificationItems} {findingSummary.verificationItems === 1 ? 'product needs' : 'products need'} verification.{' '}
              {findingSummary.opportunities} possible {findingSummary.opportunities === 1 ? 'improvement was' : 'improvements were'} found.
            </p>
          </div>
        </div>
      </section>

      {/* Four decisions merchants need first. Confirmed and total stay secondary unless action is required. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[14px] bg-[#f2f3ff] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">Health score</span>
            <span className="material-symbols-outlined text-[20px] text-[#825100]">analytics</span>
          </div>
          <div className="mt-4 flex items-baseline gap-1"><span className="text-[40px] font-extrabold leading-none text-[#825100]">{auditData.healthScore}</span><span className="text-[18px] font-bold text-[#825100]">/100</span></div>
          <div className="mt-2 text-[12px] text-[#727785]">{auditData.scoreStatus} storefront quality</div>
        </div>
        <div className="rounded-[14px] bg-[#f2f3ff] p-5 shadow-xs">
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">Products reviewed</span><span className="material-symbols-outlined text-[20px] text-[#0058be]">inventory_2</span></div>
          <div className="mt-4 flex items-baseline gap-1"><span className="text-[40px] font-extrabold leading-none text-[#131b2e]">{auditData.productsCount}</span><span className="text-[14px] font-semibold text-[#727785]">products</span></div>
          <div className="mt-2 text-[12px] text-[#727785]">Public storefront snapshot</div>
        </div>
        <div className="rounded-[14px] border border-[#0058be]/10 bg-[#edf3ff] p-5 shadow-xs">
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-[#004395]">Needs verification</span><span className="material-symbols-outlined text-[20px] text-[#004395]">fact_check</span></div>
          <div className="mt-4 flex items-baseline gap-1"><span className="text-[40px] font-extrabold leading-none text-[#004395]">{findingSummary.verificationItems}</span><span className="text-[14px] font-semibold text-[#004395]">to review</span></div>
          <div className="mt-2 text-[12px] text-[#424754]">Not confirmed errors</div>
        </div>
        <div className="rounded-[14px] border border-[#825100]/10 bg-[#fff8ed] p-5 shadow-xs">
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-[#825100]">Suggested improvements</span><span className="material-symbols-outlined text-[20px] text-[#825100]">tips_and_updates</span></div>
          <div className="mt-4 flex items-baseline gap-1"><span className="text-[40px] font-extrabold leading-none text-[#825100]">{findingSummary.opportunities}</span><span className="text-[14px] font-semibold text-[#825100]">suggestions</span></div>
          <div className="mt-2 text-[12px] text-[#424754]">Possible improvements</div>
        </div>
      </section>

      <section className={`rounded-2xl border p-4 sm:p-5 ${findingSummary.confirmedIssues > 0 ? 'border-[#ba1a1a]/20 bg-[#fff4f2]' : 'border-[#c2c6d6]/40 bg-white'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[13px] text-[#424754]">
            <strong className="text-[#131b2e]">{findingSummary.confirmedIssues} confirmed</strong> · {findingSummary.verificationItems} to verify · {findingSummary.opportunities} suggested improvements
          </div>
          <div className="text-[12px] font-semibold text-[#727785]">{findingSummary.totalFindings} total findings</div>
        </div>
        <details className="mt-3 border-t border-[#c2c6d6]/30 pt-3 text-[12px] text-[#424754]">
          <summary className="cursor-pointer font-semibold text-[#0058be]">What was reviewed</summary>
          <p className="mt-2">Assessed {auditData.scanned ?? auditData.productsCount} products returned by the public storefront feed. This best-effort snapshot does not include Merchant Center diagnostics, inaccessible products, or GS1 ownership data.</p>
        </details>
      </section>

      {/* Large White Main Result Card */}
      <article className="bg-white rounded-[20px] p-6 lg:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)] flex flex-col gap-8 border border-[#e2e8f0]">
        {/* Header Area */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#eaedff]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
                Storefront Report
              </span>
              <h1 className="text-[26px] sm:text-[32px] font-extrabold text-[#131b2e] tracking-tight">
                {auditData.storeDomain}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-bold text-[#825100]">
                {auditData.healthScore}/100
              </span>
              <span className="px-3 py-1 rounded-full bg-[#ffddb8] text-[#2a1700] text-[11px] font-bold">
                {auditData.scoreStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onDownloadCsv}
              className="text-[14px] font-semibold text-[#424754] hover:text-[#131b2e] bg-[#f2f3ff] hover:bg-[#eaedff] px-5 py-2 rounded-full shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download CSV</span>
            </button>
            <button
              onClick={onBatchFix}
              className="text-[14px] font-bold text-white bg-[#0058be] hover:bg-[#2170e4] px-5 py-2 rounded-full shadow-md transition-all flex items-center gap-1.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
              <span>Preview fixes</span>
            </button>
          </div>
        </div>

        {/* Visual Attribute Breakdown Grid */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-[18px] font-bold text-[#131b2e]">Catalog Attribute Breakdown</h2>
              <p className="text-[12px] text-[#424754]">
                Average quality scores from the storefront fields reviewed. A score is not the same as the share of products without warnings.
              </p>
            </div>
            <span
              onClick={onOpenAuditScope}
              className="text-[12px] text-[#0058be] font-semibold flex items-center gap-1 cursor-pointer hover:underline"
            >
              <span>Scoring method</span>
              <span className="material-symbols-outlined text-[16px]">info</span>
            </span>
          </div>

          <details className="rounded-xl border border-[#c2c6d6]/40 bg-[#faf8ff] p-4 text-[12px] text-[#424754]">
            <summary className="cursor-pointer font-bold text-[#0058be]">How this score is calculated</summary>
            <div className="mt-3 font-bold text-[#131b2e]">Unverified fields don&apos;t lower your score</div>
            <p className="mt-1 font-semibold text-[#131b2e]">
              {auditData.healthScore}/100 is a storefront quality score, not a Merchant Center approval score.
            </p>
            <p className="mt-1">
              {auditData.scoring?.formula?.perProduct ?? 'Per product: sum(field score x field weight) / sum(weights of the fields assessed for that product).'}{' '}
              {auditData.scoring?.formula?.overall ?? 'The overall score is the average of the per-product scores across reviewed products.'}{' '}
              Weights: title 20%, description 10%, GTIN 30%, product type 15%, image count 20%, variants 5%.
            </p>
            <p className="mt-1">
              {auditData.scoring?.formula?.unassessed ?? 'A field that cannot be assessed for a product is dropped and the remaining weights are rescaled to 100%, so missing data never counts as 0 or 100.'}
              {gtinAttribute?.score == null && gtinAttribute?.unavailableProducts != null
                ? ` In this scan, GTIN / barcode format could not be assessed for ${gtinAttribute.unavailableProducts} of ${auditData.productsCount} products, so its 30% weight was redistributed across the assessed fields.`
                : ''}
            </p>
            <p className="mt-1">
              {titleQualityScore != null && incompleteTitleCount != null
                ? `Example from this scan: title quality is ${titleQualityScore}% while ${incompleteTitleCount} products carry a "may be missing useful detail" opportunity. Incomplete titles receive partial credit, so a quality score and a finding count measure different things.`
                : 'Attribute scores measure field quality, while finding counts measure how many reviewed products matched a rule.'}{' '}
              The score is calculated from product fields, not issue-instance counts. Each bar names the field actually observed. This is not a pass rate, Google-category score, image-resolution check, or Merchant Center verdict.
            </p>
          </details>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#f2f3ff] rounded-2xl">
            {auditData.attributeBreakdown.map((attr) => {
              const colorClasses = {
                secondary: { text: 'text-[#006c49]', bar: 'bg-[#006c49]' },
                tertiary: { text: 'text-[#825100]', bar: 'bg-[#825100]' },
                error: { text: 'text-[#ba1a1a]', bar: 'bg-[#ba1a1a]' },
                primary: { text: 'text-[#0058be]', bar: 'bg-[#0058be]' },
              }[attr.color];

              return (
                <div key={attr.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#131b2e]">{attr.name}</span>
                    <span className={`text-[13px] font-bold ${colorClasses.text}`}>
                      {attr.score == null ? 'Not assessed' : `${attr.score}%`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#e2e7ff] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colorClasses.bar} transition-all duration-700`}
                      style={{ width: `${attr.score ?? 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#727785]">
                    {attr.score == null
                      ? `${attr.unavailableProducts ?? auditData.productsCount} products unavailable from this source`
                      : `${attr.assessedProducts ?? auditData.productsCount} products assessed · public storefront`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Merchant-facing findings. Product-level evidence stays in the drawer. */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[#131b2e]">Findings</h2>
              <p className="mt-1 text-[12px] text-[#424754]">Choose a group, then open it to review the affected products and evidence.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex" role="group" aria-label="Filter findings">
              {[
                { key: 'all', label: `All (${findingSummary.totalFindings})` },
                { key: 'confirmed', label: `Confirmed (${findingSummary.confirmedIssues})` },
                { key: 'verify', label: `Verify (${findingSummary.verificationItems})` },
                { key: 'improvements', label: `Improvements (${findingSummary.opportunities})` },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={findingFilter === filter.key}
                  onClick={() => setFindingFilter(filter.key as typeof findingFilter)}
                  className={`min-h-10 rounded-full px-3 py-2 text-[11px] font-bold transition-colors sm:text-[12px] ${findingFilter === filter.key ? 'bg-[#0058be] text-white' : 'bg-[#f2f3ff] text-[#424754] hover:bg-[#e2e7ff]'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {[
            { key: 'confirmed', filter: 'confirmed', heading: 'Confirmed issues', count: findingSummary.confirmedIssues, caption: 'Problems observed directly in the storefront data.', action: 'Review confirmed issues', list: confirmedIssuesList },
            { key: 'verify', filter: 'verify', heading: 'Needs verification', count: findingSummary.verificationItems, caption: 'The public storefront could not confirm these. They are not proven errors.', action: 'Review GTINs', list: verificationIssuesList },
            { key: 'improvements', filter: 'improvements', heading: 'Suggested improvements', count: findingSummary.opportunities, caption: 'Possible ways to improve product data, not definite errors.', action: 'Review suggestions', list: opportunityIssuesList },
          ]
            .filter((group) => findingFilter === 'all' || findingFilter === group.filter)
            .map((group) => (
              <div key={group.key} className="overflow-hidden rounded-2xl border border-[#c2c6d6]/40 bg-white">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[#131b2e]">{group.heading} <span className="text-[#727785]">({group.count})</span></h3>
                    <p className="mt-1 text-[12px] text-[#424754]">{group.caption}</p>
                  </div>
                  {group.list.length > 0 ? (
                    <button type="button" onClick={() => onInspectIssue(group.list[0])} className="min-h-10 shrink-0 rounded-full bg-[#0058be] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#2170e4]">
                      {group.action}
                    </button>
                  ) : (
                    <span className="inline-flex min-h-10 items-center rounded-full bg-[#eef9f3] px-4 text-[12px] font-bold text-[#006c49]">Nothing to review</span>
                  )}
                </div>
                {group.list.length > 0 && (
                  <div className="border-t border-[#c2c6d6]/30 bg-[#f8f9ff] px-4 py-2 sm:px-5">
                    {group.list.map((issue) => (
                      <div key={issue.id} className="flex flex-col gap-1 border-b border-[#c2c6d6]/20 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#131b2e]">{issue.title}</div>
                          <div className="line-clamp-2 text-[11px] text-[#727785]">{issue.description}</div>
                        </div>
                        <span className="shrink-0 text-[12px] font-bold text-[#424754]">{issue.count} {issue.status === 'needs_verification' ? 'to verify' : issue.status === 'heuristic' ? 'suggestions' : 'findings'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

          <details className="rounded-xl bg-[#faf8ff] p-4 text-[12px] text-[#424754]">
            <summary className="cursor-pointer font-semibold text-[#0058be]">See how totals are calculated</summary>
            <div className="mt-3 space-y-1">
              <div>Total findings: {findingSummary.totalFindings}</div>
              <div>{findingSummary.verificationItems} verification items</div>
              <div>{findingSummary.opportunities} suggested improvements</div>
              <div>{findingSummary.confirmedIssues} confirmed issues</div>
              {opportunityIssuesList.length > 0 && <div className="mt-2 border-t border-[#c2c6d6]/30 pt-2">{opportunityIssuesList.map((issue) => <div key={`calc-${issue.id}`}>{issue.count} {issue.title.toLowerCase()}</div>)}<strong>= {findingSummary.opportunities} suggested improvements</strong></div>}
              <p className="pt-2 text-[#727785]">One product can appear in more than one finding.</p>
            </div>
          </details>
        </section>

        {/* Flagged Product Samples Section */}
        {auditData.flaggedProducts.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[#131b2e]">Flagged Product Samples</h2>
              <span className="text-[12px] text-[#727785]">
                Showing first {Math.min(auditData.flaggedProducts.length, 3)} urgent specimens
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {auditData.flaggedProducts.slice(0, 3).map((prod) => (
                <div
                  key={prod.sku}
                  onClick={() => onInspectProduct(prod)}
                  className="bg-[#f2f3ff] rounded-[14px] p-4 flex items-center gap-4 cursor-pointer hover:bg-[#eaedff] hover:shadow-sm transition-all group"
                >
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.altText}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white shadow-xs group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#eaedff] text-[#0058be] flex items-center justify-center shrink-0 border border-white shadow-xs">
                      <span className="material-symbols-outlined text-[24px]">inventory_2</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] text-[#131b2e] truncate font-bold group-hover:text-[#0058be] transition-colors">
                      {prod.title}
                    </span>
                    <span className={`text-[11px] font-semibold truncate ${
                      prod.issue.includes('Missing') ? 'text-[#ba1a1a]' : 'text-[#825100]'
                    }`}>
                      {prod.issue}
                    </span>
                    <span className="text-[11px] text-[#727785] mt-1 font-mono">
                      SKU: {prod.sku}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommended Action Plan Section */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col">
            <h2 className="text-[18px] font-bold text-[#131b2e]">Recommended Action Plan</h2>
            <p className="text-[12px] text-[#424754]">
              Step-by-step roadmap to prioritize observed fixes and verification work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {auditData.actionPlan.map((step) => {
              const liftTextColor = {
                error: 'text-[#ba1a1a]',
                secondary: 'text-[#006c49]',
                primary: 'text-[#0058be]',
              }[step.liftColor];

              return (
                <div
                  key={step.stepNumber}
                  className="bg-[#f2f3ff] p-5 rounded-[14px] flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#0058be] text-white flex items-center justify-center text-[14px] font-bold">
                      {step.stepNumber}
                    </div>
                    <h3 className="text-[16px] font-bold text-[#131b2e]">{step.title}</h3>
                    <p className="text-[12px] text-[#424754] leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#c2c6d6]/20">
                    <span className={`text-[12px] font-bold ${liftTextColor}`}>
                      {step.products != null ? `${step.products} ${step.unit || 'products'}` : step.estimatedLift}
                    </span>
                    <button
                      onClick={() => {
                        if (onNavigateTab) {
                          if (step.stepNumber === 1) onNavigateTab('channel-readiness');
                          else if (step.stepNumber === 2) onNavigateTab('seo-images');
                          else if (step.stepNumber === 3) onNavigateTab('categories');
                          else onBatchFix();
                        } else {
                          onBatchFix();
                        }
                      }}
                      className="px-3 py-1 rounded-full bg-[#eaedff] flex items-center gap-1 text-[#0058be] hover:bg-[#0058be] hover:text-white transition-all cursor-pointer text-[12px] font-bold"
                      type="button"
                    >
                      <span>Fix Section</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </article>
    </div>
  );
};
