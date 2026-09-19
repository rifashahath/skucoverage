import React, { useState } from 'react';

interface SettingsViewProps {
  currentStore: string;
  onUpdateStore: (newStore: string) => void;
  onOpenUpgrade: () => void;
  onDisconnectStore: () => void;
  onPurgeCache: () => void;
  userEmail?: string;
  profile?: {
    plan?: string;
    auditsToday?: number;
    limits?: { auditsPerDay?: number | null; skuCap?: number };
  } | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentStore,
  onUpdateStore,
  onOpenUpgrade,
  onDisconnectStore,
  onPurgeCache,
  userEmail,
  profile,
}) => {
  const [storeInput, setStoreInput] = useState(currentStore);
  const [emailInput, setEmailInput] = useState(userEmail || 'alex.merchant@example.com');
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [gtinAlerts, setGtinAlerts] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isPaid = profile?.plan === '19' || profile?.plan === '39';
  const planName = profile?.plan === '39' ? 'Pro $39' : profile?.plan === '19' ? 'Pro $19' : 'Free Plan';
  const skuLimit = profile?.limits?.skuCap ?? 100;
  const auditsToday = profile?.auditsToday ?? 0;
  const maxAudits = profile?.limits?.auditsPerDay ?? 3;
  const usagePct = maxAudits ? Math.min(100, Math.round((auditsToday / maxAudits) * 100)) : 100;
  const auditsLeft = Math.max(0, maxAudits - auditsToday);

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const trimmed = storeInput.trim() || 'beststore.myshopify.com';
    onUpdateStore(trimmed);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0058be] mb-1">
            <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
            <span>Workspace Profile</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-[#131b2e] tracking-tight leading-tight">
            Account Settings
          </h1>
          <p className="text-[14px] text-[#424754] mt-0.5">
            Manage your connected Shopify storefronts, audit frequency preferences, and billing subscription.
          </p>
        </div>

        {/* Live status chip */}
        <div className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 rounded-full bg-[#f2f3ff] border border-[#c2c6d6]/30 text-[13px] font-semibold text-[#131b2e]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c49] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c49]"></span>
          </span>
          <span>Store connected:</span>
          <code className="text-[#0058be] font-mono font-bold">{currentStore}</code>
        </div>
      </section>

      {/* Main Settings Card */}
      <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-[#e2e8f0] flex flex-col gap-8">
        {/* Section 1: Store & Account Information */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#0058be] text-[22px]">badge</span>
              <h2 className="text-[18px] font-bold text-[#131b2e]">Store &amp; Account Information</h2>
            </div>
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#006c49] bg-[#6ffbbe]/40 px-3 py-1 rounded-full animate-in fade-in">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                Changes saved successfully
              </span>
            )}
          </div>

          <form onSubmit={handleSaveStore} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field: Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#131b2e]">Account Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f2f3ff] rounded-xl text-[14px] text-[#131b2e] border border-transparent focus:border-[#0058be] focus:outline-hidden focus:ring-2 focus:ring-[#0058be]/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#006c49] bg-[#6ffbbe]/30 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
              <span className="text-[11px] text-[#727785]">Primary recipient for weekly digests and report links.</span>
            </div>

            {/* Field: Store Domain */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#131b2e]">Connected Shopify Store</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={storeInput}
                  onChange={(e) => setStoreInput(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  required
                  className="flex-1 px-4 py-2.5 bg-[#f2f3ff] rounded-xl text-[14px] font-mono text-[#131b2e] border border-transparent focus:border-[#0058be] focus:outline-hidden focus:ring-2 focus:ring-[#0058be]/20"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <span className="text-[11px] text-[#727785]">Public Storefront API address used for automated diagnostics.</span>
            </div>
          </form>
        </section>

        {/* Section 2: Plan & Subscription */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#eaedff]">
            <span className="material-symbols-outlined text-[#0058be] text-[22px]">workspace_premium</span>
            <h2 className="text-[18px] font-bold text-[#131b2e]">Plan &amp; Subscription</h2>
          </div>

          <div className="p-6 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[20px] font-extrabold text-[#131b2e]">{planName}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#eaedff] text-[#0058be] text-[11px] font-bold uppercase">
                  Active
                </span>
              </div>
              <p className="text-[13px] text-[#424754]">
                {skuLimit.toLocaleString()}-SKU limit per audit, automated catalog diagnostics.
              </p>
            </div>

            {isPaid ? (
              <button
                disabled
                className="px-6 py-2.5 rounded-full bg-[#eaedff] text-[#0058be] font-bold text-[14px] cursor-default opacity-80 shrink-0"
              >
                Manage Subscription
              </button>
            ) : (
              <button
                onClick={onOpenUpgrade}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:opacity-95 text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(59,130,246,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0"
              >
                Upgrade to Pro
              </button>
            )}
          </div>

          {/* Usage Meter */}
          <div className="p-5 rounded-2xl bg-[#eaedff]/40 border border-[#c2c6d6]/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#131b2e]">
                {isPaid
                  ? `${auditsToday} audits run today (Unlimited)`
                  : `${auditsToday} of ${maxAudits} audits used today (${usagePct}%)`}
              </span>
              {!isPaid && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${auditsLeft === 0 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#ffddb8] text-[#825100]'}`}>
                  {auditsLeft === 0 ? 'Quota Reached' : `${auditsLeft} Audit${auditsLeft === 1 ? '' : 's'} Left`}
                </span>
              )}
            </div>
            <div className="w-full h-3 rounded-full bg-[#e2e7ff] overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${auditsToday >= maxAudits && !isPaid ? 'bg-[#ba1a1a]' : 'bg-[#0058be]'}`}
                style={{ width: `${isPaid ? 100 : usagePct}%` }}
              />
            </div>
            <span className="text-[11px] text-[#727785]">
              {isPaid
                ? 'Your Pro subscription includes unlimited daily audit runs.'
                : 'Daily audit quota refreshes every 24 hours. Upgrade to Pro for unlimited real-time scans.'}
            </span>
          </div>
        </section>

        {/* Section 3: Notification Preferences */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#eaedff]">
            <span className="material-symbols-outlined text-[#0058be] text-[22px]">notifications</span>
            <h2 className="text-[18px] font-bold text-[#131b2e]">Notification Preferences</h2>
          </div>

          <div className="flex flex-col gap-4">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] transition-colors">
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#131b2e]">Email me weekly catalog health digest</span>
                <span className="text-[12px] text-[#424754]">
                  Every Monday with your latest score change and new critical feed blockers.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWeeklyDigest(!weeklyDigest)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  weeklyDigest ? 'bg-[#0058be]' : 'bg-[#c2c6d6]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                    weeklyDigest ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] transition-colors">
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#131b2e]">Alert when critical GTIN issues are found</span>
                <span className="text-[12px] text-[#424754]">
                  Immediate notification if active SKUs trigger Google Merchant rejection codes.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGtinAlerts(!gtinAlerts)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  gtinAlerts ? 'bg-[#0058be]' : 'bg-[#c2c6d6]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                    gtinAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: Danger Zone */}
        <section className="flex flex-col gap-4 pt-4 border-t border-[#eaedff]">
          <div className="flex items-center gap-2 text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <h2 className="text-[16px] font-bold">Danger Zone</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/20">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-[#131b2e]">Disconnect Shopify Store</span>
              <span className="text-[12px] text-[#424754]">
                Removes API access tokens and pauses all scheduled weekly diagnostics.
              </span>
            </div>
            <button
              type="button"
              onClick={onDisconnectStore}
              className="px-4 py-2 rounded-full border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white font-bold text-[13px] transition-all cursor-pointer shrink-0"
            >
              Disconnect Store
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#f2f3ff] border border-[#c2c6d6]/30">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-[#131b2e]">Purge Local Audit Cache</span>
              <span className="text-[12px] text-[#424754]">
                Clear cached JSON snapshots of your store catalog to force fresh crawl on next scan.
              </span>
            </div>
            <button
              type="button"
              onClick={onPurgeCache}
              className="px-4 py-2 rounded-full bg-white hover:bg-[#eaedff] text-[#424754] font-bold text-[13px] border border-[#c2c6d6]/40 transition-all cursor-pointer shrink-0"
            >
              Purge Cache
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
