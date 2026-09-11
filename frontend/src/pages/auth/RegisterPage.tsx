import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/common/Button';
import { AuthVisualShowcase } from '../../components/auth/AuthVisualShowcase';
import {
  User,
  EnvelopeSimple,
  Lock,
  UserPlus,
  Eye,
  EyeSlash,
  ShieldCheck,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { BrandLogo } from '../../components/common/BrandLogo';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Register Operator — DriftGuard',
    description: 'Register an enterprise operator account for DriftGuard network change verification.',
    canonicalPath: '/register',
    robots: 'index, follow',
  });

  const { register } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !agreedToTerms) return;
    setIsLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-slate-950 font-sans overflow-x-hidden">
      {/* Left Column: Ambient DotLottie Showcase & Pillars */}
      <AuthVisualShowcase />

      {/* Right Column: Seamless Non-Card Registration Form */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header (No Card) */}
          <div className="space-y-2">
            {/* Mobile-only logo */}
            <div className="flex lg:hidden items-center mb-4">
              <BrandLogo variant="full" showTagline={true} size={28} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Create operator account
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Join the DriftGuard platform to manage automated Cisco snapshot suites.
            </p>
          </div>

          {/* Form directly on canvas — zero card wrapping */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Full name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#c8ff00]/40 focus:border-[#c8ff00]/60 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Corporate email
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
              <label className="block text-xs font-semibold text-zinc-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters..."
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

            {/* Terms and Privacy Policy Checkbox Agreement */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms-agreement"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-[#c8ff00] focus:ring-[#c8ff00]/40 focus:ring-offset-0 cursor-pointer accent-[#c8ff00]"
              />
              <label
                htmlFor="terms-agreement"
                className="text-xs text-zinc-400 leading-normal select-none cursor-pointer"
              >
                I agree to the{' '}
                <Link
                  to="/terms"
                  className="text-zinc-200 hover:text-[#c8ff00] underline font-semibold transition-colors"
                >
                  Terms of service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  className="text-zinc-200 hover:text-[#c8ff00] underline font-semibold transition-colors"
                >
                  Privacy policy
                </Link>
                .
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={!agreedToTerms || isLoading}
                leftIcon={<UserPlus className="w-4 h-4" weight="bold" />}
                className={`w-full py-2.5 text-sm font-bold shadow-md ${
                  !agreedToTerms
                    ? 'opacity-50 cursor-not-allowed'
                    : 'shadow-[#c8ff00]/10'
                }`}
              >
                Create account
              </Button>
            </div>
          </form>

          {/* Footer Link to Login & Legal Links */}
          <div className="pt-4 border-t border-zinc-900 space-y-2 text-center text-xs text-zinc-400">
            <div>
              <span>Already registered? </span>
              <Link to="/login" className="text-[#c8ff00] font-bold hover:underline">
                Sign in
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
          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Encrypted SSH credentials with AWS KMS envelope protection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
