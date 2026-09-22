import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import { AuditRecord } from '../types';

interface AuditHistoryViewProps {
  historyRecords: AuditRecord[];
  onSelectAudit: (record: AuditRecord) => void;
  onRunNewAudit: () => void;
  onExportHistory: () => void;
  onConfigureSchedule: () => void;
  onConfigureAlerts: () => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({
  historyRecords,
  onSelectAudit,
  onRunNewAudit,
  onExportHistory,
  onConfigureSchedule,
  onConfigureAlerts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredRecords = historyRecords.filter(
    (item) =>
      item.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.date.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const completedRecords = historyRecords.filter((r) => r.status === 'Completed' && r.score != null);
  const latestRecord = completedRecords[0] || historyRecords[0];
  const priorRecord = completedRecords[1];

  const scoreDelta =
    latestRecord?.score != null && priorRecord?.score != null
      ? latestRecord.score - priorRecord.score
      : null;

  const uniqueStoresCount = new Set(historyRecords.map((r) => r.store).filter(Boolean)).size;
  const passRate =
    historyRecords.length > 0
      ? Math.round((historyRecords.filter((r) => r.status === 'Completed').length / historyRecords.length) * 100)
      : 0;

  // Recharts data — chronological (oldest first) for left→right trend
  const chartData = [...completedRecords]
    .reverse()
    .map((r) => ({ date: r.date, score: r.score }));

  const avgScore =
    chartData.length > 0
      ? Math.round(chartData.reduce((s, d) => s + (d.score ?? 0), 0) / chartData.length)
      : null;

  const handleRunNewAudit = () => {
    onRunNewAudit();
    toast.info('Audit queued — your catalog is being scanned. Results appear here when complete.');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0058be] mb-1">
            <span className="material-symbols-outlined text-[16px]">history_toggle_off</span>
            <span>Diagnostics Ledger</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-[#131b2e] tracking-tight leading-tight">
            Audit History
          </h1>
          <p className="text-[14px] text-[#424754] mt-0.5">
            Review previous catalog scans, tracked health improvements, and export historical reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunNewAudit}
            className="px-5 py-2.5 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] shadow-xs cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Run new audit</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-[#f2f3ff] p-5 rounded-[14px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
              Latest Audit Score
            </span>
            <span className="w-8 h-8 rounded-full bg-[#ffddb8] flex items-center justify-center text-[#825100]">
              <span className="material-symbols-outlined text-[18px]">analytics</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[36px] font-extrabold text-[#825100] leading-none">
              {latestRecord?.score != null ? latestRecord.score : '—'}
            </span>
            {latestRecord?.score != null && (
              <span className="text-[14px] font-semibold text-[#825100]">/ 100</span>
            )}
          </div>
          <div className="mt-2 text-[12px] text-[#727785] font-medium flex items-center gap-1">
            {scoreDelta !== null ? (
              <>
                <span className={`material-symbols-outlined text-[15px] ${scoreDelta >= 0 ? 'text-[#006c49]' : 'text-[#ba1a1a]'}`}>
                  {scoreDelta >= 0 ? 'north_east' : 'south_east'}
                </span>
                <span className={scoreDelta >= 0 ? 'text-[#006c49]' : 'text-[#ba1a1a]'}>
                  {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts vs prior run
                </span>
              </>
            ) : (
              <span>{historyRecords.length > 0 ? 'Initial baseline run' : 'No scans yet'}</span>
            )}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#f2f3ff] p-5 rounded-[14px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
              Score Movement
            </span>
            <span className="w-8 h-8 rounded-full bg-[#eaedff] flex items-center justify-center text-[#0058be]">
              <span className="material-symbols-outlined text-[18px]">show_chart</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[36px] font-extrabold text-[#131b2e] leading-none">
              {scoreDelta !== null ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}` : '—'}
            </span>
            {scoreDelta !== null && (
              <span className="text-[14px] font-semibold text-[#727785]">pts</span>
            )}
          </div>
          <div className="mt-2 text-[12px] text-[#727785]">
            {scoreDelta !== null
              ? scoreDelta > 0
                ? 'Score improving across scans'
                : scoreDelta < 0
                ? 'Score decreased from prior run'
                : 'Score unchanged from prior run'
              : (historyRecords.length > 0 ? 'Baseline established' : 'Awaiting first run')}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#f2f3ff] p-5 rounded-[14px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
              Stores Audited
            </span>
            <span className="w-8 h-8 rounded-full bg-[#eaedff] flex items-center justify-center text-[#0058be]">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[36px] font-extrabold text-[#131b2e] leading-none">
              {uniqueStoresCount}
            </span>
            <span className="text-[14px] font-semibold text-[#727785]">
              {uniqueStoresCount === 1 ? 'Store' : 'Stores'}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-[#727785]">
            {historyRecords.length} total diagnostic run{historyRecords.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#f2f3ff] p-5 rounded-[14px] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">
              Audit Pass Rate
            </span>
            <span className="w-8 h-8 rounded-full bg-[#d8e2ff] flex items-center justify-center text-[#006c49]">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[36px] font-extrabold text-[#006c49] leading-none">
              {historyRecords.length > 0 ? `${passRate}%` : '—'}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-[#006c49] font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span>
              {completedRecords.length} of {historyRecords.length} completed
            </span>
          </div>
        </div>
      </section>

      {/* Score Trend Chart — Recharts */}
      {chartData.length >= 2 && (
        <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0058be] mb-1">
                <span className="material-symbols-outlined text-[16px]">show_chart</span>
                <span>Health Score Trend</span>
              </div>
              <p className="text-[13px] text-[#424754]">
                Score trajectory across all completed audits for this store.
              </p>
            </div>
            {avgScore !== null && (
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#727785]">Avg Score</div>
                <div className="text-[28px] font-extrabold text-[#0058be] leading-none">{avgScore}<span className="text-[14px] font-semibold text-[#727785]">/100</span></div>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eaedff" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#727785' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#727785' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #eaedff', borderRadius: 10, fontSize: 13 }}
                formatter={(v: number) => [`${v} / 100`, 'Score']}
              />
              {avgScore !== null && (
                <ReferenceLine y={avgScore} stroke="#c2c6d6" strokeDasharray="4 4" label={{ value: `avg ${avgScore}`, fill: '#727785', fontSize: 11 }} />
              )}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#0058be"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0058be', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2170e4' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-[#e2e8f0] flex flex-col gap-6">
        {/* Table Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#727785] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter audits or stores..."
              className="w-full pl-10 pr-4 py-2 bg-[#f2f3ff] rounded-full text-[14px] text-[#131b2e] placeholder:text-[#727785] focus:outline-hidden focus:ring-2 focus:ring-[#0058be]/20 border border-transparent focus:border-[#0058be]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-[#424754] hover:text-[#131b2e] bg-[#f2f3ff] hover:bg-[#eaedff] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eaedff] text-[11px] font-bold uppercase tracking-wider text-[#727785]">
                <th className="pb-3 font-bold">Date</th>
                <th className="pb-3 font-bold">Store</th>
                <th className="pb-3 font-bold">Score</th>
                <th className="pb-3 font-bold">Status</th>
                <th className="pb-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaedff]/60 text-[14px]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#727785]">
                    No audit records match your search filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const hasScore = typeof record.score === 'number' && !isNaN(record.score);
                  const scoreColor = !hasScore
                    ? 'bg-[#eaedff] text-[#727785]'
                    : record.score >= 85
                    ? 'bg-[#6ffbbe] text-[#002113]'
                    : record.score >= 65
                    ? 'bg-[#ffddb8] text-[#2a1700]'
                    : 'bg-[#ffdad6] text-[#93000a]';

                  const statusConfig =
                    record.status === 'Completed'
                      ? { dot: 'bg-[#006c49]', text: 'text-[#006c49]' }
                      : record.status === 'In Progress'
                      ? { dot: 'bg-[#0058be]', text: 'text-[#0058be]' }
                      : { dot: 'bg-[#ba1a1a]', text: 'text-[#ba1a1a]' };

                  return (
                    <tr key={record.id} className="hover:bg-[#f2f3ff]/60 transition-colors group">
                      <td className="py-4 text-[#131b2e] font-semibold">
                        <div className="flex flex-col">
                          <span>{record.date}</span>
                          <span className="text-[12px] text-[#727785] font-normal">{record.time}</span>
                        </div>
                      </td>
                      <td className="py-4 text-[#131b2e] font-mono text-[13px]">{record.store || '—'}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold ${scoreColor}`}>
                          {hasScore ? `${record.score} / 100` : '—'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${statusConfig.text}`}>
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                          <span>{record.status}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => onSelectAudit(record)}
                          className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0058be] hover:text-[#2170e4] hover:underline cursor-pointer"
                        >
                          <span>View Report</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#eaedff]">
          <span className="text-[13px] text-[#727785]">
            Showing{' '}
            <strong className="text-[#131b2e]">
              {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
            </strong>{' '}
            of <strong className="text-[#131b2e]">{filteredRecords.length}</strong> audits
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-[#c2c6d6]/40 text-[#424754] hover:bg-[#f2f3ff] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous Page"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-8 h-8 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
                  currentPage === num
                    ? 'bg-[#0058be] text-white'
                    : 'text-[#424754] hover:bg-[#f2f3ff]'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-[#c2c6d6]/40 text-[#424754] hover:bg-[#f2f3ff] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next Page"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Interactive Footer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Export Complete History */}
        <div
          onClick={onExportHistory}
          className="p-5 rounded-[18px] bg-white border border-[#c2c6d6]/30 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-[#eaedff] flex items-center justify-center text-[#0058be] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[20px]">file_download</span>
            </div>
            <span className="material-symbols-outlined text-[#727785] group-hover:text-[#0058be] text-[18px]">
              open_in_new
            </span>
          </div>
          <h3 className="text-[15px] font-bold text-[#131b2e] group-hover:text-[#0058be] transition-colors">
            Export Complete History
          </h3>
          <p className="text-[12px] text-[#424754] mt-1">
            Download full audit logs and health variance trajectories formatted for Google Sheets or Excel.
          </p>
        </div>

        {/* Card 2: Automated Weekly Recurrence */}
        <div
          onClick={onConfigureSchedule}
          className="p-5 rounded-[18px] bg-white border border-[#c2c6d6]/30 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-[#d8e2ff] flex items-center justify-center text-[#006c49] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#6ffbbe] text-[#002113] text-[10px] font-bold uppercase">
              Active
            </span>
          </div>
          <h3 className="text-[15px] font-bold text-[#131b2e] group-hover:text-[#006c49] transition-colors">
            Automated Weekly Recurrence
          </h3>
          <p className="text-[12px] text-[#424754] mt-1">
            Background worker automatically crawls catalogs every Monday at 04:00 UTC.
          </p>
        </div>

        {/* Card 3: Health Threshold Alerts */}
        <div
          onClick={onConfigureAlerts}
          className="p-5 rounded-[18px] bg-white border border-[#c2c6d6]/30 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-[#ffddb8] flex items-center justify-center text-[#825100] group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <span className="material-symbols-outlined text-[#727785] group-hover:text-[#825100] text-[18px]">
              settings
            </span>
          </div>
          <h3 className="text-[15px] font-bold text-[#131b2e] group-hover:text-[#825100] transition-colors">
            Health Threshold Alerts
          </h3>
          <p className="text-[12px] text-[#424754] mt-1">
            Trigger Slack or email notifications if score drops below 70/100 threshold.
          </p>
        </div>
      </div>
    </div>
  );
};
