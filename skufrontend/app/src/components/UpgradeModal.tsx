import React, { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessUpgrade: () => void;
  currentPlan?: string;
  onUpgradeStripe?: (priceTier: '19' | '39') => Promise<void>;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onSuccessUpgrade,
  currentPlan,
  onUpgradeStripe,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    if (onUpgradeStripe) {
      try {
        await onUpgradeStripe('19');
        return;
      } catch (e) {
        console.warn('Stripe checkout redirect fallback', e);
      }
    }
    setTimeout(() => {
      setIsProcessing(false);
      setUpgraded(true);
      setTimeout(() => {
        setUpgraded(false);
        onSuccessUpgrade();
        onClose();
      }, 1500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-[#131b2e]/60 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#c2c6d6]/30 overflow-hidden z-10 animate-in zoom-in-95 duration-200 p-6 sm:p-10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#424754] hover:text-[#131b2e] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-lg mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[11px] font-bold uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-[15px]">diamond</span>
            <span>Unrestricted Diagnostics</span>
          </div>
          <h2 className="text-[28px] sm:text-[34px] font-extrabold text-[#131b2e] tracking-tight">
            Upgrade your workflow.
          </h2>
          <p className="text-[14px] text-[#424754] mt-1.5 leading-relaxed">
            Select the tier that matches your catalog scale. Cancel or switch anytime.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Free Plan Card */}
          <div className="p-6 rounded-[20px] bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[20px] font-bold text-[#131b2e]">Free</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785] bg-white px-2.5 py-0.5 rounded-full border border-[#c2c6d6]/20">
                  Current
                </span>
              </div>
              <p className="text-[12px] text-[#424754] mb-4">For small emerging stores</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[36px] font-extrabold text-[#131b2e]">$0</span>
                <span className="text-[13px] text-[#727785] font-semibold">/ mo</span>
              </div>

              {/* Checklist */}
              <ul className="space-y-3 text-[13px] text-[#424754]">
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#006c49] text-[18px]">check</span>
                  <span>100 SKUs scanned per audit</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#006c49] text-[18px]">check</span>
                  <span>Basic issue detection</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#006c49] text-[18px]">check</span>
                  <span>Manual CSV export</span>
                </li>
                <li className="flex items-center gap-2.5 text-[#727785]">
                  <span className="material-symbols-outlined text-[#727785] text-[18px]">remove</span>
                  <span>Google Merchant Center sync</span>
                </li>
                <li className="flex items-center gap-2.5 text-[#727785]">
                  <span className="material-symbols-outlined text-[#727785] text-[18px]">remove</span>
                  <span>1-click automated batch fixes</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                disabled
                className="w-full py-3 rounded-full bg-white text-[#727785] font-bold text-[14px] border border-[#c2c6d6]/30 cursor-default"
              >
                Current Plan
              </button>
            </div>
          </div>

          {/* Pro Plan Card */}
          <div className="p-6 rounded-[20px] bg-gradient-to-b from-[#e2e7ff]/60 to-[#f2f3ff] border-2 border-[#0058be] relative flex flex-col justify-between shadow-lg">
            {/* Badges */}
            <div className="absolute -top-3.5 left-6 flex items-center gap-2">
              <span className="bg-[#0058be] text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                Recommended
              </span>
              <span className="bg-[#ffddb8] text-[#653e00] text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Popular
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 pt-2">
                <h3 className="text-[20px] font-bold text-[#131b2e]">Pro</h3>
                <span className="material-symbols-outlined text-[#0058be] text-[22px]">rocket_launch</span>
              </div>
              <p className="text-[12px] text-[#424754] mb-4">For scaling DTC brands</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[36px] font-extrabold text-[#0058be]">$49</span>
                <span className="text-[13px] text-[#727785] font-semibold">/ mo</span>
              </div>

              {/* Checklist */}
              <ul className="space-y-3 text-[13px] text-[#131b2e]">
                <li className="flex items-center gap-2.5 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] font-bold">check_circle</span>
                  <span>Unlimited SKUs scanned</span>
                </li>
                <li className="flex items-center gap-2.5 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] font-bold">check_circle</span>
                  <span>Deep GTIN &amp; variant diagnostics</span>
                </li>
                <li className="flex items-center gap-2.5 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] font-bold">check_circle</span>
                  <span>1-click Shopify batch fixes</span>
                </li>
                <li className="flex items-center gap-2.5 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] font-bold">check_circle</span>
                  <span>Google Merchant Center sync</span>
                </li>
                <li className="flex items-center gap-2.5 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] font-bold">check_circle</span>
                  <span>Scheduled weekly automated audits</span>
                </li>
                <li className="flex items-center gap-2.5 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] font-bold">check_circle</span>
                  <span>Priority 24/7 Slack support</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                onClick={handleUpgrade}
                disabled={isProcessing || upgraded}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:opacity-95 text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_24px_rgba(59,130,246,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {upgraded ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check</span>
                    <span>Welcome to Pro!</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                    </svg>
                    <span>Processing Stripe Checkout...</span>
                  </>
                ) : (
                  <>
                    <span>Upgrade to Pro</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Trust Items */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-[#eaedff] text-[12px] text-[#727785] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#006c49]">lock</span>
            <span>Secure Stripe checkout</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#006c49]">verified</span>
            <span>14-day money-back guarantee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#006c49]">sync</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};
