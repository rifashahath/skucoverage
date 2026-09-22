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
  const [selectedTier, setSelectedTier] = useState<'19' | '39'>('19');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    if (onUpgradeStripe) {
      try {
        await onUpgradeStripe(selectedTier);
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
      <div className="relative w-full max-w-3xl bg-white rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#c2c6d6]/30 overflow-hidden z-10 animate-in zoom-in-95 duration-200 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#424754] hover:text-[#131b2e] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-lg mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            <span>Full Catalog Compliance</span>
          </div>
          <h2 className="text-[26px] sm:text-[30px] font-extrabold text-[#131b2e] tracking-tight">
            Upgrade your store diagnostic.
          </h2>
          <p className="text-[13px] text-[#424754] mt-1 leading-relaxed">
            Audit your entire product catalog, prevent Google Shopping feed suspensions, and automate weekly drift detection.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Free Plan Card */}
          <div className="p-5 sm:p-6 rounded-[20px] bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[18px] font-bold text-[#131b2e]">Free</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#727785] bg-white px-2.5 py-0.5 rounded-full border border-[#c2c6d6]/20">
                  {currentPlan === '19' || currentPlan === '39' ? 'Free Tier' : 'Current Plan'}
                </span>
              </div>
              <p className="text-[12px] text-[#424754] mb-3">Sample scan for new or small stores</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-[32px] font-extrabold text-[#131b2e]">$0</span>
                <span className="text-[13px] text-[#727785] font-semibold">forever</span>
              </div>

              {/* Checklist */}
              <ul className="space-y-2.5 text-[12px] text-[#424754]">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[16px]">check</span>
                  <span>First 100 SKUs scanned</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[16px]">check</span>
                  <span>Issue detection &amp; instant count</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[16px]">check</span>
                  <span>Store health report preview</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[16px]">check</span>
                  <span>Sample CSV (first 10 rows)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[16px]">check</span>
                  <span>Google/Shopify categories preview</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[16px]">check</span>
                  <span>Catalog Quality Score</span>
                </li>
                <li className="flex items-center gap-2 text-[#727785]">
                  <span className="material-symbols-outlined text-[#727785] text-[16px]">close</span>
                  <span>Weekly monitoring &amp; drift alerts</span>
                </li>
                <li className="flex items-center gap-2 text-[#727785]">
                  <span className="material-symbols-outlined text-[#727785] text-[16px]">close</span>
                  <span>AI search &amp; Merchant Center checks</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                disabled
                className="w-full py-2.5 rounded-full bg-white text-[#727785] font-bold text-[13px] border border-[#c2c6d6]/30 cursor-default"
              >
                {currentPlan === '19' || currentPlan === '39' ? 'Included' : 'Current Plan'}
              </button>
            </div>
          </div>

          {/* Pro Plan Card ($19/mo) */}
          <div className="p-5 sm:p-6 rounded-[20px] bg-gradient-to-b from-[#e2e7ff]/70 to-[#f2f3ff] border-2 border-[#0058be] relative flex flex-col justify-between shadow-md">
            {/* Badge */}
            <div className="absolute -top-3 left-6 flex items-center gap-1.5">
              <span className="bg-[#0058be] text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Most Popular
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2 pt-1">
                <h3 className="text-[18px] font-bold text-[#0058be]">Pro</h3>
                <span className="material-symbols-outlined text-[#0058be] text-[20px]">verified_user</span>
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[32px] font-extrabold text-[#0058be]">$19</span>
                <span className="text-[13px] text-[#727785] font-semibold">/ mo</span>
              </div>
              <p className="text-[12px] text-[#424754] mb-3">
                Complete catalog audit, auto-fixes &amp; continuous monitoring
              </p>

              {/* Checklist */}
              <ul className="space-y-2 text-[12px] text-[#131b2e]">
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span><strong>Unlimited SKUs</strong> scanned</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span>Full CSV fix &amp; Shopify import mapper</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span>Google &amp; Shopify category full mapper</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span>Catalog Quality Score + history</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span>Weekly automated monitoring &amp; email alerts</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span>Email &amp; PDF audit reports</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span>AI search/AEO audit &amp; Merchant Center checks</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">check_circle</span>
                  <span>Priority support</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                onClick={handleUpgrade}
                disabled={isProcessing || upgraded}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:opacity-95 text-white font-bold text-[13px] shadow-[0_6px_18px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_22px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {upgraded ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Welcome to Pro!</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                    </svg>
                    <span>Connecting to Stripe...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Pro ($19/mo)</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Why ongoing subscription explainer — Solves the "one-and-done" retention objection */}
        <div className="p-4 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-[12px] mb-5">
          <div className="w-8 h-8 rounded-full bg-[#eaedff] flex items-center justify-center text-[#0058be] shrink-0">
            <span className="material-symbols-outlined text-[18px]">autorenew</span>
          </div>
          <div className="text-[#424754] leading-relaxed">
            <strong className="text-[#131b2e]">Why ongoing policy monitoring?</strong> Catalog data drifts whenever you publish new products, onboard vendors, or edit variants. Automated weekly scans catch Google Shopping violations before ad impressions drop or items get disapproved.
          </div>
        </div>

        {/* Footer Trust Items */}
        <div className="flex flex-wrap items-center justify-center gap-5 pt-3 border-t border-[#eaedff] text-[11px] text-[#727785] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#006c49]">lock</span>
            <span>Encrypted Stripe checkout</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#006c49]">verified</span>
            <span>14-day refund guarantee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#006c49]">sync</span>
            <span>Month-to-month · Cancel anytime in 1 click</span>
          </div>
        </div>
      </div>
    </div>
  );
};
