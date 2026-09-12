import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import {
  ShieldCheck,
  ArrowLeft,
  CaretRight,
  Copy,
  Check,
  User,
  Clock,
  HardDrives,
  TerminalWindow,
} from '@phosphor-icons/react';

export const AuditLogDetailPage: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();
  const { auditLogs } = useAppStore();

  const log = auditLogs.find((l) => l.auditId === auditId);
  const [copied, setCopied] = useState(false);

  if (!log) {
    return (
      <div className="space-y-6 font-sans max-w-4xl mx-auto">
        <div className="p-8 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <ShieldCheck className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-zinc-200">Audit Record Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1">The requested immutable audit record could not be found.</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/operations?tab=audit')}
            className="mt-4"
          >
            Back to Audit Logs
          </Button>
        </div>
      </div>
    );
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link
          to="/operations?tab=audit"
          className="hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Logs</span>
        </Link>
        <CaretRight className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-100 font-mono font-bold">{log.auditId}</span>
      </div>

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">{log.action}</h1>
            <Badge
              variant={log.status === 'SUCCESS' ? 'success' : 'danger'}
              size="sm"
            >
              {log.status}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Event ID: {log.auditId} • {new Date(log.timestamp).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={copied ? <Check className="w-4 h-4 text-[#c8ff00]" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopyJson}
          >
            {copied ? 'Copied' : 'Copy Event JSON'}
          </Button>
        </div>
      </div>

      {/* Structured Event Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="text-[11px] text-zinc-500 uppercase font-mono border-b border-zinc-800 pb-1.5">
            Operator Context
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Actor Email:</span>
              <span className="font-semibold text-zinc-200">{log.userEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Operator ID:</span>
              <span className="font-mono text-zinc-300">{log.userId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Recorded Timestamp:</span>
              <span className="font-mono text-zinc-300">{new Date(log.timestamp).toISOString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="text-[11px] text-zinc-500 uppercase font-mono border-b border-zinc-800 pb-1.5">
            Target Resource
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Resource Category:</span>
              <span className="font-mono text-zinc-200 font-bold">{log.resource}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Resource Identifier:</span>
              <span className="font-mono text-white font-semibold">{log.resourceId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Execution Status:</span>
              <Badge variant={log.status === 'SUCCESS' ? 'success' : 'danger'} size="sm">
                {log.status}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Raw Event JSON Viewer */}
      <Card className="p-5 border-zinc-800 bg-zinc-900/60 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <TerminalWindow className="w-4 h-4 text-zinc-400" />
            <h3 className="font-bold text-sm text-zinc-200">Raw Immutable Audit Record</h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">JSON Payload</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-200 overflow-x-auto leading-relaxed whitespace-pre">
          {JSON.stringify(log, null, 2)}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/operations?tab=audit')}
          >
            Back to Audit Logs
          </Button>
        </div>
      </Card>
    </div>
  );
};
