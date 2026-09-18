import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowsClockwise, ShieldCheck } from '@phosphor-icons/react';

interface CaptchaVerificationProps {
  userInput: string;
  onUserInputChange: (value: string) => void;
  onCodeChange: (code: string) => void;
  hasError?: boolean;
  errorMessage?: string | null;
}

// Avoid ambiguous characters: 0, O, 1, I, l
const CHAR_SET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const CaptchaVerification: React.FC<CaptchaVerificationProps> = ({
  userInput,
  onUserInputChange,
  onCodeChange,
  hasError = false,
  errorMessage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const generateRandomCode = useCallback((length = 6): string => {
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * CHAR_SET.length);
      result += CHAR_SET[randomIndex];
    }
    return result;
  }, []);

  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear & dark obsidian background
    ctx.fillStyle = '#09090b'; // zinc-950
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle grid / background dots
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(200, 255, 0, 0.15)' : 'rgba(161, 161, 170, 0.12)';
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 1.8 + 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 3. Interference curves/lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(200, 255, 0, 0.35)' : 'rgba(113, 113, 122, 0.35)';
      ctx.lineWidth = Math.random() * 1.5 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * (width / 4), Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        width - Math.random() * (width / 4),
        Math.random() * height
      );
      ctx.stroke();
    }

    // 4. Render distorted characters
    const charSpacing = width / (code.length + 1);
    ctx.textBaseline = 'middle';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const x = charSpacing * (i + 0.85);
      const y = height / 2 + (Math.random() * 8 - 4);
      const angle = (Math.random() * 40 - 20) * (Math.PI / 180);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Varied font weight & color per letter
      const isVoltage = i % 2 === 0;
      ctx.font = `bold ${Math.floor(Math.random() * 4 + 22)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = isVoltage ? '#c8ff00' : '#e4e4e7';
      ctx.shadowColor = isVoltage ? 'rgba(200, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.2)';
      ctx.shadowBlur = 4;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    // 5. Additional light cross-hair strike line
    ctx.strokeStyle = 'rgba(200, 255, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, height / 2 + (Math.random() * 6 - 3));
    ctx.lineTo(width - 10, height / 2 + (Math.random() * 6 - 3));
    ctx.stroke();
  }, []);

  const refreshCaptcha = useCallback(() => {
    setIsRefreshing(true);
    const newCode = generateRandomCode();
    setCurrentCode(newCode);
    onCodeChange(newCode);
    drawCaptcha(newCode);
    setTimeout(() => setIsRefreshing(false), 200);
  }, [drawCaptcha, generateRandomCode, onCodeChange]);

  // Initial generation
  useEffect(() => {
    refreshCaptcha();
  }, []);

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#c8ff00]" weight="bold" />
          <span>Operator Verification (CAPTCHA)</span>
        </span>
        <span className="text-[11px] font-normal text-zinc-500">Case-insensitive</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Canvas Image Container */}
        <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-inner flex items-center justify-center shrink-0">
          <canvas
            ref={canvasRef}
            width={170}
            height={46}
            className="rounded-lg block cursor-pointer select-none"
            onClick={refreshCaptcha}
            title="Click to reload CAPTCHA code"
          />
        </div>

        {/* Reload button */}
        <button
          type="button"
          onClick={refreshCaptcha}
          className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
          title="Generate new CAPTCHA code"
          aria-label="Generate new verification code"
        >
          <ArrowsClockwise
            className={`w-4 h-4 text-zinc-300 ${isRefreshing ? 'animate-spin' : ''}`}
            weight="bold"
          />
        </button>

        {/* User text input */}
        <div className="flex-1">
          <input
            type="text"
            required
            maxLength={6}
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tracking-widest uppercase transition-all outline-none bg-zinc-900 border ${
              hasError
                ? 'border-rose-500 text-rose-300 focus:border-rose-400'
                : 'border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-[#c8ff00] focus:ring-1 focus:ring-[#c8ff00]/30'
            }`}
          />
        </div>
      </div>

      {errorMessage && (
        <p className="text-xs text-rose-400 font-medium pt-0.5">{errorMessage}</p>
      )}
    </div>
  );
};
