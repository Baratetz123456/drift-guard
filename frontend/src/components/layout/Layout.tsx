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
import { CopyrightFooter } from '../common/CopyrightFooter';
import { ToastContainer } from '../common/ToastContainer';
import { useAppStore } from '../../store/useAppStore';
import { detectUserTimezoneAndRegion } from '../../utils/geoDetection';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAppStore();

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

  const [currentFormattedTime, setCurrentFormattedTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const month = now.toLocaleDateString(undefined, { month: 'short' });
      const day = now.getDate();
      const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      setCurrentFormattedTime(`${month} ${day} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Overview', icon: SquaresFour },
    { to: '/setup', label: 'Setup', icon: SlidersHorizontal },
    { to: '/operations', label: 'Operations', icon: Camera },
    { to: '/analysis', label: 'Analysis', icon: GitDiff },
  ];

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-slate-900/60 backdrop-blur-xl shrink-0 z-20">
        {/* Logo & Brand */}
        <div className="p-5 flex items-center justify-between">
          <BrandLogo variant="full" showTagline={true} size={26} />
          <span className="px-2 py-0.5 bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30 text-xs font-mono font-bold rounded">
            v1.2
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                  weight={isActive ? 'fill' : 'regular'}
                />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Copyright Footer */}
        <CopyrightFooter variant="sidebar" />
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-lg flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="font-semibold text-slate-200">DriftGuard Workspace</span>
            <CaretRight className="w-4 h-4 text-zinc-500" />
            <span className="text-white font-mono text-sm capitalize font-bold">
              {location.pathname === '/'
                ? 'Overview'
                : location.pathname.split('/')[1]?.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <NavLink
              to="/operations?tab=capture"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-[#c8ff00] text-zinc-950 hover:bg-[#b8ea00] transition-all cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4" weight="bold" />
              <span>Capture</span>
            </NavLink>

            <NavLink
              to="/analysis?tab=compare"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-all cursor-pointer shadow-sm"
            >
              <GitDiff className="w-4 h-4" weight="bold" />
              <span>Compare</span>
            </NavLink>

            {/* Top-Right User Profile Trigger (Borderless Name & Live Date/Time, No Avatar) */}
            <div className="relative ml-2" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="text-right transition-colors cursor-pointer group focus:outline-none py-1 px-1.5 rounded-lg hover:bg-zinc-900/50"
                title="Operator Profile & Time"
              >
                <div className="text-sm font-bold text-zinc-200 group-hover:text-[#c8ff00] transition-colors leading-tight">
                  {user?.name || 'Network Engineer'}
                </div>
                <div className="text-xs text-zinc-400 font-mono leading-tight mt-0.5 group-hover:text-zinc-300">
                  {currentFormattedTime}
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-4 space-y-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Details */}
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/80">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-zinc-100 truncate">
                        {user?.name || 'Network Engineer'}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono truncate">
                        {user?.email || 'operator@driftguard.local'}
                      </div>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20">
                        {user?.role || 'Network Engineer'}
                      </div>
                    </div>
                  </div>

                  {/* Auto-detected Region & Timezone */}
                  <div className="space-y-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <GlobeHemisphereWest className="w-4 h-4 text-[#c8ff00]" />
                        <span>Region</span>
                      </span>
                      <span className="text-zinc-200 font-semibold">
                        {geoInfo.region}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Clock className="w-4 h-4 text-sky-400" />
                        <span>Local Timezone</span>
                      </span>
                      <span className="text-zinc-200 font-mono font-medium">
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
            <CopyrightFooter variant="full" />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
