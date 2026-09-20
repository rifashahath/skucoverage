import React, { useState } from 'react';
import { CatalogIssue, FlaggedProduct } from '../types';

interface SeoMediaViewProps {
  altIssue?: CatalogIssue;
  descIssue?: CatalogIssue;
  flaggedProducts: FlaggedProduct[];
  onFixItem: (sku: string) => void;
  onFixAll: (issueId: string) => void;
}

export const SeoMediaView: React.FC<SeoMediaViewProps> = ({
  altIssue,
  descIssue,
  flaggedProducts,
  onFixItem,
  onFixAll,
}) => {
  const [fixedAltItems, setFixedAltItems] = useState<Record<string, boolean>>({});
  const [fixedDescItems, setFixedDescItems] = useState<Record<string, boolean>>({});

  const altItems = altIssue?.affectedItems || [];
  const descItems = descIssue?.affectedItems || [];

  const handleApplyAlt = (sku: string) => {
    setFixedAltItems((prev) => ({ ...prev, [sku]: true }));
    onFixItem(sku);
  };

  const handleApplyDesc = (sku: string) => {
    setFixedDescItems((prev) => ({ ...prev, [sku]: true }));
    onFixItem(sku);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      {/* Beginner Hero Explainer */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#c2c6d6]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[12px] font-bold tracking-wide w-fit">
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            <span>Beginner Guide: Image Alt Text &amp; SEO</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#131b2e]">
            SEO &amp; Image Alt Text Studio
          </h1>
          <p className="text-[14px] text-[#424754] leading-relaxed">
            <strong>What is Alt Text?</strong> Search engines cannot &quot;see&quot; pictures; they read the hidden <code className="font-mono text-[#0058be]">alt=&quot;...&quot;</code> text attached to your product photos. Descriptive alt text helps your products rank in Google Image searches and makes your store accessible to screen readers.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex w-full min-w-0 flex-col gap-2 text-[13px] md:w-[220px] md:shrink-0">
          <div className="font-bold text-[#131b2e] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#006c49] text-[18px]">trending_up</span>
            Why this matters:
          </div>
          <ul className="space-y-1 text-[#424754] text-[12px]">
            <li>• Improves Google Image search indexation</li>
            <li>• Compliant with ADA accessibility rules</li>
            <li>• Richer Google Lens discovery</li>
          </ul>
        </div>
      </div>

      {/* Section 1: Missing Alt Text Products */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#eaedff]">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0058be]">image</span>
              <h2 className="text-[18px] font-extrabold text-[#131b2e]">
                Products with Missing Alt Text ({altIssue?.count || altItems.length} items)
              </h2>
            </div>
            <p className="text-[13px] text-[#727785]">
              These products currently have empty image descriptions, hurting Google Image search rank.
            </p>
          </div>

          {altItems.length > 0 && (
            <button
              onClick={() => onFixAll(altIssue?.id || 'issue-missing_alt_text')}
              className="px-4 py-2 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>Add All to Fix List</span>
            </button>
          )}
        </div>

        {altItems.length === 0 ? (
          <div className="p-8 text-center bg-[#faf8ff] rounded-2xl border border-[#c2c6d6]/30 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-[#006c49] mb-1">verified</span>
            <p className="font-bold text-[#131b2e] text-[15px]">All audited products have image alt text</p>
            <p className="text-[13px] text-[#727785] mt-1">No missing image descriptions were detected in this scan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {altItems.map((item) => {
              const isFixed = fixedAltItems[item.sku];

              return (
                <div
                  key={item.sku}
                  className="p-4 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#eaedff] text-[#0058be] flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[24px]">image_not_supported</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[#131b2e] truncate">
                          {item.productTitle || `Product ID ${item.sku}`}
                        </span>
                        <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#c2c6d6]/40 text-[#727785]">
                          ID / SKU: {item.sku}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#ba1a1a] font-medium mt-0.5">
                        {item.issueDetail}
                      </span>
                      <span className="text-[12px] text-[#424754] font-medium mt-0.5">
                        Action required: Add descriptive alt text in Shopify media gallery.
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-auto">
                    {isFixed ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#006c49] bg-[#6ffbbe]/40 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        Added to fix list
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyAlt(item.sku)}
                        className="px-3 py-1.5 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white text-[12px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">add_circle</span>
                        <span>Add to Fix List</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Product Descriptions Length Checker */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#825100]">text_snippet</span>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#131b2e]">
                Short Product Descriptions ({descIssue?.count || descItems.length} items under 100 characters)
              </h2>
              <p className="text-[13px] text-[#727785]">
                Google rewards detailed, high-information descriptions. Very short descriptions miss out on long-tail search queries.
              </p>
            </div>
          </div>

          {descItems.length > 0 && (
            <button
              onClick={() => onFixAll(descIssue?.id || 'issue-missing_description')}
              className="px-4 py-2 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Add All to Fix List</span>
            </button>
          )}
        </div>

        {descItems.length === 0 ? (
          <div className="p-8 text-center bg-[#faf8ff] rounded-2xl border border-[#c2c6d6]/30 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-[#006c49] mb-1">verified</span>
            <p className="font-bold text-[#131b2e] text-[15px]">All audited descriptions meet length standards</p>
            <p className="text-[13px] text-[#727785] mt-1">No descriptions under 100 characters were flagged in this scan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {descItems.map((item) => {
              const isFixed = fixedDescItems[item.sku];

              return (
                <div
                  key={item.sku}
                  className="p-4 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 max-w-2xl min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-[#131b2e] truncate">
                        {item.productTitle || `Product ID ${item.sku}`}
                      </span>
                      <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#c2c6d6]/30 text-[#727785]">
                        SKU / ID: {item.sku}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#ba1a1a]">
                      {item.issueDetail}
                    </span>
                    <span className="text-[12px] text-[#424754]">
                      Action required: Expand description to at least 100 characters with material, specifications, or sizing details.
                    </span>
                  </div>

                  <div className="shrink-0 self-end sm:self-auto">
                    {isFixed ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#006c49] bg-[#6ffbbe]/40 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        Added to fix list
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyDesc(item.sku)}
                        className="px-3 py-1.5 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white text-[12px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">add_circle</span>
                        <span>Add to Fix List</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
