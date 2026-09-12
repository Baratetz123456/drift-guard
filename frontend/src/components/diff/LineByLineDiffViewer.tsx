import React, { useState } from 'react';
import { DiffResult, DiffLine } from '../../types';
import { Copy, Check, ArrowsLeftRight, Rows, ListNumbers } from '@phosphor-icons/react';

interface LineByLineDiffViewerProps {
  diffResult: DiffResult;
  viewMode: 'split' | 'unified';
  command: string;
}

// Computes word/token diff highlights between two strings
function highlightLineDifferences(oldStr: string, newStr: string) {
  const oldTokens = oldStr.split(/(\s+)/);
  const newTokens = newStr.split(/(\s+)/);

  return {
    oldTokens: oldTokens.map((tok, i) => ({
      text: tok,
      isDiff: !newTokens.includes(tok) && tok.trim().length > 0,
    })),
    newTokens: newTokens.map((tok, i) => ({
      text: tok,
      isDiff: !oldTokens.includes(tok) && tok.trim().length > 0,
    })),
  };
}

export const LineByLineDiffViewer: React.FC<LineByLineDiffViewerProps> = ({
  diffResult,
  viewMode,
  command,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUnified = () => {
    navigator.clipboard.writeText(diffResult.unifiedDiff || diffResult.postOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build line-by-line structured arrays
  const preLines = diffResult.preOutput ? diffResult.preOutput.split('\n') : [];
  const postLines = diffResult.postOutput ? diffResult.postOutput.split('\n') : [];

  const maxLen = Math.max(preLines.length, postLines.length);
  const pairedLines: {
    preNumber?: number;
    preContent: string;
    postNumber?: number;
    postContent: string;
    isDiff: boolean;
    type: 'added' | 'deleted' | 'modified' | 'identical';
  }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const pre = preLines[i];
    const post = postLines[i];

    if (pre === post) {
      pairedLines.push({
        preNumber: i + 1,
        preContent: pre || '',
        postNumber: i + 1,
        postContent: post || '',
        isDiff: false,
        type: 'identical',
      });
    } else if (pre !== undefined && post !== undefined) {
      pairedLines.push({
        preNumber: i + 1,
        preContent: pre,
        postNumber: i + 1,
        postContent: post,
        isDiff: true,
        type: 'modified',
      });
    } else if (pre !== undefined) {
      pairedLines.push({
        preNumber: i + 1,
        preContent: pre,
        postContent: '',
        isDiff: true,
        type: 'deleted',
      });
    } else {
      pairedLines.push({
        preContent: '',
        postNumber: i + 1,
        postContent: post,
        isDiff: true,
        type: 'added',
      });
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-zinc-200 bg-zinc-800/80 px-2.5 py-1 rounded border border-zinc-700">
            # {command}
          </span>
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-[#c8ff00] font-semibold">+{diffResult.additions}</span>
            <span className="text-red-400 font-semibold">-{diffResult.deletions}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyUnified}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            title="Copy diff to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#c8ff00]" weight="bold" />
                <span className="text-[#c8ff00] font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="font-medium">Copy Diff</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diff Table View */}
      {viewMode === 'split' ? (
        /* Side-by-Side Line-by-Line Table */
        <div className="overflow-x-auto max-h-[600px] divide-y divide-zinc-800/40 font-mono text-sm select-text">
          <div className="grid grid-cols-2 divide-x divide-zinc-800 bg-zinc-900/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 px-4 sticky top-0 z-10 backdrop-blur-md border-b border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span>PRE-CHANGE (BASELINE)</span>
            </div>
            <div className="flex items-center gap-2 pl-4 text-[#c8ff00] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#c8ff00]" />
              <span>POST-CHANGE (VERIFIED)</span>
            </div>
          </div>

          {pairedLines.map((line, idx) => {
            const { oldTokens, newTokens } =
              line.type === 'modified'
                ? highlightLineDifferences(line.preContent, line.postContent)
                : { oldTokens: [], newTokens: [] };

            const preRowBg =
              line.type === 'deleted'
                ? 'bg-rose-950/30 text-rose-200'
                : line.type === 'modified'
                ? 'bg-rose-950/20 text-rose-200'
                : 'text-zinc-300';

            const postRowBg =
              line.type === 'added'
                ? 'bg-[#c8ff00]/10 text-[#c8ff00]'
                : line.type === 'modified'
                ? 'bg-[#c8ff00]/5 text-[#c8ff00]'
                : 'text-zinc-300';

            return (
              <div key={idx} className="grid grid-cols-2 divide-x divide-zinc-800/60 hover:bg-zinc-900/40">
                {/* Pre Column */}
                <div className={`flex items-start py-1 px-2.5 ${preRowBg}`}>
                  <span className="w-10 text-right pr-3 select-none text-zinc-500 shrink-0 font-mono text-xs">
                    {line.preNumber ?? ''}
                  </span>
                  <span className="w-4 text-center select-none shrink-0 font-bold">
                    {line.type === 'deleted' || line.type === 'modified' ? '-' : ' '}
                  </span>
                  <div className="whitespace-pre overflow-x-auto leading-relaxed font-mono text-sm">
                    {line.type === 'modified' ? (
                      oldTokens.map((tok, tIdx) => (
                        <span
                          key={tIdx}
                          className={tok.isDiff ? 'bg-rose-500/30 text-rose-100 rounded px-0.5 font-bold' : ''}
                        >
                          {tok.text}
                        </span>
                      ))
                    ) : (
                      line.preContent || ' '
                    )}
                  </div>
                </div>

                {/* Post Column */}
                <div className={`flex items-start py-1 px-2.5 pl-3.5 ${postRowBg}`}>
                  <span className="w-10 text-right pr-3 select-none text-zinc-500 shrink-0 font-mono text-xs">
                    {line.postNumber ?? ''}
                  </span>
                  <span className="w-4 text-center select-none shrink-0 font-bold">
                    {line.type === 'added' || line.type === 'modified' ? '+' : ' '}
                  </span>
                  <div className="whitespace-pre overflow-x-auto leading-relaxed font-mono text-sm">
                    {line.type === 'modified' ? (
                      newTokens.map((tok, tIdx) => (
                        <span
                          key={tIdx}
                          className={tok.isDiff ? 'bg-[#c8ff00]/25 text-white rounded px-0.5 font-bold' : ''}
                        >
                          {tok.text}
                        </span>
                      ))
                    ) : (
                      line.postContent || ' '
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Unified Line-by-Line Stream */
        <div className="overflow-x-auto max-h-[600px] divide-y divide-zinc-800/30 font-mono text-sm select-text">
          {pairedLines.map((line, idx) => {
            if (line.type === 'identical') {
              return (
                <div key={idx} className="flex items-start py-1 px-3.5 text-zinc-400 hover:bg-zinc-900/30">
                  <span className="w-10 text-right pr-2 select-none text-zinc-500 text-xs">
                    {line.preNumber}
                  </span>
                  <span className="w-10 text-right pr-3 select-none text-zinc-500 text-xs">
                    {line.postNumber}
                  </span>
                  <span className="w-4 select-none text-zinc-600"> </span>
                  <span className="whitespace-pre leading-relaxed text-sm text-zinc-200">{line.preContent}</span>
                </div>
              );
            }

            if (line.type === 'deleted' || line.type === 'modified') {
              return (
                <React.Fragment key={idx}>
                  <div className="flex items-start py-1 px-3.5 bg-rose-950/30 text-rose-200">
                    <span className="w-10 text-right pr-2 select-none text-rose-400/80 text-xs">
                      {line.preNumber}
                    </span>
                    <span className="w-10 text-right pr-3 select-none text-zinc-700 text-xs">-</span>
                    <span className="w-4 select-none font-bold text-rose-400">-</span>
                    <span className="whitespace-pre leading-relaxed text-sm text-rose-100 font-semibold">
                      {line.preContent}
                    </span>
                  </div>
                  {line.type === 'modified' && (
                    <div className="flex items-start py-1 px-3.5 bg-[#c8ff00]/10 text-[#c8ff00]">
                      <span className="w-10 text-right pr-2 select-none text-zinc-700 text-xs">-</span>
                      <span className="w-10 text-right pr-3 select-none text-[#c8ff00]/80 text-xs">
                        {line.postNumber}
                      </span>
                      <span className="w-4 select-none font-bold text-[#c8ff00]">+</span>
                      <span className="whitespace-pre leading-relaxed text-sm text-slate-100 font-semibold">
                        {line.postContent}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            }

            return (
              <div key={idx} className="flex items-start py-1 px-3.5 bg-[#c8ff00]/10 text-[#c8ff00]">
                <span className="w-10 text-right pr-2 select-none text-zinc-700 text-xs">-</span>
                <span className="w-10 text-right pr-3 select-none text-[#c8ff00]/80 text-xs">
                  {line.postNumber}
                </span>
                <span className="w-4 select-none font-bold text-[#c8ff00]">+</span>
                <span className="whitespace-pre leading-relaxed text-sm text-slate-100 font-semibold">
                  {line.postContent}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
