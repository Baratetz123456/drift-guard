import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/common/Button';
import { AuthVisualShowcase } from '../../components/auth/AuthVisualShowcase';
import {
  Lock,
  EnvelopeSimple,
  SignIn,
  Lightning,
  Eye,
  EyeSlash,
  ShieldCheck,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { BrandLogo } from '../../components/common/BrandLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Sign In — DriftGuard',
    description: 'Operator authentication for DriftGuard enterprise Cisco network change verification platform.',
    canonicalPath: '/login',
    robots: 'index, follow',
  });

  const { login } = useAppStore();
  const [email, setEmail] = useState('operator@driftguard.local');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await login('network-architect@enterprise.net', 'demo-password');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-slate-950 font-sans overflow-x-hidden">
      {/* Left Column: Ambient DotLottie Showcase & Pillars */}
      <AuthVisualShowcase />

      {/* Right Column: Seamless Non-Card Authentication Form */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header (No Card) */}
          <div className="space-y-2">
            {/* Mobile-only logo */}
            <div className="flex lg:hidden items-center mb-4">
              <BrandLogo variant="full" showTagline={true} size={28} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Operator sign in
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Enter your corporate credentials to access the DriftGuard console.
            </p>
          </div>

          {/* Form directly on canvas — zero card wrapping */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Corporate email or Cognito ID
              </label>
              <div className="relative">
                <EnvelopeSimple className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#c8ff00]/40 focus:border-[#c8ff00]/60 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs text-[#c8ff00] hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#c8ff00]/40 focus:border-[#c8ff00]/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                leftIcon={<SignIn className="w-4 h-4" weight="bold" />}
                className="w-full py-2.5 text-sm font-bold shadow-md shadow-[#c8ff00]/10"
              >
                Sign in
              </Button>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <Lightning className="w-4 h-4 text-[#c8ff00]" weight="fill" />
                <span>Demo login</span>
              </button>
            </div>
          </form>

          {/* Footer Link to Register & Legal Pages */}
          <div className="pt-4 border-t border-zinc-900 space-y-2 text-center text-xs text-zinc-400">
            <div>
              <span>Don't have an operator account? </span>
              <Link to="/register" className="text-[#c8ff00] font-bold hover:underline">
                Register
              </Link>
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-400">
              <Link to="/terms" className="hover:text-zinc-200 transition-colors">
                Terms of service
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-zinc-200 transition-colors">
                Privacy policy
              </Link>
            </div>
          </div>

          {/* Micro Security Notice */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Encrypted SSH credentials with AWS KMS envelope protection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
