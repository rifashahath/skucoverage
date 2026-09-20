import React, { useMemo, useState } from 'react';
import { StoreAuditData } from '../types';
import { buildReadinessSignals, getReadinessSummary, validateGtinFormat } from '../lib/channelReadiness';

interface ChannelReadinessViewProps {
  auditData: StoreAuditData;
  onReviewExport: () => void;
}

type ChannelFilter = 'all' | 'google' | 'meta';
type StatusFilter = 'all' | 'blocker' | 'attention';

const statusStyle = {
  blocker: { label: 'Blocker', classes: 'bg-[#ffdad6] text-[#93000a]', icon: 'error' },
  attention: { label: 'Needs attention', classes: 'bg-[#ffddb8] text-[#653e00]', icon: 'warning' },
};

export const ChannelReadinessView: React.FC<ChannelReadinessViewProps> = ({ auditData, onReviewExport }) => {
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [gtinInput, setGtinInput] = useState('');
  const signals = useMemo(() => buildReadinessSignals(auditData), [auditData]);
  const summary = useMemo(() => getReadinessSummary(auditData), [auditData]);
  const cleanQuery = query.trim().toLowerCase();
  const filtered = signals.filter((signal) =>
    (channel === 'all' || signal.channels.includes(channel)) &&
    (status === 'all' || signal.status === status) &&
    (!cleanQuery || `${signal.title} ${signal.description} ${signal.fieldLabel} ${signal.affectedProducts.map((item) => `${item.productTitle} ${item.sku}`).join(' ')}`.toLowerCase().includes(cleanQuery))
  );
  const hasAudit = auditData.productsCount > 0 || signals.length > 0;
  const gtinResult = gtinInput.trim() ? validateGtinFormat(gtinInput) : null;

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5 overflow-x-clip">
      <section className="bg-white rounded-2xl border border-[#c2c6d6]/40 shadow-xs overflow-hidden">
        <div className="p-4 min-[390px]:p-5 sm:p-7 bg-gradient-to-br from-[#e2e7ff] via-white to-[#e8fff4]">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="max-w-3xl">
              <span className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 text-[#0058be] text-[9px] min-[390px]:text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider border border-[#0058be]/15">
                <span className="material-symbols-outlined text-[15px]">campaign</span>
                Google Shopping + Meta catalogs
              </span>
              <h1 className="text-[24px] min-[390px]:text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#131b2e] mt-3">Channel readiness</h1>
              <p className="text-[13px] min-[390px]:text-[14px] sm:text-[15px] leading-6 text-[#424754] mt-2">
                See which product fields look ready to syndicate, which need review, and which may block a listing. This is a storefront-data check, not approval from Google or Meta.
              </p>
            </div>
            <button onClick={onReviewExport} className="inline-flex min-h-11 w-full lg:w-auto items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-[#0058be] hover:bg-[#004395] text-white text-[13px] font-bold shadow-sm transition-colors cursor-pointer shrink-0">
              Review affected products
              <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-[#c2c6d6]/30">
          {[
            { label: 'Ready', value: summary.ready, note: 'No current signal', icon: 'check_circle', tone: 'text-[#006c49]', bg: 'bg-[#e8fff4]' },
            { label: 'Needs attention', value: summary.attention, note: 'Review recommended', icon: 'warning', tone: 'text-[#825100]', bg: 'bg-[#fff4e5]' },
            { label: 'Potential blockers', value: summary.blocker, note: 'May stop listing use', icon: 'error', tone: 'text-[#ba1a1a]', bg: 'bg-[#fff0ee]' },
          ].map((item) => (
            <div key={item.label} className="p-4 min-[390px]:p-5 flex items-center gap-3 border-b sm:border-b-0 sm:border-r last:border-0 border-[#c2c6d6]/30">
              <span className={`w-10 h-10 rounded-xl ${item.bg} ${item.tone} flex items-center justify-center`}><span className="material-symbols-outlined text-[21px]">{item.icon}</span></span>
              <div><div className="text-[24px] leading-none font-extrabold text-[#131b2e]">{hasAudit ? item.value : '—'}</div><div className="text-[12px] font-bold text-[#424754] mt-1">{item.label}</div><div className="text-[10px] text-[#727785]">{item.note}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-[#c2c6d6]/40 p-3 min-[390px]:p-4 sm:p-5 shadow-xs">
        <div className="flex min-w-0 flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div aria-label="Filter by channel" className="grid grid-cols-1 min-[350px]:grid-cols-3 gap-2 min-w-0">
            {([['all', 'All channels'], ['google', 'Google Shopping'], ['meta', 'Meta catalogs']] as const).map(([value, label]) => (
              <button type="button" aria-pressed={channel === value} key={value} onClick={() => setChannel(value)} className={`min-h-11 min-w-0 px-2 min-[390px]:px-3.5 py-2 rounded-xl min-[500px]:rounded-full text-[11px] min-[390px]:text-[12px] leading-tight font-bold border cursor-pointer ${channel === value ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-white text-[#424754] border-[#c2c6d6]/60 hover:bg-[#f2f3ff]'}`}>{label}</button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative min-w-0 sm:w-64"><span className="material-symbols-outlined pointer-events-none absolute left-3 top-3 text-[18px] text-[#727785]">search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search field, product or SKU" className="w-full min-h-11 pl-9 pr-3 py-2 rounded-xl sm:rounded-full border border-[#c2c6d6]/60 bg-[#faf8ff] text-[12px] outline-none focus:border-[#0058be]" /></label>
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="min-h-11 w-full sm:w-auto px-3.5 py-2 rounded-xl sm:rounded-full border border-[#c2c6d6]/60 bg-white text-[12px] font-bold text-[#424754] outline-none cursor-pointer"><option value="all">All statuses</option><option value="blocker">Blockers</option><option value="attention">Needs attention</option></select>
          </div>
        </div>
      </section>

      {!hasAudit ? (
        <section className="bg-white rounded-2xl border border-dashed border-[#c2c6d6] p-10 text-center"><span className="material-symbols-outlined text-[38px] text-[#727785]">inventory_2</span><h2 className="text-[17px] font-extrabold mt-2">Run a catalog audit first</h2><p className="text-[13px] text-[#727785] mt-1">Channel readiness uses the same scanned product data as Store Overview.</p></section>
      ) : filtered.length === 0 ? (
        <section className="bg-white rounded-2xl border border-[#c2c6d6]/40 p-8 text-center"><span className="material-symbols-outlined text-[34px] text-[#006c49]">task_alt</span><h2 className="text-[16px] font-extrabold mt-2">No signals match these filters</h2><button onClick={() => { setChannel('all'); setStatus('all'); setQuery(''); }} className="text-[12px] font-bold text-[#0058be] mt-2 cursor-pointer">Clear filters</button></section>
      ) : (
        <section className="flex min-w-0 flex-col gap-3">
          <div><h2 className="text-[17px] min-[390px]:text-[18px] font-extrabold">Affected fields and products</h2><p className="text-[12px] text-[#727785] mt-0.5">{filtered.length} signal{filtered.length === 1 ? '' : 's'} from the current audit</p></div>
          {filtered.map((signal) => {
            const style = statusStyle[signal.status];
            return <article key={signal.id} className="min-w-0 bg-white rounded-2xl border border-[#c2c6d6]/40 p-3.5 min-[390px]:p-4 sm:p-5 shadow-xs">
              <div className="flex min-w-0 flex-col lg:flex-row lg:items-start justify-between gap-3 lg:gap-4">
                <div className="flex min-w-0 gap-2.5 min-[390px]:gap-3"><span className="w-9 h-9 min-[390px]:w-10 min-[390px]:h-10 rounded-xl bg-[#f2f3ff] text-[#0058be] flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[20px]">{signal.icon}</span></span><div className="min-w-0"><div className="flex min-w-0 flex-col items-start gap-1.5 min-[430px]:flex-row min-[430px]:flex-wrap min-[430px]:items-center min-[430px]:gap-2"><h3 className="min-w-0 break-words text-[14px] min-[390px]:text-[15px] leading-5 font-extrabold text-[#131b2e]">{signal.fieldLabel}</h3><span className={`inline-flex shrink-0 items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold ${style.classes}`}><span className="material-symbols-outlined text-[13px]">{style.icon}</span>{style.label}</span></div><p className="text-[13px] font-bold text-[#424754] mt-1">{signal.title}</p><p className="text-[12px] leading-5 text-[#727785] mt-1 max-w-3xl">{signal.description}</p></div></div>
                <div className="flex flex-wrap items-center gap-2 pl-11 min-[390px]:pl-[52px] lg:pl-0 lg:flex-col lg:items-end shrink-0"><span className="text-[12px] font-bold text-[#131b2e]">{signal.count} affected</span><div className="flex gap-1">{signal.channels.map((item) => <span key={item} className="px-2 py-0.5 rounded-full bg-[#eaedff] text-[#004395] text-[10px] font-bold">{item === 'google' ? 'Google' : 'Meta'}</span>)}</div></div>
              </div>
              <div className="mt-3 min-[390px]:mt-4 pt-3 min-[390px]:pt-4 border-t border-[#c2c6d6]/25 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 lg:items-center">
                <div className="text-[12px] text-[#424754]"><span className="font-extrabold text-[#131b2e]">Guidance: </span>{signal.affectedProducts[0]?.suggestedFix || 'Review this field in Shopify and compare it with the channel catalog requirements for this product.'}</div>
                {signal.affectedProducts.length > 0 && <div className="flex gap-1.5 flex-wrap">{signal.affectedProducts.slice(0, 3).map((product) => <span key={`${signal.id}-${product.sku}`} className="max-w-full break-all px-2 py-1 rounded-lg bg-[#faf8ff] border border-[#c2c6d6]/30 text-[10px] font-mono text-[#424754]">{product.productTitle || `Product ${product.sku}`}</span>)}{signal.affectedProducts.length > 3 && <span className="px-2 py-1 text-[10px] font-bold text-[#727785]">+{signal.affectedProducts.length - 3} more</span>}</div>}
              </div>
            </article>;
          })}
        </section>
      )}

      <section className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-w-0 bg-[#f2f3ff] rounded-2xl p-4 min-[390px]:p-5 border border-[#c2c6d6]/30"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#0058be]">fact_check</span><h2 className="text-[15px] font-extrabold">What this check can tell you</h2></div><ul className="mt-3 space-y-2 text-[12px] leading-5 text-[#424754]"><li>• Whether the public Shopify data has common feed fields.</li><li>• Which audited products and fields deserve review.</li><li>• The likely impact on Google Shopping and Meta catalog setup.</li></ul><p className="text-[11px] text-[#727785] mt-3">It cannot read Merchant Center or Commerce Manager diagnostics, confirm account policy status, or guarantee channel approval.</p></div>
        <div className="min-w-0 bg-white rounded-2xl p-4 min-[390px]:p-5 border border-[#c2c6d6]/40"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#0058be]">qr_code_2</span><h2 className="text-[15px] font-extrabold">Barcode format check</h2></div><p className="text-[12px] text-[#727785] mt-1">A valid result checks digits, length and checksum only. It does not prove GS1 assignment, brand ownership, product match or channel eligibility.</p><div className="flex min-w-0 flex-col sm:flex-row gap-2 mt-3"><input inputMode="numeric" value={gtinInput} onChange={(event) => setGtinInput(event.target.value)} placeholder="Enter 8, 12, 13 or 14 digits" className="min-h-11 min-w-0 flex-1 px-3 py-2 rounded-lg border border-[#c2c6d6]/60 text-[12px] outline-none focus:border-[#0058be]" /><div className={`min-h-11 sm:w-36 px-3 py-2 rounded-lg flex items-center justify-center text-[11px] font-bold text-center ${gtinResult === null ? 'bg-[#f2f3ff] text-[#727785]' : gtinResult ? 'bg-[#e8fff4] text-[#006c49]' : 'bg-[#fff0ee] text-[#ba1a1a]'}`}>{gtinResult === null ? 'Waiting for value' : gtinResult ? 'Format passes' : 'Format does not pass'}</div></div></div>
      </section>
    </div>
  );
};
