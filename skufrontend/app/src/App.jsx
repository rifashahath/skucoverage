import React, { useState, useEffect, useRef } from 'react';
import { EMPTY_AUDIT_DATA } from './data/emptyAudit';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CatalogHealthView } from './components/CatalogHealthView';
import { AuditHistoryView } from './components/AuditHistoryView';
import { SettingsView } from './components/SettingsView';
import { ChannelReadinessView } from './components/ChannelReadinessView';
import { SeoMediaView } from './components/SeoMediaView';
import { CategoryMapperView } from './components/CategoryMapperView';
import { FixExportCenterView } from './components/FixExportCenterView';
import { BeginnerGuideView } from './components/BeginnerGuideView';
import { UpgradeModal } from './components/UpgradeModal';
import { InspectIssueModal } from './components/InspectIssueModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { InfoModals } from './components/InfoModals';
import { useAuth } from './context/AuthContext';
import { api } from './lib/api';
import { mapEngineReportToStoreAudit } from './lib/auditMapping';

/**
 * URL Route Mappings for Full-Fidelity Tab Navigation
 */
const ROUTE_TAB_MAP = {
  '': 'catalog-health',
  'dashboard': 'catalog-health',
  'catalog-health': 'catalog-health',
  'channel-readiness': 'channel-readiness',
  'barcodes': 'channel-readiness',
  'seo-images': 'seo-images',
  'categories': 'categories',
  'fix-export': 'fix-export',
  'quick-guide': 'quick-guide',
  'audit-history': 'audit-history',
  'settings': 'settings',
};

const TAB_ROUTE_MAP = {
  'catalog-health': '/app',
  'dashboard': '/app',
  'channel-readiness': '/app/channel-readiness',
  'seo-images': '/app/seo-images',
  'categories': '/app/categories',
  'fix-export': '/app/fix-export',
  'quick-guide': '/app/quick-guide',
  'audit-history': '/app/audit-history',
  'settings': '/app/settings',
};

function getRouteFromPathname(pathname) {
  const clean = (pathname || '').replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);
  const appIdx = parts.indexOf('app');
  if (appIdx !== -1) {
    return parts[appIdx + 1] || '';
  }
  return parts[0] || '';
}

/**
 * Dedicated Modern Auth Screen for /app/signup and /app/login
 */
function AuthScreen({ initialMode = 'signup' }) {
  const { signIn, signUp, signInWithGoogle, resendConfirmation } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const changeMode = (newMode) => {
    setMode(newMode);
    setAuthError('');
    setNotice('');
    window.history.pushState(null, '', `/app/${newMode}`);
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email, password, name);
        if (signUpError) throw signUpError;
        setNotice('Check your email to confirm your account.');
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
        window.history.replaceState(null, '', '/app');
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthBusy(false);
    }
  };

  const resendAuthConfirmation = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const { error: resendError } = await resendConfirmation(email);
      if (resendError) throw resendError;
      setNotice('Confirmation email resent.');
    } catch (err) {
      setAuthError(err.message || 'Failed to resend confirmation');
    } finally {
      setAuthBusy(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.07)] border border-[#e2e8f0] overflow-hidden flex flex-col md:flex-row">
        {/* Left: Merchant Value Propositions & Trust Signals */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-[#0058be] to-[#154699] p-8 sm:p-10 text-white flex flex-col justify-between">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-[22px]">barcode</span>
              </div>
              <span className="font-bold text-[20px] tracking-tight text-white">SKUcoverage</span>
            </div>

            <div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider text-white mb-2">
                For Shopify Store Owners
              </span>
              <h2 className="text-[22px] sm:text-[24px] font-extrabold leading-tight">
                Fix Catalog Errors. Maximize Google Shopping Ad ROAS.
              </h2>
              <p className="text-[13px] text-white/80 mt-2 leading-relaxed">
                Scan your public storefront to catch missing GTINs, broken categories, and truncated titles before ad platforms disapprove your products.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-start gap-3 text-[13px]">
                <span className="material-symbols-outlined text-[18px] text-[#6ffbbe] shrink-0 mt-0.5">check_circle</span>
                <span><strong>Zero Setup:</strong> Just paste your .myshopify.com store domain — no API keys required.</span>
              </div>
              <div className="flex items-start gap-3 text-[13px]">
                <span className="material-symbols-outlined text-[18px] text-[#6ffbbe] shrink-0 mt-0.5">check_circle</span>
                <span><strong>6-Axis Scoring:</strong> Immediate diagnostic of titles, barcodes, images, and categories.</span>
              </div>
              <div className="flex items-start gap-3 text-[13px]">
                <span className="material-symbols-outlined text-[18px] text-[#6ffbbe] shrink-0 mt-0.5">check_circle</span>
                <span><strong>Actionable Fix CSV:</strong> Export structured fix lists to review and update products fast.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/15 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#6ffbbe] flex items-center justify-center text-[#002113]">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <div className="text-[12px] text-white/90">
              <strong>Free tier available:</strong> Scan up to 100 SKUs instantly with zero payment details.
            </div>
          </div>
        </div>

        {/* Right: Authentication Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-center gap-6">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#131b2e] tracking-tight">
              {isSignup ? 'Create your merchant account' : 'Welcome back'}
            </h1>
            <p className="text-[14px] text-[#64748b] mt-1">
              {isSignup
                ? 'Start with a free catalog audit. Takes less than 60 seconds.'
                : 'Sign in to access your audit reports, score history, and fix lists.'}
            </p>
          </div>

          {notice && (
            <div className="p-3.5 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-xl text-[13px] font-semibold flex items-center justify-between gap-2">
              <span>{notice}</span>
              {isSignup && (
                <button
                  type="button"
                  onClick={resendAuthConfirmation}
                  disabled={authBusy}
                  className="text-[#0058be] underline hover:no-underline text-[12px] cursor-pointer"
                >
                  Resend
                </button>
              )}
            </div>
          )}

          {authError && (
            <div className="p-3.5 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[13px] font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={submitAuth} className="flex flex-col gap-4">
            {isSignup && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#131b2e]">Your name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Merchant"
                  className="px-4 py-2.5 bg-[#f2f3ff] rounded-xl text-[14px] text-[#131b2e] border border-transparent focus:border-[#0058be] focus:outline-hidden focus:ring-2 focus:ring-[#0058be]/20"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#131b2e]">Work email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@store.com"
                className="px-4 py-2.5 bg-[#f2f3ff] rounded-xl text-[14px] text-[#131b2e] border border-transparent focus:border-[#0058be] focus:outline-hidden focus:ring-2 focus:ring-[#0058be]/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#131b2e]">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="px-4 py-2.5 bg-[#f2f3ff] rounded-xl text-[14px] text-[#131b2e] border border-transparent focus:border-[#0058be] focus:outline-hidden focus:ring-2 focus:ring-[#0058be]/20"
              />
            </div>

            <button
              type="submit"
              disabled={authBusy}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#0058be] to-[#2170e4] hover:opacity-95 text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(59,130,246,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {authBusy ? 'Please wait…' : isSignup ? 'Create Free Account' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full py-2.5 rounded-xl bg-white border border-[#cbd5e1] text-[#131b2e] font-semibold text-[13px] hover:bg-[#f8fafc] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Continue with Google</span>
          </button>

          <p className="text-[13px] text-[#64748b] text-center pt-1">
            {isSignup ? 'Already have an account? ' : 'New to SKUcoverage? '}
            <button
              type="button"
              onClick={() => changeMode(isSignup ? 'login' : 'signup')}
              className="text-[#0058be] font-bold hover:underline cursor-pointer"
            >
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * RFC 4180 CSV serialisation with spreadsheet-formula neutralisation.
 *
 * The previous exports joined raw values with commas, so any product title
 * containing a comma, quote or newline silently shifted every later column,
 * and a title beginning with = or + executed as a formula when the file was
 * opened. Values also went through encodeURI in a data: URI, which corrupts
 * non-ASCII text; a Blob download avoids that entirely.
 */
function toCsv(rows) {
  const cell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return rows.map((row) => (row || []).map(cell).join(',')).join('\r\n');
}

function downloadCsv(filename, rows) {
  // A UTF-8 BOM makes Excel read accented characters correctly.
  const blob = new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const CACHE_AUDIT_DATA_KEY = 'skucoverage_cached_audit_data';
const CACHE_AUDIT_STAGE_KEY = 'skucoverage_cached_audit_stage';

function getCachedAuditData() {
  try {
    const raw = localStorage.getItem(CACHE_AUDIT_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.healthScore === 'number') return parsed;
    }
  } catch {}
  return EMPTY_AUDIT_DATA;
}

function getCachedAuditStage() {
  try {
    const stage = localStorage.getItem(CACHE_AUDIT_STAGE_KEY);
    if (stage === 'results' || stage === 'empty') return stage;
  } catch {}
  return 'empty';
}

function saveAuditCache(data, stage) {
  try {
    if (stage === 'results' && data && typeof data.healthScore === 'number') {
      localStorage.setItem(CACHE_AUDIT_DATA_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_AUDIT_STAGE_KEY, stage);
    } else if (stage === 'empty') {
      localStorage.removeItem(CACHE_AUDIT_DATA_KEY);
      localStorage.removeItem(CACHE_AUDIT_STAGE_KEY);
    }
  } catch {}
}

export function App() {
  const { user, session, loading, signOut, signIn, signUp, signInWithGoogle } = useAuth();

  // Initial tab resolution from current URL pathname
  const getInitialTab = () => {
    const segment = getRouteFromPathname(window.location.pathname);
    return ROUTE_TAB_MAP[segment] || 'catalog-health';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [auditStage, setAuditStage] = useState(getCachedAuditStage);
  const [auditData, setAuditData] = useState(getCachedAuditData);
  const [isInitialAuditsLoading, setIsInitialAuditsLoading] = useState(() => {
    try {
      return !localStorage.getItem(CACHE_AUDIT_DATA_KEY);
    } catch {
      return true;
    }
  });
  const [historyRecords, setHistoryRecords] = useState([]);
  const [activeAuditDownloadUrl, setActiveAuditDownloadUrl] = useState(null);
  const [profile, setProfile] = useState(null);

  // Modals
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [inspectIssue, setInspectIssue] = useState(null);
  const [inspectProduct, setInspectProduct] = useState(null);
  const [infoModalType, setInfoModalType] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  const showToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  // Synchronize Tab Changes with Browser URL
  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    const targetRoute = TAB_ROUTE_MAP[tabId] || '/app';
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  // Sync tab on browser Back / Forward (popstate)
  useEffect(() => {
    const syncFromUrl = () => {
      const segment = getRouteFromPathname(window.location.pathname);
      if (segment === 'signup' || segment === 'login') {
        if (session) {
          window.history.replaceState(null, '', '/app');
          setActiveTab('catalog-health');
        }
      } else {
        const matched = ROUTE_TAB_MAP[segment] || 'catalog-health';
        setActiveTab(matched);
      }
    };

    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [session]);

  // Clean /app/signup or /app/login if already authenticated
  useEffect(() => {
    const segment = getRouteFromPathname(window.location.pathname);
    if ((segment === 'signup' || segment === 'login') && session) {
      window.history.replaceState(null, '', '/app');
      setActiveTab('catalog-health');
    } else if (ROUTE_TAB_MAP[segment]) {
      setActiveTab(ROUTE_TAB_MAP[segment]);
    }
  }, [session]);

  // Load account data and past audits from real backend
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      showToast('🎉 Subscription active! Your Pro plan is now live — unlimited audits unlocked.');
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (session) {
      api.me()
        .then((me) => {
          setProfile(me);
          if (me?.storeUrl) {
            setAuditData((prev) => ({ ...prev, storeDomain: me.storeUrl }));
          }
        })
        .catch(console.error);

      api.listAudits()
        .then(({ audits }) => {
          if (audits && audits.length) {
            const mapped = audits.map((a) => ({
              id: a.id,
              date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              store: a.store_url || '',
              score: typeof a.score === 'number' ? Math.round(a.score) : null,
              status: a.status === 'completed' ? 'Completed' : a.status === 'pending' ? 'In Progress' : 'Failed',
            }));
            setHistoryRecords(mapped);

            const latest = audits[0];
            if (latest && latest.id) {
              api.getAudit(latest.id)
                .then((res) => {
                  if (res?.report) {
                    const mappedData = mapEngineReportToStoreAudit(res.report, latest.store_url, latest.id);
                    if (mappedData) {
                      setAuditData(mappedData);
                      setAuditStage('results');
                      saveAuditCache(mappedData, 'results');
                    }
                    if (res.downloadUrl) {
                      setActiveAuditDownloadUrl(res.downloadUrl);
                    }
                  }
                })
                .catch(console.error)
                .finally(() => setIsInitialAuditsLoading(false));
            } else {
              setIsInitialAuditsLoading(false);
            }
          } else {
            setIsInitialAuditsLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          setIsInitialAuditsLoading(false);
        });
    } else {
      setIsInitialAuditsLoading(false);
    }
  }, [session]);

  // Clean up poll & toast timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const refreshProfile = () => {
    if (!session) return;
    api.me().then(setProfile).catch(console.error);
  };

  const refreshAudits = () => {
    if (!session) return;
    api.listAudits()
      .then(({ audits }) => {
        if (audits?.length) {
          const mapped = audits.map((a) => ({
            id: a.id,
            date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            store: a.store_url || '',
            score: typeof a.score === 'number' ? Math.round(a.score) : null,
            status: a.status === 'completed' ? 'Completed' : a.status === 'pending' ? 'In Progress' : 'Failed',
          }));
          setHistoryRecords(mapped);
        }
      })
      .catch(console.error);
  };

  // Start a live audit
  const handleStartAudit = async (storeDomain) => {
    setAuditStage('scanning');
    setAuditData((prev) => ({ ...prev, storeDomain }));

    try {
      let res;
      if (session) {
        res = await api.createAudit(storeDomain);
      } else {
        // A failed scan used to be swallowed and replaced with a three second
        // delay and a hardcoded 'score: 74' success message. The failure is
        // now surfaced.
        res = await api.anonymousAudit(storeDomain);
      }
      const auditId = res?.auditId;

      if (res.status === 'completed') {
        const mapped = mapEngineReportToStoreAudit(res.report, storeDomain, auditId);
        if (mapped) {
          setAuditData(mapped);
          saveAuditCache(mapped, 'results');
        }
        if (res.downloadUrl) setActiveAuditDownloadUrl(res.downloadUrl);
        setAuditStage('results');
        showToast(mapped?.healthScore == null ? `Audit completed for ${storeDomain}.` : `Audit completed for ${storeDomain}. Health score: ${mapped.healthScore}/100`);
        refreshAudits();
        refreshProfile();
        return;
      }

      // Polling loop
      const startTime = Date.now();
      const MAX_POLL_MS = 90000;
      const INTERVAL_MS = 2500;

      const poll = async () => {
        try {
          const statusRes = await api.getAudit(auditId);
          if (statusRes.status === 'completed') {
            const mapped = mapEngineReportToStoreAudit(statusRes.report, storeDomain, auditId);
            if (mapped) {
              setAuditData(mapped);
              saveAuditCache(mapped, 'results');
            }
            if (statusRes.downloadUrl) setActiveAuditDownloadUrl(statusRes.downloadUrl);
            setAuditStage('results');
            showToast(mapped?.healthScore == null ? `Audit completed for ${storeDomain}.` : `Audit completed for ${storeDomain}. Health score: ${mapped.healthScore}/100`);
            refreshAudits();
            refreshProfile();
          } else if (statusRes.status === 'error') {
            setAuditStage('empty');
            showToast(`Audit failed: ${statusRes.error || 'Check store domain and retry.'}`);
          } else {
            if (Date.now() - startTime >= MAX_POLL_MS) {
              setAuditStage('results');
              showToast('Audit is still running in background. View latest in History.');
              refreshAudits();
            } else {
              pollTimerRef.current = setTimeout(poll, INTERVAL_MS);
            }
          }
        } catch (pollErr) {
          showToast(`Status check error: ${pollErr.message}`);
          setAuditStage('results');
        }
      };

      pollTimerRef.current = setTimeout(poll, INTERVAL_MS);
    } catch (err) {
      const errMsg = err.message || 'Audit request failed';
      showToast(errMsg);
      setAuditStage('empty');
      if (
        errMsg.toLowerCase().includes('limit') ||
        errMsg.toLowerCase().includes('upgrade') ||
        errMsg.toLowerCase().includes('free plan allows') ||
        errMsg.toLowerCase().includes('too many')
      ) {
        setIsUpgradeOpen(true);
      }
    }
  };

  const handleCancelAudit = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setAuditStage('empty');
    showToast('Audit scan cancelled.');
  };

  /*
   * Selecting items for the fix list.
   *
   * These handlers used to move the health score, the issue counts and the
   * attribute bars locally, with no request to any backend and no change in
   * Shopify. Clicking "fix" raised the score by 2, "fix all" by 3 per item, and
   * the batch button hardcoded the result to 92/100 with 14 issues remaining.
   * The catalog was untouched, so the report no longer described the store.
   *
   * SKUcoverage does not write to Shopify. The only honest thing a selection
   * can do is build the export list. The score changes when, and only when, a
   * re-scan reads the real catalog again.
   */
  const markSelected = (skus) => {
    setAuditData((prev) => ({
      ...prev,
      issues: prev.issues.map((iss) => ({
        ...iss,
        affectedItems: (iss.affectedItems || []).map((item) =>
          skus.includes(item.sku) ? { ...item, selectedForExport: true } : item
        ),
      })),
    }));
  };

  const handleFixItem = (sku) => {
    markSelected([sku]);
    showToast(`${sku} added to the fix list. Export the CSV, import it in Shopify, then re-scan to update your score.`);
  };

  const handleFixAllInIssue = (issueId) => {
    const targetIssue = auditData.issues.find((i) => i.id === issueId);
    const skus = (targetIssue?.affectedItems || []).map((item) => item.sku);
    markSelected(skus);
    showToast(`${skus.length} product${skus.length === 1 ? '' : 's'} added to the fix list. Your score updates after you import the changes and re-scan.`);
  };

  const handleBatchFixSelected = () => {
    const skus = auditData.issues.flatMap((iss) => (iss.affectedItems || []).map((item) => item.sku));
    markSelected(skus);
    showToast(`${skus.length} product${skus.length === 1 ? '' : 's'} added to the fix list. Nothing has changed in Shopify yet - export the CSV to apply the changes.`);
  };

  // Download real CSV of audit report
  const handleDownloadReportCsv = async () => {
    if (activeAuditDownloadUrl) {
      try {
        showToast('Downloading fix-list CSV...');
        const blob = await api.downloadCsv(activeAuditDownloadUrl);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `catalog-audit-${auditData.storeDomain}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast('Fix-list CSV downloaded successfully.');
        return;
      } catch (e) {
        console.warn('R2 download fallback to client export', e);
      }
    }

    const csvRows = [
      ['Store Domain', auditData.storeDomain],
      ['Catalog Health Score', `${auditData.healthScore}/100`],
      ['Total Products Scanned', auditData.productsCount.toString()],
      ['Total Findings', (auditData.findingSummary?.totalFindings ?? auditData.detectedIssuesCount).toString()],
      ['Confirmed Issues', (auditData.findingSummary?.confirmedIssues ?? 0).toString()],
      ['Needs Verification', (auditData.findingSummary?.verificationItems ?? 0).toString()],
      ['Optimization Opportunities', (auditData.findingSummary?.opportunities ?? 0).toString()],
      ['High-priority Confirmed Issues', auditData.highPriorityCount.toString()],
      [],
      ['Status', 'Priority', 'Finding', 'Count', 'Rule'],
      ...auditData.issues.map((i) => [
        i.status === 'needs_verification' ? 'Needs verification' : i.status === 'heuristic' ? 'Opportunity (heuristic)' : 'Confirmed (observed)',
        i.severity,
        i.title,
        i.count,
        i.rule || i.description,
      ]),
      [],
      ['Attribute', 'Score Percentage'],
      ...auditData.attributeBreakdown.map((a) => [a.name, a.score == null ? 'Not assessed' : `${a.score}%`]),
    ];

    downloadCsv(`catalog-health-report-${auditData.storeDomain}.csv`, csvRows);
    showToast('CSV report generated and downloaded.');
  };

  // Download real CSV of audit history
  const handleExportHistoryCsv = () => {
    const csvRows = [
      ['Audit ID', 'Date', 'Time', 'Store Domain', 'Score', 'Status'],
      ...historyRecords.map((r) => [r.id, r.date, r.time, r.store, `${r.score}/100`, r.status]),
    ];
    downloadCsv('skucoverage-audit-history.csv', csvRows);
    showToast('Complete audit ledger history exported to CSV.');
  };

  // Selecting audit record from table loads that store report
  const handleSelectHistoryRecord = async (record) => {
    try {
      showToast(`Loading audit report for ${record.store}...`);
      const res = await api.getAudit(record.id);
      if (res?.report) {
        const mapped = mapEngineReportToStoreAudit(res.report, record.store, record.id);
        if (mapped) {
          setAuditData(mapped);
          saveAuditCache(mapped, 'results');
        }
        if (res.downloadUrl) setActiveAuditDownloadUrl(res.downloadUrl);
      } else {
        setAuditData((prev) => ({
          ...prev,
          storeDomain: record.store,
          healthScore: record.score,
          scoreStatus: record.score >= 85 ? 'Excellent' : record.score >= 70 ? 'Fair' : 'Needs work',
        }));
      }
      handleSelectTab('catalog-health');
      setAuditStage('results');
      showToast(`Loaded audit report for ${record.store}`);
    } catch (err) {
      setAuditData((prev) => ({
        ...prev,
        storeDomain: record.store,
        healthScore: record.score,
      }));
      handleSelectTab('catalog-health');
      setAuditStage('results');
    }
  };

  // Sign out and clear local cache
  const handleSignOut = async () => {
    saveAuditCache(null, 'empty');
    setAuditStage('empty');
    setAuditData(EMPTY_AUDIT_DATA);
    setHistoryRecords([]);
    await signOut();
  };

  // Update primary storefront domain
  const handleUpdateStore = async (newStore) => {
    try {
      await api.updateMe(newStore);
      setAuditData((prev) => ({ ...prev, storeDomain: newStore }));
      setProfile((prev) => ({ ...prev, storeUrl: newStore }));
      showToast(`Primary connected storefront updated to ${newStore}`);
    } catch (err) {
      showToast(err.message || 'Failed to update store in settings');
    }
  };

  // Stripe Checkout upgrade
  const handleUpgradeStripe = async (priceTier) => {
    try {
      // The selected tier was being dropped here, so every upgrade attempt
      // reached the backend with no price and failed.
      const res = await api.subscribe(priceTier);
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      showToast(err.message || 'Unable to open checkout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8ff] text-[#0058be] font-bold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
          <span className="text-[14px]">Loading SKUcoverage...</span>
        </div>
      </div>
    );
  }

  // Check if visitor is unauthenticated on /app/signup or /app/login
  const currentPathSegment = getRouteFromPathname(window.location.pathname);
  const isAuthRoute = currentPathSegment === 'signup' || currentPathSegment === 'login';

  if (!session && isAuthRoute) {
    return <AuthScreen initialMode={currentPathSegment === 'signup' ? 'signup' : 'login'} />;
  }

  const currentPlanLabel = profile?.plan === '39' ? 'Pro $39' : profile?.plan === '19' ? 'Pro $19' : 'Free';

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        onOpenNavModal={(section) => setInfoModalType(section)}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main Body Layout with Sidebar */}
      <div className="flex-1 pt-16 md:pl-64 w-full flex justify-center">
        {/* Left Fixed Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          issueCounts={{ readiness: auditData.issues.reduce((sum, issue) => sum + (issue.count || 0), 0) }}
          storeDomain={auditData.storeDomain}
          productsCount={auditData.productsCount}
        />

        {/* Center Main Scrollable Canvas */}
        <main className="min-w-0 w-full max-w-6xl xl:max-w-7xl p-3 min-[390px]:p-4 sm:p-6 lg:p-10 mx-auto">
          {/* Mobile drawer open trigger */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#c2c6d6]/40 text-[13px] font-bold text-[#131b2e] shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">menu</span>
              <span>Menu</span>
            </button>
          </div>

          {/* TAB 1: Store Overview / Catalog Health */}
          {(activeTab === 'catalog-health' || activeTab === 'dashboard') && (
            isInitialAuditsLoading && session && auditStage === 'empty' ? (
              <div className="flex flex-col items-center justify-center min-h-[420px] w-full py-20 text-center">
                <div className="w-9 h-9 border-3 border-[#0058be] border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-[16px] font-bold text-[#131b2e] mb-1">Loading Catalog Diagnostics</h3>
                <p className="text-[13px] text-[#727785]">Retrieving latest audit data...</p>
              </div>
            ) : (
              <CatalogHealthView
                auditStage={auditStage}
                auditData={auditData}
                onStartAudit={handleStartAudit}
                onCancelAudit={handleCancelAudit}
                onInspectIssue={(issue) => setInspectIssue(issue)}
                onInspectProduct={(product) => setInspectProduct(product)}
                onBatchFix={handleBatchFixSelected}
                onDownloadCsv={handleDownloadReportCsv}
                onOpenAuditScope={() => setInfoModalType('scope')}
                onNavigateTab={handleSelectTab}
                onOpenUpgrade={() => setIsUpgradeOpen(true)}
              />
            )
          )}

          {/* TAB: Google Shopping + Meta channel readiness */}
          {activeTab === 'channel-readiness' && (
            <ChannelReadinessView
              auditData={auditData}
              onReviewExport={() => handleSelectTab('fix-export')}
              onInspectIssue={(issue) => setInspectIssue(issue)}
            />
          )}

          {/* TAB: SEO & Image Alt Text */}
          {activeTab === 'seo-images' && (
            <SeoMediaView
              altIssue={auditData.issues.find((i) => i.category === 'alt-text' || i.id.includes('alt') || i.id.includes('image'))}
              descIssue={auditData.issues.find((i) => i.category === 'description' || i.id.includes('desc'))}
              flaggedProducts={auditData.flaggedProducts}
              onFixItem={handleFixItem}
              onFixAll={handleFixAllInIssue}
            />
          )}

          {/* TAB: Google Categories & Taxonomy */}
          {activeTab === 'categories' && (
            <CategoryMapperView
              catIssue={auditData.issues.find((i) => i.category === 'category' || i.id.includes('cat'))}
              onFixItem={handleFixItem}
              onFixAll={handleFixAllInIssue}
            />
          )}

          {/* TAB: Review & Export Center */}
          {activeTab === 'fix-export' && (
            <FixExportCenterView
              auditData={auditData}
              onBatchFix={handleBatchFixSelected}
              onDownloadCsv={handleDownloadReportCsv}
            />
          )}

          {/* TAB: Beginner's Guide */}
          {activeTab === 'quick-guide' && <BeginnerGuideView />}

          {/* TAB: Audit History */}
          {activeTab === 'audit-history' && (
            <AuditHistoryView
              historyRecords={historyRecords}
              onSelectAudit={handleSelectHistoryRecord}
              onRunNewAudit={() => {
                handleSelectTab('catalog-health');
                setAuditStage('empty');
              }}
              onExportHistory={handleExportHistoryCsv}
              onConfigureSchedule={() => setInfoModalType('schedule')}
              onConfigureAlerts={() => setInfoModalType('alerts')}
            />
          )}

          {/* TAB: Settings */}
          {activeTab === 'settings' && (
            <SettingsView
              currentStore={auditData.storeDomain}
              onUpdateStore={handleUpdateStore}
              onOpenUpgrade={() => setIsUpgradeOpen(true)}
              onDisconnectStore={() => setInfoModalType('disconnect')}
              onPurgeCache={() => setInfoModalType('purge')}
              userEmail={user?.email || profile?.email}
              profile={profile}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131b2e] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10 animate-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-[#6ffbbe] text-[20px]">
            check_circle
          </span>
          <span className="text-[13px] font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Upgrade to Pro Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        onSuccessUpgrade={() => {
          showToast('Upgraded to Pro! All feature limits and daily audit quotas removed.');
          refreshProfile();
        }}
        currentPlan={currentPlanLabel}
        onUpgradeStripe={handleUpgradeStripe}
      />

      {/* Inspect Issue Drawer / Modal */}
      <InspectIssueModal
        issue={inspectIssue}
        onClose={() => setInspectIssue(null)}
        onFixItem={handleFixItem}
        onFixAll={handleFixAllInIssue}
      />

      {/* Flagged Product Detail Modal */}
      <ProductDetailModal
        product={inspectProduct}
        onClose={() => setInspectProduct(null)}
        onSaveProduct={(sku) => {
          handleFixItem(sku);
        }}
      />

      {/* Info Modals (Docs, Benchmarks, Integrations, Sign in, Scope, Alerts, Danger actions) */}
      <InfoModals
        type={infoModalType}
        onClose={() => setInfoModalType(null)}
        onConfirmDanger={() => {
          if (infoModalType === 'disconnect') {
            setAuditData((prev) => ({ ...prev, storeDomain: 'disconnected.myshopify.com' }));
            showToast('Storefront disconnected.');
          } else if (infoModalType === 'purge') {
            showToast('Local audit cache purged.');
          }
        }}
        user={user}
        onSignOut={signOut}
        onSignIn={signIn}
        onSignUp={signUp}
        onGoogleSignIn={signInWithGoogle}
        currentStore={auditData.storeDomain}
        currentPlan={currentPlanLabel}
      />
    </div>
  );
}

export default App;