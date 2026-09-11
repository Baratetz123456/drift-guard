import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  SquaresFour,
  SlidersHorizontal,
  Camera,
  GitDiff,
  SignOut,
  UserCircle,
  CaretRight,
} from '@phosphor-icons/react';
import { BrandLogo } from '../common/BrandLogo';
import { ToastContainer } from '../common/ToastContainer';
import { useAppStore } from '../../store/useAppStore';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { devices, snapshots, comparisons, user, logout } = useAppStore();

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

        {/* User Session & Status Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#c8ff00]" />
              AWS us-east-1
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Step Functions</span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserCircle className="w-7 h-7 text-zinc-400 shrink-0" weight="duotone" />
              <div className="overflow-hidden">
                <div className="font-semibold text-xs text-zinc-200 truncate">
                  {user?.name || 'Network Architect'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'operator@driftguard.local'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <SignOut className="w-4 h-4" />
            </button>
          </div>
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
