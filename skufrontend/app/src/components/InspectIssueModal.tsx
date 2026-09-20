import React, { useState } from 'react';
import { CatalogIssue, AffectedItem } from '../types';
import { getChannelMeta, getConfidenceLabel, getSourceLabel, CHANNEL_LABELS } from '../lib/channelReadiness';

interface InspectIssueModalProps {
  issue: CatalogIssue | null;
  onClose: () => void;
  onFixItem: (sku: string) => void;
  onFixAll: (issueId: string) => void;
}

export const InspectIssueModal: React.FC<InspectIssueModalProps> = ({
  issue,
  onClose,
  onFixItem,
  onFixAll,
}) => {
  const [fixedSkus, setFixedSkus] = useState<Record<string, boolean>>({});
  const [fixingAll, setFixingAll] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  if (!issue) return null;

  const channelNames = getChannelMeta(issue.category).channels.map((c) => CHANNEL_LABELS[c] || c).join(' + ');
  const visibleItems = issue.affectedItems.slice(0, 50);

  // Copies the exact evidence and fix text so the merchant can paste it into
  // Shopify, a spreadsheet, or a task for a teammate.
  const handleCopyFix = async (item: AffectedItem) => {
    const lines = [
      `Product: ${item.productTitle}${item.productUrl ? ` (${item.productUrl})` : ''}`,
      `Issue: ${issue.title}`,
      item.issueDetail ? `Detected: ${item.issueDetail}` : '',
      item.expected ? `Suggested fix: ${item.expected}` : item.suggestedFix ? `Suggested fix: ${item.suggestedFix}` : '',
      `Source: ${item.dataSourceChecked || 'Public storefront snapshot'}`,
      issue.status === 'needs_verification' ? 'Status: Needs verification' : `Confidence: ${getConfidenceLabel(issue)}`,
      `Channels: ${channelNames}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedSku(item.sku);
      setTimeout(() => setCopiedSku((prev) => (prev === item.sku ? null : prev)), 2000);
    } catch {
      // Clipboard unavailable (permissions or old browser): no fake confirmation.
    }
  };

  const handleFixOne = (sku: string) => {
    setFixedSkus((prev) => ({ ...prev, [sku]: true }));
    onFixItem(sku);
  };

  const handleFixAllClick = () => {
    setFixingAll(true);
    setTimeout(() => {
      const all: Record<string, boolean> = {};
      issue.affectedItems.forEach((item) => {
        all[item.sku] = true;
      });
      setFixedSkus(all);
      setFixingAll(false);
      onFixAll(issue.id);
    }, 600);
  };

  const badgeStyle = {
    HIGH: 'bg-[#ffdad6] text-[#93000a]',
    MEDIUM: 'bg-[#ffddb8] text-[#653e00]',
    LOW: 'bg-[#d8e2ff] text-[#004395]',
  }[issue.severity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#131b2e]/60 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#c2c6d6]/30 overflow-hidden z-10 animate-in zoom-in-95 duration-200 p-6 sm:p-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#eaedff]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${badgeStyle}`}>
                {issue.status === 'needs_verification'
                  ? 'Needs verification'
                  : issue.status === 'heuristic'
                    ? `Heuristic · ${issue.severity}`
                    : `${issue.severity} Priority`}
              </span>
              <span className="text-[12px] font-bold text-[#727785]">
                {issue.count} product{issue.count === 1 ? '' : 's'} {issue.status === 'needs_verification' ? 'to verify' : issue.status === 'heuristic' ? 'with opportunities' : 'affected'}
              </span>
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-[#131b2e]">
              {issue.title}
            </h2>
            {issue.rule ? (
              <p className="text-[13px] text-[#131b2e] font-medium leading-relaxed">
                Rule: {issue.rule}
              </p>
            ) : null}
            <p className="text-[13px] text-[#424754] leading-relaxed">
              {issue.description}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#727785]">
              {getSourceLabel(issue.source)} · {issue.status === 'needs_verification' ? 'Needs verification' : getConfidenceLabel(issue)} · Applies to: {channelNames}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#424754] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Affected Items List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
            {issue.count > visibleItems.length
              ? `Product evidence (first ${visibleItems.length} of ${issue.count} products)`
              : `Product evidence (${issue.count} product${issue.count === 1 ? '' : 's'})`}
          </span>

          {visibleItems.map((item) => {
            const isFixed = fixedSkus[item.sku];
            return (
              <div
                key={item.sku}
                className="p-4 rounded-xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#eaedff] transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productTitle}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-[#0058be] shrink-0">
                      <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    {item.productUrl ? (
                      <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-[14px] font-bold text-[#0058be] truncate hover:underline">
                        {item.productTitle}
                      </a>
                    ) : (
                      <span className="text-[14px] font-bold text-[#131b2e] truncate">{item.productTitle}</span>
                    )}
                    <span className="text-[11px] font-mono text-[#727785]">Product ID / SKU: {item.sku}</span>
                    <span className="text-[11px] text-[#727785]">Variant: {item.variant || 'First public storefront variant'}</span>
                    {typeof item.gtinFound === 'boolean' ? (
                      <span className="text-[11px] text-[#727785]">GTIN found: {item.gtinFound ? 'Yes' : 'No'}</span>
                    ) : null}
                    <span className="text-[11px] text-[#727785]">Source checked: {item.dataSourceChecked || 'Public storefront snapshot'}</span>
                    <span className="text-[11px] font-semibold text-[#004395]">Verification status: {item.verificationStatus || 'Rule evaluated from public storefront data'}</span>
                    <span className="text-[12px] text-[#ba1a1a] mt-0.5">
                      Observed: {item.issueDetail}
                    </span>
                    {item.expected ? (
                      <span className="text-[12px] text-[#424754] mt-0.5">
                        Expected: {item.expected}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleCopyFix(item)}
                    aria-label={`Copy fix details for ${item.productTitle}`}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-[#424754] bg-white hover:bg-[#f2f3ff] px-3 py-1.5 rounded-full border border-[#c2c6d6]/50 transition-all cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">{copiedSku === item.sku ? 'check' : 'content_copy'}</span>
                    <span>{copiedSku === item.sku ? 'Copied' : 'Copy fix'}</span>
                  </button>
                  {isFixed ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#006c49] bg-[#6ffbbe]/40 px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Fixed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleFixOne(item.sku)}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-[#0058be] bg-white hover:bg-[#0058be] hover:text-white px-3 py-1.5 rounded-full border border-[#0058be]/30 transition-all cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                      <span>Add to fix list</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#eaedff] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[12px] text-[#727785]">
            Adds products to your fix-list export. Nothing is written to Shopify here.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-full text-[13px] font-semibold text-[#424754] hover:bg-[#f2f3ff] transition-colors cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={handleFixAllClick}
              disabled={fixingAll}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white text-[13px] font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>{fixingAll ? 'Adding...' : 'Add all to fix list'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
