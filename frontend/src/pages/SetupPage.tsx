import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DevicesPage } from './DevicesPage';
import { CommandSetsPage } from './CommandSetsPage';
import { SettingsPage } from './SettingsPage';
import { HardDrives, TerminalWindow, Gear } from '@phosphor-icons/react';
import { usePageMetadata } from '../hooks/usePageMetadata';

type SetupTab = 'devices' | 'commands' | 'settings';

export const SetupPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { devices, commandSets } = useAppStore();

  const activeTab = (searchParams.get('tab') as SetupTab) || 'devices';

  usePageMetadata({
    title:
      activeTab === 'settings'
        ? 'Settings — DriftGuard'
        : activeTab === 'commands'
          ? 'Command Sets — DriftGuard'
          : 'Device Setup — DriftGuard',
    canonicalPath: '/setup',
    robots: 'noindex, nofollow',
  });

  const handleTabChange = (tab: SetupTab) => {
    setSearchParams({ tab });
  };

  const tabs = [
    {
      id: 'devices' as SetupTab,
      label: 'Devices',
      icon: HardDrives,
      badge: devices.length,
    },
    {
      id: 'commands' as SetupTab,
      label: 'Command Sets',
      icon: TerminalWindow,
      badge: commandSets.length,
    },
    {
      id: 'settings' as SetupTab,
      label: 'Settings',
      icon: Gear,
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
        {activeTab === 'devices' && <DevicesPage />}
        {activeTab === 'commands' && <CommandSetsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
};
