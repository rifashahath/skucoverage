import React, { useState } from 'react';
import { CatalogIssue } from '../types';

interface CategoryMapperViewProps {
  catIssue?: CatalogIssue;
  onFixItem: (sku: string) => void;
  onFixAll: (issueId: string) => void;
}

interface TaxonomyItem {
  id: number;
  breadcrumb: string;
}

const POPULAR_GOOGLE_CATEGORIES: TaxonomyItem[] = [
  { id: 2162, breadcrumb: 'Home & Garden > Kitchen & Dining > Coffee & Espresso' },
  { id: 4172, breadcrumb: 'Home & Garden > Linens > Kitchen Linens > Dish Towels' },
  { id: 671, breadcrumb: 'Home & Garden > Kitchen & Dining > Kitchen Tools > Cutting Boards' },
  { id: 5543, breadcrumb: 'Apparel & Accessories > Clothing > Uniforms > Chef Uniforms' },
  { id: 684, breadcrumb: 'Home & Garden > Kitchen & Dining > Barware > Flasks' },
  { id: 672, breadcrumb: 'Home & Garden > Kitchen & Dining > Kitchen Knives' },
  { id: 2894, breadcrumb: 'Home & Garden > Kitchen & Dining > Cookware & Bakeware' },
  { id: 1604, breadcrumb: 'Apparel & Accessories > Clothing' },
];

export const CategoryMapperView: React.FC<CategoryMapperViewProps> = ({
  catIssue,
  onFixItem,
  onFixAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedItems, setMappedItems] = useState<Record<string, boolean>>({});

  const unmappedItems = catIssue?.affectedItems || [];

  const filteredCategories = POPULAR_GOOGLE_CATEGORIES.filter((c) =>
    c.breadcrumb.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMap = (sku: string) => {
    setMappedItems((prev) => ({ ...prev, [sku]: true }));
    onFixItem(sku);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      {/* Beginner Hero Explainer */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#c2c6d6]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[12px] font-bold tracking-wide w-fit">
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            <span>Beginner Guide: Google Product Categories</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#131b2e]">
            Google Categories &amp; Taxonomy
          </h1>
          <p className="text-[14px] text-[#424754] leading-relaxed">
            <strong>What is Google Product Taxonomy?</strong> While Shopify lets you enter any text for product type (like &quot;Kitchen Gear&quot;), Google Shopping uses an official list of 5,000+ strict standardized categories. Mapping your products correctly tells Google who your buyers are and prevents your ad spend from being wasted on the wrong searches.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col gap-2 shrink-0 text-[13px] min-w-[220px]">
          <div className="font-bold text-[#131b2e] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#006c49] text-[18px]">verified</span>
            Why this matters:
          </div>
          <ul className="space-y-1 text-[#424754] text-[12px]">
            <li>• Matches products to Google Merchant taxonomy standards</li>
            <li>• Places ads in front of high-intent buyers</li>
            <li>• Prevents search disqualification on category filters</li>
          </ul>
        </div>
      </div>

      {/* Unmapped Items Ready to Link */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#eaedff]">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#131b2e]">
              Products Needing Category Mapping ({catIssue?.count || unmappedItems.length} items)
            </h2>
            <p className="text-[13px] text-[#727785]">
              Match each Shopify product with its official Google Merchant taxonomy category.
            </p>
          </div>

          {unmappedItems.length > 0 && (
            <button
              onClick={() => onFixAll(catIssue?.id || 'issue-missing_category')}
              className="px-4 py-2 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Batch Add All {unmappedItems.length} Items</span>
            </button>
          )}
        </div>

        {unmappedItems.length === 0 ? (
          <div className="p-8 text-center bg-[#faf8ff] rounded-2xl border border-[#c2c6d6]/30 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-[#006c49] mb-1">verified</span>
            <p className="font-bold text-[#131b2e] text-[15px]">No category issues detected in this audit</p>
            <p className="text-[13px] text-[#727785] mt-1">All audited products have valid Google taxonomy classifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unmappedItems.map((item) => {
              const isMapped = mappedItems[item.sku];
              return (
                <div
                  key={item.sku}
                  className="p-4 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#131b2e]">
                        {item.productTitle || `Product ID ${item.sku}`}
                      </span>
                      <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#c2c6d6]/30 text-[#727785]">
                        SKU: {item.sku}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#ba1a1a]">
                      {item.issueDetail}
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-[#0058be]">
                      <span className="material-symbols-outlined text-[16px]">arrow_right_alt</span>
                      <span>{item.suggestedFix}</span>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-auto">
                    {isMapped ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#006c49] bg-[#6ffbbe]/40 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        Added to fix list
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMap(item.sku)}
                        className="px-4 py-1.5 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white text-[12px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">link</span>
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

      {/* Searchable Google Categories Directory */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#131b2e]">
              Google Official Taxonomy Search
            </h2>
            <p className="text-[13px] text-[#727785]">
              Search Google&apos;s 2025 Merchant taxonomy to find exact category IDs for any product.
            </p>
          </div>
          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#727785] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category (e.g. coffee, kitchen)..."
              className="w-full pl-9 pr-3 py-2 bg-[#f2f3ff] rounded-xl text-[13px] font-medium text-[#131b2e] outline-hidden focus:border-[#0058be]"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-3 rounded-xl bg-[#faf8ff] border border-[#c2c6d6]/20 flex items-center justify-between gap-3 text-[13px]"
            >
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#eaedff] text-[#0058be] font-mono text-[11px] font-bold">
                  ID: {cat.id}
                </span>
                <span className="font-medium text-[#131b2e]">{cat.breadcrumb}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(cat.breadcrumb);
                }}
                className="text-[11px] font-bold text-[#0058be] hover:underline cursor-pointer shrink-0"
              >
                Copy Path
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
