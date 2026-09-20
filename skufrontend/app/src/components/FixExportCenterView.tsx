import React, { useState } from 'react';
import { StoreAuditData } from '../types';

interface FixExportCenterViewProps {
  auditData: StoreAuditData;
  onBatchFix: () => void;
  onDownloadCsv: () => void;
}

export const FixExportCenterView: React.FC<FixExportCenterViewProps> = ({
  auditData,
  onBatchFix,
  onDownloadCsv,
}) => {
  const [downloadedShopify, setDownloadedShopify] = useState(false);
  const [batchApplied, setBatchApplied] = useState(false);

  /*
   * PREVIOUS BEHAVIOUR (removed):
   *
   * This function built a Shopify import CSV from four hardcoded product rows
   * that had nothing to do with the scanned store, including four invented
   * barcode values (084920198421, 084920198422, 071239841249, 5012345678900).
   * The only thing taken from the real audit was the store domain in the
   * filename. Importing that file into Shopify would have written fabricated
   * GTINs, titles, alt text and categories over real products.
   *
   * A GTIN is licensed to a specific company by GS1. A number that merely
   * passes the Modulo-10 check digit is not "a valid barcode for this product"
   * - it is very likely someone else's. Publishing it to Google Merchant
   * Center misrepresents the product and can get an account suspended, which
   * is the exact outcome this product claims to prevent.
   *
   * SKUcoverage therefore never generates identifier values. The export is now
   * the server-generated fix list built from the real audit: it says which
   * product has which problem and what the merchant needs to supply.
   */
  const handleDownloadShopifyCsv = () => {
    onDownloadCsv();
    setDownloadedShopify(true);
    setTimeout(() => setDownloadedShopify(false), 5000);
  };

  const handleApplyAll = () => {
    setBatchApplied(true);
    onBatchFix();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      {/* Beginner Hero Explainer */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#c2c6d6]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[12px] font-bold tracking-wide w-fit">
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export &amp; Sync Center</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#131b2e]">
            Review &amp; Export Center
          </h1>
          <p className="text-[14px] text-[#424754] leading-relaxed">
            <strong>How do you get these fixes into Shopify?</strong> Download the fix list as a CSV. It names every affected product, the problem found, and what needs to be supplied. Barcodes are never generated for you — a GTIN is licensed to a company by GS1, so it has to come from your supplier or your own GS1 registration. Once you have applied the changes in Shopify, run another scan to see your score move.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex w-full min-w-0 flex-col gap-2 text-[13px] md:w-[220px] md:shrink-0">
          <div className="font-bold text-[#131b2e] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#006c49] text-[18px]">verified</span>
            Zero Coding Needed
          </div>
          <p className="text-[#424754] text-[12px]">
            Exports a review list, not an import-ready Shopify overwrite file.
          </p>
        </div>
      </div>

      {/* Remediation & Action Summary */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <h2 className="text-[18px] font-extrabold text-[#131b2e]">
          Catalog Diagnostic &amp; Remediation Summary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
              Current Catalog Health
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[36px] font-black text-[#825100]">
                {auditData.healthScore != null ? auditData.healthScore : '—'}
              </span>
              <span className="text-[16px] text-[#727785]">/ 100</span>
              {auditData.scoreStatus && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffddb8] text-[#653e00] text-[11px] font-bold ml-2">
                  {auditData.scoreStatus}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#424754]">
              Evaluated across titles, descriptions, GTINs, categories, images, and variants.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#fff5f5] border border-[#ffcdd2] flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ba1a1a]">
              High-priority Confirmed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[36px] font-black text-[#ba1a1a]">
                {auditData.highPriorityCount}
              </span>
              <span className="text-[14px] font-bold text-[#ba1a1a]">items</span>
            </div>
            <p className="text-[12px] text-[#ba1a1a]">
              Observed, high-confidence problems only. Verification items and heuristic opportunities are not counted here.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0058be]">
              Total Findings
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[36px] font-black text-[#0058be]">
                {auditData.detectedIssuesCount}
              </span>
              <span className="text-[14px] font-bold text-[#727785]">confirmed + to verify + opportunities</span>
            </div>
            <p className="text-[12px] text-[#424754]">
              Across {auditData.productsCount} analyzed products. {auditData.findingSummary ? `${auditData.findingSummary.confirmedIssues} confirmed, ${auditData.findingSummary.verificationItems} to verify, ${auditData.findingSummary.opportunities} opportunities.` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#eaedff]">
          <div className="text-[13px] text-[#424754]">
            Export the structured fix list to review flagged items and supply verified updates in Shopify.
          </div>
          <button
            onClick={handleApplyAll}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[14px] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">playlist_add_check</span>
            <span>{batchApplied ? 'Added to Fix List!' : 'Add All Flagged Items to Fix List'}</span>
          </button>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <h2 className="text-[18px] font-extrabold text-[#131b2e]">
          Download Formatted Data Files
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Catalog Action & Fix List CSV */}
          <div className="p-5 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#131b2e]">
                  Catalog Action &amp; Fix List CSV
                </h3>
                <p className="text-[13px] text-[#424754] mt-1 leading-relaxed">
                  Contains every affected product ID, issue type, current catalog state, and actionable remediation instructions for your team or suppliers.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadShopifyCsv}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>
                {downloadedShopify ? 'Downloaded!' : 'Download Action & Fix List CSV'}
              </span>
            </button>
          </div>

          {/* Card 2: Full Audit Diagnostic CSV */}
          <div className="p-5 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#eaedff] text-[#0058be] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">table_chart</span>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#131b2e]">
                  Full Audit Diagnostic CSV
                </h3>
                <p className="text-[13px] text-[#424754] mt-1 leading-relaxed">
                  Complete report including all {auditData.detectedIssuesCount || auditData.issues.length} findings (confirmed issues, verification items and opportunities), severity breakdown, and category health scores.
                </p>
              </div>
            </div>

            <button
              onClick={onDownloadCsv}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#f2f3ff] text-[#131b2e] border border-[#c2c6d6]/40 font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">file_save</span>
              <span>Download Diagnostic Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safe remediation foundation: no mutation is performed from this screen. */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div>
          <h2 className="text-[18px] font-extrabold text-[#131b2e]">Safe change workflow</h2>
          <p className="text-[13px] text-[#424754] mt-1">SKUcoverage currently prepares a review list only. It does not write to Shopify or promise rollback.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            ['1', 'Coverage receipt', 'Confirm what the public scan could and could not inspect.'],
            ['2', 'Field-by-field diff', 'Review current and proposed values before any future write.'],
            ['3', 'Backup first', 'Authenticated repair must snapshot affected products.'],
            ['4', 'Dry run', 'Validate dependent option and variant fields without applying changes.'],
            ['5', 'Explicit approval', 'No changes until the merchant approves the exact diff.'],
            ['6', 'Audit and rollback', 'Record each applied change and verify the live result.'],
          ].map(([step, title, copy]) => (
            <div key={step} className="p-4 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30">
              <span className="text-[11px] font-bold text-[#0058be]">STEP {step}</span>
              <div className="font-bold text-[#131b2e] text-[14px] mt-1">{title}</div>
              <div className="text-[12px] text-[#424754] mt-1">{copy}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Step Remediation Workflow */}
      <div className="bg-[#f2f3ff] rounded-3xl p-6 border border-[#c2c6d6]/30 flex flex-col gap-3">
        <h3 className="text-[16px] font-extrabold text-[#131b2e] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0058be]">lightbulb</span>
          How to Remediate Issues in 3 Steps:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px] text-[#424754]">
          <div className="p-4 bg-white rounded-2xl flex flex-col gap-1">
            <span className="font-bold text-[#0058be] text-[14px]">Step 1</span>
            <strong className="text-[#131b2e]">Download Action &amp; Fix List</strong>
            <span>Save the generated CSV to review affected product IDs and required fixes.</span>
          </div>
          <div className="p-4 bg-white rounded-2xl flex flex-col gap-1">
            <span className="font-bold text-[#0058be] text-[14px]">Step 2</span>
            <strong className="text-[#131b2e]">Update Shopify Catalog</strong>
            <span>Supply genuine barcodes, assign taxonomy categories, and update descriptions directly in Shopify Admin.</span>
          </div>
          <div className="p-4 bg-white rounded-2xl flex flex-col gap-1">
            <span className="font-bold text-[#0058be] text-[14px]">Step 3</span>
            <strong className="text-[#131b2e]">Re-Scan to Verify</strong>
            <span>Run a new audit in SKUcoverage to confirm resolved issues and view your verified score improvement.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
