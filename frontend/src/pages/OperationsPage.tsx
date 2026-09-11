import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { CollectPage } from './CollectPage';
import { SnapshotsPage } from './SnapshotsPage';
import { AuditPage } from './AuditPage';
import { Camera, Database, ShieldCheck } from '@phosphor-icons/react';
import { usePageMetadata } from '../hooks/usePageMetadata';

type OperationsTab = 'capture' | 'snapshots' | 'audit';

export const OperationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { snapshots, auditLogs } = useAppStore();

  const activeTab = (searchParams.get('tab') as OperationsTab) || 'capture';

  usePageMetadata({
    title:
      activeTab === 'snapshots'
        ? 'Snapshots — DriftGuard'
        : activeTab === 'audit'
          ? 'Audit Logs — DriftGuard'
          : 'Operations & Capture — DriftGuard',
    canonicalPath: '/operations',
    robots: 'noindex, nofollow',
  });

  const handleTabChange = (tab: OperationsTab) => {
    setSearchParams({ tab });
  };

  const tabs = [
    {
      id: 'capture' as OperationsTab,
      label: 'Capture',
      icon: Camera,
    },
    {
      id: 'snapshots' as OperationsTab,
      label: 'Snapshots',
      icon: Database,
      badge: snapshots.length,
    },
    {
      id: 'audit' as OperationsTab,
      label: 'Audit Trail',
      icon: ShieldCheck,
      badge: auditLogs.length,
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Phase Navigation Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Viewport */}
      <div>
        {activeTab === 'capture' && <CollectPage />}
        {activeTab === 'snapshots' && <SnapshotsPage />}
        {activeTab === 'audit' && <AuditPage />}
      </div>
    </div>
  );
};
