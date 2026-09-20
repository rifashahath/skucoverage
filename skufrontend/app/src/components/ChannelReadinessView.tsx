import React, { useMemo, useState } from 'react';
import { StoreAuditData, CatalogIssue } from '../types';
import {
  buildReadinessSignals,
  getReadinessSummary,
  validateGtinFormat,
  READINESS_STATUS_META,
  CHANNEL_LABELS,
} from '../lib/channelReadiness';

interface ChannelReadinessViewProps {
  auditData: StoreAuditData;
  onReviewExport: () => void;
  onInspectIssue: (issue: CatalogIssue) => void;
}

type ChannelFilter = 'all' | 'google' | 'meta';
type StatusFilter = 'all' | 'blocker' | 'attention' | 'verification';

export const ChannelReadinessView: React.FC<ChannelReadinessViewProps> = ({ auditData, onReviewExport, onInspectIssue }) => {
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [gtinInput, setGtinInput] = useState('');
  const signals = useMemo(() => buildReadinessSignals(auditData), [auditData]);
  const summary = useMemo(() => getReadinessSummary(auditData), [auditData]);
  const cleanQuery = query.trim().toLowerCase();
  const filtered = signals.filter((signal) =>
    (channel === 'all' || signal.channels.includes(channel)) &&
    (status === 'all' || signal.readinessStatus === status) &&
    (!cleanQuery || `${signal.title} ${signal.description} ${signal.fieldLabel} ${signal.affectedProducts.map((item) => `${item.productTitle} ${item.sku}`).join(' ')}`.toLowerCase().includes(cleanQuery))
  );
  const hasAudit = (auditData.productsCount > 0 || signals.length > 0) && summary.scanned > 0;
  const gtinResult = gtinInput.trim() ? validateGtinFormat(gtinInput) : null;
  const recommendedSignal = signals.find((item) => item.readinessStatus === 'blocker')
    || signals.find((item) => item.readinessStatus === 'verification')
    || signals.find((item) => item.readinessStatus === 'attention');

  const outcome = summary.blocker.findings > 0
    ? {
        icon: 'error',
        tone: 'text-[#ba1a1a]',
        bg: 'bg-[#fff0ee]',
        heading: `${summary.blocker.products} product${summary.blocker.products === 1 ? '' : 's'} may be blocked`,
        text: 'Review these first. They may prevent a product from listing, syncing or being eligible.',
        action: 'Review potential blockers',
      }
    : summary.verification.findings > 0
      ? {
          icon: 'check_circle',
          tone: 'text-[#006c49]',
          bg: 'bg-[#e8fff4]',
          heading: 'No potential blockers found',
          text: `${summary.verification.products} product${summary.verification.products === 1 ? '' : 's'} still need a quick verification before you rely on the result.`,
          action: 'Start with verification',
        }
      : summary.attention.findings > 0
        ? {
            icon: 'check_circle',
            tone: 'text-[#006c49]',
            bg: 'bg-[#e8fff4]',
            heading: 'No potential blockers found',
            text: `${summary.attention.products} product${summary.attention.products === 1 ? '' : 's'} have suggested improvements. They may still be usable as they are.`,
            action: 'Review suggestions',
          }
        : {
            icon: 'task_alt',
            tone: 'text-[#006c49]',
            bg: 'bg-[#e8fff4]',
            heading: 'All scanned products look ready',
            text: 'No channel-readiness findings were detected in the public storefront data.',
            action: 'Open review and export',
          };

  const summaryCards = [
    { key: 'ready', filter: 'all' as StatusFilter, label: 'Ready', value: summary.ready, unit: 'products', sub: 'No findings detected', icon: 'check_circle', tone: 'text-[#006c49]', bg: 'bg-[#e8fff4]' },
    { key: 'attention', filter: 'attention' as StatusFilter, label: 'Needs attention', value: summary.attention.products, unit: 'products', sub: `${summary.attention.findings} finding${summary.attention.findings === 1 ? '' : 's'} · improvements suggested`, icon: READINESS_STATUS_META.attention.icon, tone: READINESS_STATUS_META.attention.tone, bg: READINESS_STATUS_META.attention.bg },
    { key: 'verification', filter: 'verification' as StatusFilter, label: 'Needs verification', value: summary.verification.products, unit: 'products', sub: `${summary.verification.findings} finding${summary.verification.findings === 1 ? '' : 's'} · not a confirmed error`, icon: READINESS_STATUS_META.verification.icon, tone: READINESS_STATUS_META.verification.tone, bg: READINESS_STATUS_META.verification.bg },
    { key: 'blocker', filter: 'blocker' as StatusFilter, label: 'Potential blockers', value: summary.blocker.products, unit: 'products', sub: `${summary.blocker.findings} finding${summary.blocker.findings === 1 ? '' : 's'} · review first`, icon: READINESS_STATUS_META.blocker.icon, tone: READINESS_STATUS_META.blocker.tone, bg: READINESS_STATUS_META.blocker.bg },
  ];

  const handleRecommendedAction = () => {
    if (recommendedSignal) onInspectIssue(recommendedSignal);
    else onReviewExport();
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5 overflow-x-clip">
      <section className="overflow-hidden rounded-2xl border border-[#c2c6d6]/40 bg-white shadow-xs">
        <div className="p-4 min-[390px]:p-5 sm:p-7 bg-gradient-to-br from-[#e2e7ff] via-white to-[#e8fff4]">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#0058be]/15 bg-white/80 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#0058be] min-[390px]:text-[10px] sm:text-[11px]">
            <span className="material-symbols-outlined text-[15px]">campaign</span>
            Google Shopping + Meta catalogs
          </span>
          <h1 className="mt-3 text-[24px] font-extrabold tracking-tight text-[#131b2e] min-[390px]:text-[26px] sm:text-[32px]">Channel readiness</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#424754] min-[390px]:text-[14px] sm:text-[15px]">
            Check whether your product data looks ready for Google Shopping and Meta catalogs.
          </p>

          {hasAudit && (
            <div className={`mt-5 flex flex-col gap-4 rounded-2xl border border-white/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${outcome.bg}`}>
              <div className="flex min-w-0 gap-3">
                <span className={`material-symbols-outlined mt-0.5 shrink-0 text-[25px] ${outcome.tone}`}>{outcome.icon}</span>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-extrabold text-[#131b2e] sm:text-[19px]">{outcome.heading}</h2>
                  <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#424754] sm:text-[13px]">{outcome.text}</p>
                </div>
              </div>
              <button onClick={handleRecommendedAction} className="inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0058be] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#004395] sm:w-auto">
                {outcome.action}
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 border-t border-[#c2c6d6]/30 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <button
              type="button"
              key={item.key}
              disabled={!hasAudit || item.key === 'ready'}
              onClick={() => item.key !== 'ready' && setStatus(item.filter)}
              className={`flex min-h-[118px] items-start gap-3 border-b border-[#c2c6d6]/30 p-4 text-left min-[390px]:p-5 sm:odd:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 ${hasAudit && item.key !== 'ready' ? 'cursor-pointer transition-colors hover:bg-[#faf8ff]' : ''}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.tone}`}><span className="material-symbols-outlined text-[21px]">{item.icon}</span></span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[24px] font-extrabold leading-none text-[#131b2e]">{hasAudit ? item.value : '—'}</span>
                  {hasAudit && <span className="text-[11px] font-bold text-[#727785]">{item.unit}</span>}
                </span>
                <span className="mt-1 block text-[12px] font-bold text-[#424754]">{item.label}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-[#727785]">{hasAudit ? item.sub : 'Run an audit first'}</span>
              </span>
            </button>
          ))}
        </div>

        {hasAudit && (
          <details className="border-t border-[#c2c6d6]/30 bg-[#faf8ff] px-4 py-3 min-[390px]:px-5 sm:px-7">
            <summary className="min-h-8 cursor-pointer text-[12px] font-bold text-[#0058be]">What do these numbers mean?</summary>
            <p className="mt-2 max-w-4xl text-[12px] leading-5 text-[#424754]">
              <strong className="text-[#131b2e]">{summary.totalFindings} findings across {summary.affectedProducts} of {summary.scanned} scanned products.</strong>{' '}
              A finding is one field check flagged on one product. One product can have several findings. A finding is counted once even when it affects both Google and Meta.
              {!summary.exact && ' Product counts are estimated from the products listed with each finding.'}
            </p>
          </details>
        )}
      </section>

      <section className="rounded-2xl border border-[#c2c6d6]/40 bg-white p-3 shadow-xs min-[390px]:p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-[#727785]">Show results for</p>
            <div aria-label="Filter by channel" className="grid min-w-0 grid-cols-1 gap-2 min-[350px]:grid-cols-3">
              {([['all', 'Both channels'], ['google', CHANNEL_LABELS.google], ['meta', CHANNEL_LABELS.meta]] as const).map(([value, label]) => (
                <button type="button" aria-pressed={channel === value} key={value} onClick={() => setChannel(value)} className={`min-h-11 min-w-0 cursor-pointer rounded-xl border px-2 py-2 text-[11px] font-bold leading-tight min-[390px]:px-3.5 min-[390px]:text-[12px] min-[500px]:rounded-full ${channel === value ? 'border-[#0058be] bg-[#0058be] text-white' : 'border-[#c2c6d6]/60 bg-white text-[#424754] hover:bg-[#f2f3ff]'}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-64"><span className="material-symbols-outlined pointer-events-none absolute left-3 top-3 text-[18px] text-[#727785]">search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search field, product or SKU" className="min-h-11 w-full rounded-xl border border-[#c2c6d6]/60 bg-[#faf8ff] py-2 pl-9 pr-3 text-[12px] outline-none focus:border-[#0058be] sm:rounded-full" /></label>
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="min-h-11 w-full cursor-pointer rounded-xl border border-[#c2c6d6]/60 bg-white px-3.5 py-2 text-[12px] font-bold text-[#424754] outline-none sm:w-auto sm:rounded-full">
              <option value="all">All statuses</option>
              <option value="blocker">Potential blockers</option>
              <option value="attention">Needs attention</option>
              <option value="verification">Needs verification</option>
            </select>
          </div>
        </div>
      </section>

      {!hasAudit ? (
        <section className="rounded-2xl border border-dashed border-[#c2c6d6] bg-white p-10 text-center"><span className="material-symbols-outlined text-[38px] text-[#727785]">inventory_2</span><h2 className="mt-2 text-[17px] font-extrabold">Run a catalog audit first</h2><p className="mt-1 text-[13px] text-[#727785]">Channel readiness uses the same scanned product data as Store Overview.</p></section>
      ) : filtered.length === 0 ? (
        <section className="rounded-2xl border border-[#c2c6d6]/40 bg-white p-8 text-center"><span className="material-symbols-outlined text-[34px] text-[#006c49]">task_alt</span><h2 className="mt-2 text-[16px] font-extrabold">No findings match these filters</h2><button onClick={() => { setChannel('all'); setStatus('all'); setQuery(''); }} className="mt-2 cursor-pointer text-[12px] font-bold text-[#0058be]">Clear filters</button></section>
      ) : (
        <section className="flex min-w-0 flex-col gap-3">
          <div><h2 className="text-[17px] font-extrabold min-[390px]:text-[18px]">What needs your attention</h2><p className="mt-0.5 text-[12px] text-[#727785]">{filtered.length} result group{filtered.length === 1 ? '' : 's'}. Open a result to see products, current values, evidence and recommended fixes.</p></div>
          {filtered.map((signal) => {
            const style = READINESS_STATUS_META[signal.readinessStatus];
            return <article key={signal.id} className="min-w-0 rounded-2xl border border-[#c2c6d6]/40 bg-white p-3.5 shadow-xs min-[390px]:p-4 sm:p-5">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-2.5 min-[390px]:gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f3ff] text-[#0058be] min-[390px]:h-10 min-[390px]:w-10"><span className="material-symbols-outlined text-[20px]">{signal.icon}</span></span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <h3 className="min-w-0 break-words text-[14px] font-extrabold leading-5 text-[#131b2e] min-[390px]:text-[15px]">{signal.title}</h3>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ${style.classes}`}><span className="material-symbols-outlined text-[13px]">{style.icon}</span>{style.label}</span>
                    </div>
                    <p className="mt-1 max-w-3xl text-[12px] leading-5 text-[#727785]">{signal.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-[#727785]">
                      <span>{signal.confidenceLabel}</span><span aria-hidden="true">·</span>
                      <span>{signal.count} product{signal.count === 1 ? '' : 's'} affected</span><span aria-hidden="true">·</span>
                      <span>{signal.channels.map((item) => item === 'google' ? 'Google' : 'Meta').join(' + ')}</span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => onInspectIssue(signal)} className="inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#0058be]/30 bg-white px-4 py-2 text-[12px] font-bold text-[#0058be] transition-colors hover:bg-[#0058be] hover:text-white sm:w-auto">
                  Review details
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </article>;
          })}
        </section>
      )}

      <details className="min-w-0 rounded-2xl border border-[#c2c6d6]/40 bg-white p-4 min-[390px]:p-5">
        <summary className="min-h-8 cursor-pointer text-[14px] font-extrabold text-[#131b2e]">How this channel check works</summary>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl bg-[#f2f3ff] p-4"><h2 className="text-[13px] font-extrabold">What we can check</h2><ul className="mt-2 space-y-1 text-[12px] leading-5 text-[#424754]"><li>• Whether the public Shopify data has common feed fields.</li><li>• Which audited products and fields deserve review.</li><li>• The likely impact on Google Shopping and Meta catalog setup.</li></ul><p className="mt-2 text-[11px] text-[#727785]">This cannot read Merchant Center or Commerce Manager diagnostics, confirm account policy status, or guarantee channel approval.</p></div>
          <div className="min-w-0 rounded-xl border border-[#c2c6d6]/30 p-4"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#0058be]">qr_code_2</span><h2 className="text-[13px] font-extrabold">Check a barcode format</h2></div><p className="mt-1 text-[11px] leading-5 text-[#727785]">This checks digits, length and checksum only. It does not prove GS1 assignment, brand ownership, product match or channel eligibility.</p><div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row"><input inputMode="numeric" value={gtinInput} onChange={(event) => setGtinInput(event.target.value)} placeholder="Enter 8, 12, 13 or 14 digits" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#c2c6d6]/60 px-3 py-2 text-[12px] outline-none focus:border-[#0058be]" /><div className={`flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-center text-[11px] font-bold sm:w-36 ${gtinResult === null ? 'bg-[#f2f3ff] text-[#727785]' : gtinResult ? 'bg-[#e8fff4] text-[#006c49]' : 'bg-[#fff0ee] text-[#ba1a1a]'}`}>{gtinResult === null ? 'Waiting for value' : gtinResult ? 'Format passes' : 'Format does not pass'}</div></div></div>
        </div>
      </details>
    </div>
  );
};
