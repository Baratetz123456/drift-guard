import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PaginationToolbar } from '../components/common/PaginationToolbar';
import { AuditLogEntry } from '../types';
import {
  ShieldCheck,
  MagnifyingGlass,
  CheckCircle,
  User,
  CaretDown,
  CaretUp,
  Funnel,
  DownloadSimple,
  Camera,
  GitDiff,
  Sparkle,
  TerminalWindow,
} from '@phosphor-icons/react';

export const AuditPage: React.FC = () => {
  const { auditLogs, addToast } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action)));

  const handleExportLogs = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driftguard-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast('info', 'Audit logs exported as JSON');
  };

  const filteredLogs = auditLogs.filter((log: AuditLogEntry) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesStatus && matchesAction;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-zinc-300" weight="duotone" />
            <span>Audit Trail</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Immutable audit records written asynchronously to DynamoDB with AWS 90-day TTL expiration.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<DownloadSimple className="w-4 h-4" weight="bold" />}
          onClick={handleExportLogs}
        >
          Export
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search action, user, resource..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Funnel className="w-3.5 h-3.5 text-zinc-500" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="ALL">All Actions</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Flat Data Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/70 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Resource Target</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                    <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-300 text-xs">No matching audit records</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Try adjusting search term or status/action filters</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('ALL');
                        setActionFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className="mt-3 text-xs text-[#c8ff00] font-bold hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log: AuditLogEntry) => {
                  const isExpanded = expandedLogId === log.auditId;
                  return (
                    <React.Fragment key={log.auditId}>
                      <tr className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-zinc-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-zinc-100">
                          <div className="flex items-center gap-2">
                            {log.action.includes('SNAPSHOT') ? (
                              <Camera className="w-3.5 h-3.5 text-blue-400 shrink-0" weight="bold" />
                            ) : log.action.includes('COMPARISON') ? (
                              <GitDiff className="w-3.5 h-3.5 text-[#c8ff00] shrink-0" weight="bold" />
                            ) : log.action.includes('AI') ? (
                              <Sparkle className="w-3.5 h-3.5 text-amber-400 shrink-0" weight="fill" />
                            ) : (
                              <TerminalWindow className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            )}
                            <span className="font-mono text-xs">{log.action}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{log.userEmail}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-zinc-300">
                          {log.resource}: <span className="text-white">{log.resourceId}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={log.status === 'SUCCESS' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.auditId)}
                            className="inline-flex items-center gap-1 text-zinc-300 hover:text-white font-mono text-[11px] cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                            {isExpanded ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-zinc-950/80 border-b border-zinc-800">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                              <pre>{JSON.stringify(log, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationToolbar
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredLogs.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
};
