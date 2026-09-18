import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/common/Button';
import { CaptchaVerification } from '../../components/auth/CaptchaVerification';
import { AuthVisualShowcase } from '../../components/auth/AuthVisualShowcase';
import {
  User,
  EnvelopeSimple,
  Lock,
  UserPlus,
  Eye,
  EyeSlash,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { BrandLogo } from '../../components/common/BrandLogo';
import { CopyrightFooter } from '../../components/common/CopyrightFooter';
import { Checkbox } from '../../components/common/Checkbox';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Register Operator — DriftGuard',
    description: 'Register an enterprise operator account for DriftGuard network change verification.',
    canonicalPath: '/register',
    robots: 'index, follow',
  });

  const { register, isAuthenticated } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bot Defense States
  const mountTimeRef = useRef<number>(Date.now());
  const [honeypotValue, setHoneypotValue] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [expectedCaptcha, setExpectedCaptcha] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCaptchaError(null);

    // 1. Honeypot check
    if (honeypotValue.trim()) {
      setErrorMessage('Automated registration rejected. Bot signature detected.');
      return;
    }

    // 2. Time-gate check (reject < 1.2s)
    const elapsed = Date.now() - mountTimeRef.current;
    if (elapsed < 1200) {
      setErrorMessage('Submission speed indicates automated bot registration. Please verify details.');
      return;
    }

    // 3. CAPTCHA verification check
    if (!captchaInput.trim() || captchaInput.trim().toUpperCase() !== expectedCaptcha.toUpperCase()) {
      setCaptchaError('Invalid verification code. Please enter the characters shown in the image.');
      setErrorMessage('Verification failed. Please enter the correct CAPTCHA code.');
      return;
    }

    if (!email || !password || !name || !agreedToTerms) return;
    setIsLoading(true);
    try {
      await register(name, email, password, honeypotValue, mountTimeRef.current);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-slate-950 font-sans overflow-x-hidden">
      {/* Left Column: Dynamic Cisco Network Trace Showcase */}
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

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <WarningCircle className="w-4 h-4 shrink-0" weight="fill" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form directly on canvas — zero card wrapping */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot Trap Field */}
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

            {/* Interactive Visual CAPTCHA Verification */}
            <div className="pt-1">
              <CaptchaVerification
                userInput={captchaInput}
                onUserInputChange={(val) => {
                  setCaptchaInput(val);
                  if (captchaError) setCaptchaError(null);
                }}
                onCodeChange={(code) => {
                  setExpectedCaptcha(code);
                  setCaptchaInput('');
                  setCaptchaError(null);
                }}
                hasError={Boolean(captchaError)}
                errorMessage={captchaError}
              />
            </div>

            {/* Terms and Privacy Policy Checkbox Agreement */}
            <div className="pt-1">
              <Checkbox
                id="terms-agreement"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                label={
                  <span className="font-normal text-zinc-400">
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
                  </span>
                }
              />
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
          <div className="pt-4 border-t border-zinc-900 space-y-2 text-center text-sm text-zinc-400">
            <div>
              <span>Already registered? </span>
              <Link to="/login" className="text-[#c8ff00] font-bold hover:underline">
                Sign in
              </Link>
            </div>
            <CopyrightFooter variant="auth" />
          </div>

          {/* Micro Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>Encrypted SSH credentials with hardware-grade envelope protection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
