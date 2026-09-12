import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  SquaresFour,
  SlidersHorizontal,
  Camera,
  GitDiff,
  SignOut,
  CaretRight,
  GlobeHemisphereWest,
  Clock,
  GearSix,
} from '@phosphor-icons/react';
import { BrandLogo } from '../common/BrandLogo';
import { ToastContainer } from '../common/ToastContainer';
import { useAppStore } from '../../store/useAppStore';
import { detectUserTimezoneAndRegion } from '../../utils/geoDetection';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { devices, snapshots, comparisons, user, logout } = useAppStore();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const geoInfo = useMemo(() => detectUserTimezoneAndRegion(), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const navItems = [
    { to: '/', label: 'Overview', icon: SquaresFour },
    { to: '/setup', label: 'Setup', icon: SlidersHorizontal, badge: devices.length },
    { to: '/operations', label: 'Operations', icon: Camera, badge: snapshots.length },
    { to: '/analysis', label: 'Analysis', icon: GitDiff, badge: comparisons.length },
  ];

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl shrink-0 z-20">
        {/* Logo & Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <BrandLogo variant="full" showTagline={true} size={26} />
          <span className="px-1.5 py-0.5 bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30 text-[10px] font-mono font-bold rounded">
            v1.2
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                    weight={isActive ? 'fill' : 'regular'}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono rounded-full ${
                      isActive ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Minimal Footer */}
        <div className="p-3.5 border-t border-slate-800/80 px-4 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
          <span>DriftGuard Platform</span>
          <span className="text-[10px] text-zinc-600">Active</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-lg flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="font-semibold text-slate-300">DriftGuard Workspace</span>
            <CaretRight className="w-4 h-4 text-zinc-600" />
            <span className="text-zinc-200 font-mono text-xs capitalize">
              {location.pathname === '/'
                ? 'Overview'
                : location.pathname.split('/')[1]?.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/operations?tab=capture"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#c8ff00] text-zinc-950 hover:bg-[#b8ea00] transition-all cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4" weight="bold" />
              <span>Capture</span>
            </NavLink>

            <NavLink
              to="/analysis?tab=compare"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 hover:border-[#c8ff00]/40 transition-all cursor-pointer"
            >
              <GitDiff className="w-4 h-4" weight="bold" />
              <span>Compare</span>
            </NavLink>

            {/* Top-Right User Profile Trigger & Dropdown */}
            <div className="relative ml-1" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 p-1 pl-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group"
                title="Operator Profile & Region"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors leading-tight">
                    {user?.name || 'Lead Architect'}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono leading-tight">
                    {geoInfo.regionCode}
                  </div>
                </div>
                <div className="relative w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-[#c8ff00]">
                  {(user?.name || 'LA')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#c8ff00] border-2 border-zinc-950" />
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-4 space-y-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Details */}
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/80">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-[#c8ff00]">
                      {(user?.name || 'LA')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-zinc-100 truncate">
                        {user?.name || 'Network Architect'}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono truncate">
                        {user?.email || 'operator@driftguard.local'}
                      </div>
                      <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20">
                        {user?.role || 'Administrator'}
                      </div>
                    </div>
                  </div>

                  {/* Auto-detected Region & Timezone */}
                  <div className="space-y-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                        <GlobeHemisphereWest className="w-3.5 h-3.5 text-[#c8ff00]" />
                        <span>Region</span>
                      </span>
                      <span className="text-zinc-200 font-semibold text-[11px]">
                        {geoInfo.region}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>Timezone</span>
                      </span>
                      <span className="text-zinc-200 font-mono text-[11px]">
                        {geoInfo.formattedTimezone}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1 pt-1 border-t border-zinc-850">
                    <NavLink
                      to="/setup"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                    >
                      <GearSix className="w-4 h-4 text-zinc-400" />
                      <span>Account & Settings</span>
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <SignOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page View with Scroll */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto pb-12">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
