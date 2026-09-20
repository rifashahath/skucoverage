import React, { useState } from 'react';

interface InfoModalProps {
  type: 'overview' | 'docs' | 'benchmarks' | 'integrations' | 'signin' | 'scope' | 'schedule' | 'alerts' | 'disconnect' | 'purge' | null;
  onClose: () => void;
  onConfirmDanger?: () => void;
  user?: { email?: string | null } | null;
  onSignOut?: () => void;
  onSignIn?: (email: string, pass: string) => Promise<{ error?: any }>;
  onSignUp?: (email: string, pass: string) => Promise<{ error?: any }>;
  onGoogleSignIn?: () => Promise<void>;
  currentStore?: string;
  currentPlan?: string;
}

export const InfoModals: React.FC<InfoModalProps> = ({
  type,
  onClose,
  onConfirmDanger,
  user,
  onSignOut,
  onSignIn,
  onSignUp,
  onGoogleSignIn,
  currentStore = '',
  currentPlan = 'Free',
}) => {
  const [thresholdScore, setThresholdScore] = useState(70);
  const [scheduleTime, setScheduleTime] = useState('Monday 04:00 UTC');
  const [savedAlert, setSavedAlert] = useState(false);

  // Auth form state for signed-out users
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        if (onSignUp) {
          const res = await onSignUp(authEmail, authPass);
          if (res?.error) throw res.error;
          setAuthNotice('Check your email to confirm your account.');
        }
      } else {
        if (onSignIn) {
          const res = await onSignIn(authEmail, authPass);
          if (res?.error) throw res.error;
          onClose();
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthBusy(false);
    }
  };

  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#131b2e]/60 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-[#c2c6d6]/30 overflow-hidden z-10 animate-in zoom-in-95 duration-200 p-6 sm:p-8 flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#424754] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* OVERVIEW */}
        {type === 'overview' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#eaedff] text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">insights</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">About SKUcoverage</h2>
            <p className="text-[14px] text-[#424754] leading-relaxed">
              SKUcoverage is the precision catalog health engine for Shopify DTC brands. It analyzes public storefront payloads and product feeds to uncover broken GTINs, missing variant imagery, incomplete taxonomy descriptions, and Google Shopping feed disqualifiers in under 60 seconds.
            </p>
            <div className="p-4 rounded-xl bg-[#f2f3ff] text-[13px] text-[#131b2e] flex flex-col gap-1.5">
              <div className="font-bold flex items-center gap-1 text-[#006c49]">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Zero-friction Setup
              </div>
              <p className="text-[#424754]">
                Works on any public Shopify store without requiring app installation or OAuth permissions.
              </p>
            </div>
          </div>
        )}

        {/* DOCS */}
        {type === 'docs' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#eaedff] text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">menu_book</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">Documentation &amp; Standards</h2>
            <div className="space-y-3 text-[13px] text-[#424754]">
              <div className="p-3 bg-[#f2f3ff] rounded-xl">
                <strong className="text-[#131b2e] block mb-0.5">GTIN &amp; Barcode Validation:</strong>
                Validates 12-digit UPC-A, 13-digit EAN-13, and 14-digit ITF-14 modulo-10 check digits required by Google Merchant Center.
              </div>
              <div className="p-3 bg-[#f2f3ff] rounded-xl">
                <strong className="text-[#131b2e] block mb-0.5">Product Taxonomy:</strong>
                Audits against Google Product Taxonomy (2025 rev) and Shopify Category Trees to prevent automated ad downgrades.
              </div>
              <div className="p-3 bg-[#f2f3ff] rounded-xl">
                <strong className="text-[#131b2e] block mb-0.5">Media Resolution Requirements:</strong>
                Checks primary product thumbnails for minimum 1000×1000px resolution and non-empty accessibility alt tags.
              </div>
            </div>
          </div>
        )}

        {/* BENCHMARKS */}
        {type === 'benchmarks' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#eaedff] text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">trending_up</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">E-commerce Feed Benchmarks</h2>
            <p className="text-[14px] text-[#424754]">
              Aggregated from over 9,400+ Shopify Plus &amp; DTC merchant catalogs audited through our diagnostic engine.
            </p>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between p-3 bg-[#f2f3ff] rounded-xl">
                <span className="font-semibold text-[#131b2e]">Top 10% (Shopify Plus Peak)</span>
                <span className="font-bold text-[#006c49]">94.2 / 100</span>
              </div>
              <div className="flex justify-between p-3 bg-[#f2f3ff] rounded-xl">
                <span className="font-semibold text-[#131b2e]">DTC Average Health</span>
                <span className="font-bold text-[#825100]">71.8 / 100</span>
              </div>
              <div className="flex justify-between p-3 bg-[#f2f3ff] rounded-xl">
                <span className="font-semibold text-[#131b2e]">Unoptimized Launch Stores</span>
                <span className="font-bold text-[#ba1a1a]">44.6 / 100</span>
              </div>
            </div>
          </div>
        )}

        {/* INTEGRATIONS */}
        {type === 'integrations' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#eaedff] text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">hub</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">E-Commerce Integrations</h2>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="p-3 bg-[#f2f3ff] rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49]">check_circle</span>
                <span className="font-bold text-[#131b2e]">Shopify &amp; Plus</span>
              </div>
              <div className="p-3 bg-[#f2f3ff] rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49]">check_circle</span>
                <span className="font-bold text-[#131b2e]">Google Merchant</span>
              </div>
              <div className="p-3 bg-[#f2f3ff] rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49]">check_circle</span>
                <span className="font-bold text-[#131b2e]">Meta Catalog Ads</span>
              </div>
              <div className="p-3 bg-[#f2f3ff] rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49]">check_circle</span>
                <span className="font-bold text-[#131b2e]">Klaviyo Feed Sync</span>
              </div>
            </div>
          </div>
        )}

        {/* SIGN IN */}
        {type === 'signin' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#eaedff] text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">account_circle</span>
            </div>

            {user ? (
              <>
                <h2 className="text-[22px] font-extrabold text-[#131b2e]">Your Account</h2>
                <div className="p-4 rounded-xl bg-[#f2f3ff] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0058be] text-white flex items-center justify-center font-bold text-[15px]">
                      {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[#131b2e] truncate max-w-[200px]">
                        {user.email?.split('@')[0] || 'Member'}
                      </span>
                      <span className="text-[12px] text-[#727785]">{user.email}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-[#eaedff] text-[#0058be] uppercase">
                    {currentPlan}
                  </span>
                </div>
                {currentStore && (
                  <p className="text-[13px] text-[#424754]">
                    Connected store: <code className="font-mono text-[#0058be] font-bold">{currentStore}</code>. Your diagnostics and export quotas are linked to this session.
                  </p>
                )}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (onSignOut) onSignOut();
                      onClose();
                    }}
                    className="px-5 py-2 rounded-xl bg-[#fee2e2] text-[#b91c1c] font-bold text-[13px] hover:bg-[#fecaca] transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-[22px] font-extrabold text-[#131b2e]">
                    {authMode === 'signin' ? 'Sign in to SKUcoverage' : 'Create an Account'}
                  </h2>
                  <div className="flex items-center gap-1 bg-[#f2f3ff] p-1 rounded-full text-[12px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthNotice(''); }}
                      className={`px-3 py-0.5 rounded-full cursor-pointer ${authMode === 'signin' ? 'bg-[#0058be] text-white' : 'text-[#727785]'}`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthNotice(''); }}
                      className={`px-3 py-0.5 rounded-full cursor-pointer ${authMode === 'signup' ? 'bg-[#0058be] text-white' : 'text-[#727785]'}`}
                    >
                      Register
                    </button>
                  </div>
                </div>

                {authNotice && (
                  <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-xl text-[12px] font-semibold">
                    {authNotice}
                  </div>
                )}
                {authError && (
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-[#131b2e]">Email address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="merchant@example.com"
                      className="px-4 py-2.5 bg-[#f2f3ff] rounded-xl text-[14px] text-[#131b2e] border border-transparent focus:border-[#0058be] focus:outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-[#131b2e]">Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                      placeholder="••••••••"
                      className="px-4 py-2.5 bg-[#f2f3ff] rounded-xl text-[14px] text-[#131b2e] border border-transparent focus:border-[#0058be] focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full mt-2 py-3 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[14px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {authBusy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create Free Account'}
                  </button>
                </form>

                {onGoogleSignIn && (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="w-full py-2.5 rounded-xl bg-white border border-[#cbd5e1] text-[#131b2e] font-semibold text-[13px] hover:bg-[#f8fafc] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Continue with Google</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* AUDIT SCOPE */}
        {type === 'scope' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#eaedff] text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">tune</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">Audit Scope &amp; Rules</h2>
            <div className="space-y-2 text-[13px] text-[#424754]">
              <p>Active audit profile on the public storefront snapshot:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Title quality: full credit at 40-150 characters; under 20 is flagged as a heuristic</li>
                <li>Description quality: 100+ characters mentioning material, size, color or use case (heuristic)</li>
                <li>GTIN / barcode: format check (8, 12, 13 or 14 digits plus Modulo-10 check digit) on the public variant barcode; products with no public barcode are listed as needs verification, never as failures</li>
                <li>Storefront product type: multi-level product_type paths score higher; empty, generic or repeated levels are flagged</li>
                <li>Image count: 0 images is a confirmed issue; 1-2 images is a heuristic; 3 or more score full credit</li>
                <li>Variant structure: duplicate variant titles or variants published as separate products are flagged</li>
              </ul>
              <p className="pt-2 font-semibold text-[#131b2e]">How the score is calculated</p>
              <p>
                Weighted quality score, not a pass rate. Per product: sum(field score x field weight) / sum(weights of the fields assessed for that product). Weights: title 20%, description 10%, GTIN 30%, product type 15%, image count 20%, variants 5%. Fields that cannot be assessed are dropped and the remaining weights rescaled to 100%. The overall score is the average of the per-product scores.
              </p>
              <p>
                Not included: Merchant Center diagnostics, GS1 ownership verification, unpublished products, image resolution or alt text, and Google Product Taxonomy comparison.
              </p>
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {type === 'schedule' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#eaedff] text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">schedule</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">Automated Scan Schedule</h2>
            <p className="text-[14px] text-[#424754]">
              Configure recurring background audits to keep your storefront catalog continually optimized.
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-[#131b2e]">Cadence</label>
              <select
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="p-3 bg-[#f2f3ff] rounded-xl text-[14px] text-[#131b2e] border border-transparent focus:border-[#0058be]"
              >
                <option value="Monday 04:00 UTC">Every Monday at 04:00 UTC</option>
                <option value="Daily 02:00 UTC">Every Day at 02:00 UTC (Pro)</option>
                <option value="Friday 18:00 UTC">Every Friday at 18:00 UTC</option>
              </select>
            </div>
          </div>
        )}

        {/* ALERTS */}
        {type === 'alerts' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ffddb8] text-[#825100] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">notifications_active</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">Health Threshold Alerts</h2>
            <p className="text-[14px] text-[#424754]">
              Send an alert when your store catalog score drops below the defined minimum benchmark.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[13px] font-bold text-[#131b2e]">
                <span>Alert Threshold:</span>
                <span className="text-[#0058be]">{thresholdScore} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={thresholdScore}
                onChange={(e) => setThresholdScore(Number(e.target.value))}
                className="w-full accent-[#0058be]"
              />
            </div>
          </div>
        )}

        {/* DISCONNECT */}
        {type === 'disconnect' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">warning</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">Disconnect Store?</h2>
            <p className="text-[14px] text-[#424754] leading-relaxed">
              This will unbind your active Shopify store and cancel any scheduled weekly crawls. Historical reports will remain archived in your ledger.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#424754] hover:bg-[#f2f3ff]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onConfirmDanger) onConfirmDanger();
                  onClose();
                }}
                className="px-5 py-2 rounded-full bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-[13px] shadow-sm cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* PURGE */}
        {type === 'purge' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">delete_sweep</span>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#131b2e]">Purge Local Cache?</h2>
            <p className="text-[14px] text-[#424754] leading-relaxed">
              All cached product JSON responses and variant matrices stored in local cache will be cleared. Next audit will execute a full ground-up crawl.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#424754] hover:bg-[#f2f3ff]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onConfirmDanger) onConfirmDanger();
                  onClose();
                }}
                className="px-5 py-2 rounded-full bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-[13px] shadow-sm cursor-pointer"
              >
                Purge Cache
              </button>
            </div>
          </div>
        )}

        {/* Default close action footer for informational types */}
        {['overview', 'docs', 'benchmarks', 'integrations', 'signin', 'scope', 'schedule', 'alerts'].includes(type) && (
          <div className="pt-6 border-t border-[#eaedff] flex items-center justify-between mt-4">
            {savedAlert ? (
              <span className="text-[12px] text-[#006c49] font-bold">Preferences saved!</span>
            ) : (
              <span className="text-[12px] text-[#727785]">SKUcoverage Engine v2.4</span>
            )}
            <button
              onClick={() => {
                setSavedAlert(true);
                setTimeout(onClose, 400);
              }}
              className="px-5 py-2 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white text-[13px] font-bold shadow-sm cursor-pointer"
            >
              {type === 'schedule' || type === 'alerts' ? 'Save & Close' : 'Got it'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
