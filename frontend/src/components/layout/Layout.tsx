import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  SquaresFour,
  SlidersHorizontal,
  Camera,
  GitDiff,
  SignOut,
  CaretDown,
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 lg:px-8 shrink-0 z-20">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-8">
          <NavLink to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <BrandLogo variant="full" showTagline={true} size={24} />
          </NavLink>

          <nav className="flex items-center gap-1.5">
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
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#c8ff00] text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                    weight={isActive ? 'fill' : 'regular'}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right: Operator Profile Trigger (Only User Name with Downward Caret) */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900/60 transition-colors cursor-pointer group focus:outline-none"
            title="Operator Profile"
          >
            <span className="group-hover:text-[#c8ff00] transition-colors">
              {user?.name || 'Network Engineer'}
            </span>
            <CaretDown
              className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-[#c8ff00] transition-transform duration-200 ${
                isProfileOpen ? 'rotate-180 text-[#c8ff00]' : ''
              }`}
              weight="bold"
            />
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
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2">
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <GlobeHemisphereWest className="w-4 h-4 text-[#c8ff00] shrink-0" />
                    <span>Region</span>
                  </span>
                  <span className="text-zinc-200 font-semibold text-right truncate">
                    {geoInfo.region}
                  </span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Timezone</span>
                  </span>
                  <span className="text-zinc-200 font-mono font-medium text-right truncate">
                    {geoInfo.formattedTimezone}
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1 pt-1 border-t border-zinc-850">
                <NavLink
                  to="/setup?tab=settings&section=account"
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
      </header>

      {/* Dynamic Page View with Scroll */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
        <div className="max-w-7xl mx-auto pb-12 w-full">
          <Outlet />
          <CopyrightFooter variant="full" />
        </div>
      </main>

      <ToastContainer />
    </div>
  );
};
