import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/common/Button';
import { CaptchaVerification } from '../../components/auth/CaptchaVerification';
import { AuthVisualShowcase } from '../../components/auth/AuthVisualShowcase';
import {
  Lock,
  EnvelopeSimple,
  SignIn,
  Eye,
  EyeSlash,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { BrandLogo } from '../../components/common/BrandLogo';
import { CopyrightFooter } from '../../components/common/CopyrightFooter';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Sign In — DriftGuard',
    description: 'Operator authentication for DriftGuard enterprise Cisco network change verification platform.',
    canonicalPath: '/login',
    robots: 'index, follow',
  });

  const { login, isAuthenticated, addToast } = useAppStore();
  const [email, setEmail] = useState('operator@driftguard.local');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bot Defense States & On-Demand Reveal
  const mountTimeRef = useRef<number>(Date.now());
  const [honeypotValue, setHoneypotValue] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [expectedCaptcha, setExpectedCaptcha] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Helper to check session-authenticated operator identity
  const isOperatorKnownInSession = (targetEmail: string): boolean => {
    try {
      const raw = sessionStorage.getItem('driftguard_session_operators');
      const known: string[] = raw ? JSON.parse(raw) : [];
      return known.includes(targetEmail.trim().toLowerCase());
    } catch {
      return false;
    }
  };

  const recordOperatorInSession = (targetEmail: string) => {
    try {
      const clean = targetEmail.trim().toLowerCase();
      const raw = sessionStorage.getItem('driftguard_session_operators');
      const known: string[] = raw ? JSON.parse(raw) : [];
      if (!known.includes(clean)) {
        known.push(clean);
        sessionStorage.setItem('driftguard_session_operators', JSON.stringify(known));
      }
    } catch {}
  };

  // Lockout countdown timer
  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCaptchaError(null);

    if (lockoutSeconds > 0) {
      setErrorMessage(`Account locked due to consecutive failed attempts. Wait ${lockoutSeconds}s before retrying.`);
      return;
    }

    if (!email.trim() || !password) return;

    // 1. Honeypot check
    if (honeypotValue.trim()) {
      setErrorMessage('Automated submission rejected. Bot signature detected.');
      return;
    }

    const isKnown = isOperatorKnownInSession(email);

    // 2. On-demand CAPTCHA trigger: only require for new user in this browser session
    if (!isKnown && !showCaptcha) {
      setShowCaptcha(true);
      mountTimeRef.current = Date.now(); // Reset timing clock so operator has natural reading/typing time
      return;
    }

    // 3. CAPTCHA verification check (if active for new operator)
    if (!isKnown && showCaptcha) {
      const elapsed = Date.now() - mountTimeRef.current;
      if (elapsed < 500) {
        setErrorMessage('Submission speed indicates automated submission. Please verify credentials.');
        return;
      }

      if (!captchaInput.trim() || captchaInput.trim().toUpperCase() !== expectedCaptcha.toUpperCase()) {
        setCaptchaError('Invalid verification code. Please enter the characters shown in the image.');
        setErrorMessage('Verification failed. Please enter the correct CAPTCHA code.');
        return;
      }
    }

    setIsLoading(true);
    try {
      await login(email, password, honeypotValue, mountTimeRef.current);
      recordOperatorInSession(email);
      navigate('/');
    } catch (err: any) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= 5) {
        setLockoutSeconds(60);
        setErrorMessage('Too many failed sign-in attempts. Authentication locked for 60 seconds.');
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-slate-950 font-sans overflow-x-hidden">
      {/* Left Column: Dynamic Cisco Network Trace Showcase */}
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

          {/* Error / Lockout Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <WarningCircle className="w-4 h-4 shrink-0" weight="fill" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form directly on canvas — zero card wrapping */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot Trap Field: Invisible to legitimate human users */}
            <div style={{ display: 'none', position: 'absolute', opacity: 0, zIndex: -1 }}>
              <label htmlFor="operator_verification_code">Operator Code</label>
              <input
                id="operator_verification_code"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotValue}
                onChange={(e) => setHoneypotValue(e.target.value)}
              />
            </div>

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

            {/* Interactive Visual CAPTCHA Verification: Revealed on-demand for unverified operators */}
            {showCaptcha && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <CaptchaVerification
                  userInput={captchaInput}
                  onUserInputChange={(val) => {
                    setCaptchaInput(val);
                    if (captchaError) setCaptchaError(null);
                  }}
                  onCodeChange={(code) => {
                    setExpectedCaptcha(code);
                    setCaptchaError(null);
                  }}
                  hasError={Boolean(captchaError)}
                  errorMessage={captchaError}
                />
              </div>
            )}

            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={lockoutSeconds > 0}
                leftIcon={<SignIn className="w-4 h-4" weight="bold" />}
                className="w-full py-2.5 text-sm font-bold shadow-md shadow-[#c8ff00]/10"
              >
                {lockoutSeconds > 0 ? `Locked (${lockoutSeconds}s)` : 'Sign in'}
              </Button>
            </div>
          </form>

          {/* Footer Link to Register & Legal Pages */}
          <div className="pt-4 border-t border-zinc-900 space-y-2 text-center text-sm text-zinc-400">
            <div>
              <span>Don't have an operator account? </span>
              <Link to="/register" className="text-[#c8ff00] font-bold hover:underline">
                Register
              </Link>
            </div>
            <CopyrightFooter variant="auth" />
          </div>

          {/* Micro Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>Encrypted SSH credentials with hardware-grade envelope protection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
