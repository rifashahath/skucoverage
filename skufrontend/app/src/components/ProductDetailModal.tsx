import React, { useState } from 'react';
import { FlaggedProduct } from '../types';

interface ProductDetailModalProps {
  product: FlaggedProduct | null;
  onClose: () => void;
  onSaveProduct: (sku: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSaveProduct,
}) => {
  const [isSaved, setIsSaved] = useState(false);

  if (!product) return null;

  const handleApplyFix = () => {
    setIsSaved(true);
    setTimeout(() => {
      onSaveProduct(product.sku);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#131b2e]/60 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#c2c6d6]/30 overflow-hidden z-10 animate-in zoom-in-95 duration-200 p-6 sm:p-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#eaedff]">
          <div className="flex items-center gap-3">
            <img
              src={product.imageUrl}
              alt={product.altText}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover border border-white shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#727785] bg-[#f2f3ff] px-2 py-0.5 rounded">
                  SKU: {product.sku}
                </span>
                <span className="text-[11px] font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                  {product.issue}
                </span>
              </div>
              <h2 className="text-[18px] font-extrabold text-[#131b2e] mt-1">
                {product.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#424754] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-[13px]">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#727785] block mb-1">
              Google Product Category
            </label>
            <div className="p-3 bg-[#f2f3ff] rounded-xl text-[#131b2e] font-medium border border-[#c2c6d6]/20">
              {product.category}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#727785] block mb-1">
              GTIN / Barcode Status
            </label>
            <div className="p-3 bg-[#f2f3ff] rounded-xl text-[#131b2e] font-mono border border-[#c2c6d6]/20 flex items-center justify-between">
              <span>{product.gtin}</span>
              {product.gtin === 'Missing' ? (
                <span className="text-[11px] font-bold text-[#ba1a1a]">Needs GS1 UPC</span>
              ) : (
                <span className="text-[11px] font-bold text-[#006c49]">Valid GTIN-12</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#727785] block mb-1">
              Product Description
            </label>
            <div className="p-3 bg-[#f2f3ff] rounded-xl text-[#424754] leading-relaxed border border-[#c2c6d6]/20">
              {product.fullDescription}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#727785] block mb-1">
              Primary Image Alt Text
            </label>
            <div className="p-3 bg-[#f2f3ff] rounded-xl text-[#424754] italic border border-[#c2c6d6]/20">
              &quot;{product.altText}&quot;
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[#eaedff] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#424754] hover:bg-[#f2f3ff] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyFix}
            className="px-5 py-2 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSaved ? 'check' : 'auto_fix_high'}
            </span>
            <span>{isSaved ? 'Fix Saved!' : 'Optimize in Shopify'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
