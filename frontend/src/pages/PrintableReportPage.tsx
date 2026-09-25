import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { PrintableAIReport } from '../components/analysis/PrintableAIReport';
import { PrintableSnapshotReport } from '../components/analysis/PrintableSnapshotReport';
import { PrintableAuditEventReport } from '../components/analysis/PrintableAuditEventReport';
import { PrintableAuditLedgerReport } from '../components/analysis/PrintableAuditLedgerReport';
import { Button } from '../components/common/Button';
import { Printer, X, FileText, ArrowLeft } from '@phosphor-icons/react';

export const PrintableReportPage: React.FC = () => {
  const { type, id, analysisId } = useParams<{ type?: string; id?: string; analysisId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { analyses, comparisons, snapshots, auditLogs } = useAppStore();

  const isLedgerPath = location.pathname.includes('/reports/audit/ledger');

  // Determine effective document mode
  const reportType = isLedgerPath ? 'audit' : (type || (analysisId ? 'analysis' : 'analysis'));
  const targetId = isLedgerPath ? 'ledger' : (id || analysisId || '');

  // Resolve matching entity
  const analysis =
    reportType === 'analysis'
      ? analyses.find((a) => a.analysisId === targetId) || analyses[0]
      : undefined;
  const comparison = analysis
    ? comparisons.find((c) => c.comparisonId === analysis.comparisonId)
    : undefined;

  const snapshot =
    reportType === 'snapshot'
      ? snapshots.find((s) => s.snapshotId === targetId) || snapshots[0]
      : undefined;

  const auditLog =
    reportType === 'audit' && targetId !== 'ledger'
      ? auditLogs.find((l) => l.auditId === targetId) || auditLogs[0]
      : undefined;

  const documentRef =
    reportType === 'snapshot'
      ? snapshot?.snapshotId || targetId
      : reportType === 'audit'
      ? targetId === 'ledger'
        ? 'DG-AUDIT-LEDGER'
        : auditLog?.auditId || targetId
      : analysis?.analysisId || targetId;

  const documentTitle =
    reportType === 'snapshot'
      ? 'Snapshot State Dossier'
      : reportType === 'audit'
      ? targetId === 'ledger'
        ? 'Audit Trail Ledger Dossier'
        : 'Security Audit Event Record'
      : 'Drift Verification Dossier';

  useEffect(() => {
    document.title = `DriftGuard — ${documentTitle} (${documentRef})`;
  }, [documentTitle, documentRef]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      window.close();
      // If window.close() is blocked by browser policy (e.g. not opened by window.open), fallback navigate
      if (reportType === 'snapshot') navigate('/operations?tab=snapshots');
      else if (reportType === 'audit') navigate('/operations?tab=audit');
      else navigate('/analysis?tab=report');
    } else {
      if (reportType === 'snapshot') navigate('/operations?tab=snapshots');
      else if (reportType === 'audit') navigate('/operations?tab=audit');
      else navigate('/analysis?tab=report');
    }
  };

  // Check if entity exists
  const notFound =
    (reportType === 'analysis' && !analysis) ||
    (reportType === 'snapshot' && !snapshot) ||
    (reportType === 'audit' && targetId !== 'ledger' && !auditLog);

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center space-y-4">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto" weight="duotone" />
          <h1 className="text-xl font-bold text-white">Document Record Not Found</h1>
          <p className="text-xs text-zinc-400">
            The requested {documentTitle} with identifier "{targetId}" could not be located in the current session vault.
          </p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={handleClose}
          >
            Return to Operations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col items-center py-6 px-4 sm:px-8 font-sans print:bg-white print:p-0 print:m-0 print:block">
      {/* Floating Operational Toolbar (Screen Only, Hidden on Print) */}
      <div className="w-full max-w-[210mm] mb-4 flex items-center justify-between bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 px-4 shadow-xl backdrop-blur-md print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#c8ff00]" weight="bold" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{documentTitle}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                1:1 Scale (210mm A4)
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Ref: {documentRef}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<X className="w-3.5 h-3.5" />}
            onClick={handleClose}
          >
            Close
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Printer className="w-4 h-4" weight="bold" />}
            onClick={handlePrint}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Actual Size A4 Canvas (210mm width, Pure White Canvas, Card-free Ruled Architecture) */}
      <div className="w-full flex justify-center print:block print:p-0 print:m-0">
        <div className="shadow-2xl print:shadow-none bg-white">
          {reportType === 'analysis' && analysis && (
            <PrintableAIReport
              analysis={analysis}
              comparison={comparison}
            />
          )}

          {reportType === 'snapshot' && snapshot && (
            <PrintableSnapshotReport
              snapshot={snapshot}
            />
          )}

          {reportType === 'audit' && targetId === 'ledger' && (
            <PrintableAuditLedgerReport
              logs={auditLogs}
            />
          )}

          {reportType === 'audit' && targetId !== 'ledger' && auditLog && (
            <PrintableAuditEventReport
              log={auditLog}
            />
          )}
        </div>
      </div>

      {/* Clean Global Print CSS Isolation */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #printable-document-shell,
          #printable-ai-report {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
