import React, { useState } from 'react';
import { DiffResult } from '../../types';
import { Copy, Check, ArrowsLeftRight, Rows, ListNumbers } from '@phosphor-icons/react';

interface LineByLineDiffViewerProps {
  diffResult: DiffResult;
  viewMode: 'split' | 'unified';
  command: string;
}

interface PairedLine {
  preNumber?: number;
  preContent?: string;
  postNumber?: number;
  postContent?: string;
  isDiff?: boolean;
  type: 'added' | 'deleted' | 'modified' | 'identical';
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
  const [horizontalScrollLeft, setHorizontalScrollLeft] = useState(0);
  const scrollbarRef = React.useRef<HTMLDivElement>(null);

  const handleCopyUnified = () => {
    navigator.clipboard.writeText(diffResult.unifiedDiff || diffResult.postOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build line-by-line structured arrays
  const preLines = diffResult.preOutput ? diffResult.preOutput.split('\n') : [];
  const postLines = diffResult.postOutput ? diffResult.postOutput.split('\n') : [];

  const maxLen = Math.max(preLines.length, postLines.length);

  const pairedLines: PairedLine[] = [];
  for (let i = 0; i < maxLen; i++) {
    const pre = preLines[i];
    const post = postLines[i];

    if (pre !== undefined && post !== undefined) {
      if (pre === post) {
        pairedLines.push({
          type: 'identical',
          preNumber: i + 1,
          postNumber: i + 1,
          preContent: pre,
          postContent: post,
        });
      } else {
        pairedLines.push({
          type: 'modified',
          preNumber: i + 1,
          postNumber: i + 1,
          preContent: pre,
          postContent: post,
        });
      }
    } else if (pre !== undefined && post === undefined) {
      pairedLines.push({
        type: 'deleted',
        preNumber: i + 1,
        preContent: pre,
      });
    } else if (pre === undefined && post !== undefined) {
      pairedLines.push({
        type: 'added',
        postNumber: i + 1,
        postContent: post,
      });
    }
  }

  // Measure container width to dynamically calibrate column code overflow and synchronized scroll distance
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate maximum line length and dynamic scroll overflow
  const { maxCodeWidth, maxScrollDistance, dummyWidth } = React.useMemo(() => {
    let maxChars = 40;
    pairedLines.forEach((line) => {
      if (line.preContent && line.preContent.length > maxChars) maxChars = line.preContent.length;
      if (line.postContent && line.postContent.length > maxChars) maxChars = line.postContent.length;
    });

    // Approximate rendered width per character in font-mono text-sm (~8.5px) + inner padding
    const calculatedCodeWidth = Math.round(maxChars * 8.6 + 60);

    // Visible code viewport width in each split column (~50% width minus line-number gutter of ~76px)
    const codeColumnViewportWidth = Math.max(100, Math.floor(containerWidth / 2) - 76);

    // Maximum scrollable overflow distance for the code within each column
    const scrollDistance = Math.max(0, calculatedCodeWidth - codeColumnViewportWidth);

    // Scrollbar dummy inner width needed so scrollLeft reaches scrollDistance:
    // (scrollWidth - clientWidth = dummyWidth - containerWidth = scrollDistance)
    const innerDummyWidth = containerWidth + scrollDistance;

    return {
      maxCodeWidth: calculatedCodeWidth,
      maxScrollDistance: scrollDistance,
      dummyWidth: innerDummyWidth,
    };
  }, [pairedLines, containerWidth]);

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && scrollbarRef.current && maxScrollDistance > 0) {
      const nextScroll = Math.max(0, Math.min(maxScrollDistance, scrollbarRef.current.scrollLeft + e.deltaX));
      scrollbarRef.current.scrollLeft = nextScroll;
      setHorizontalScrollLeft(nextScroll);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200">Diff Target:</span>
          <span className="text-sky-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            {command}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">
            Lines: {pairedLines.length} • Total Additions:{' '}
            <span className="text-[#c8ff00] font-bold">+{diffResult.additions}</span> • Deletions:{' '}
            <span className="text-rose-400 font-bold">-{diffResult.deletions}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyUnified}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700/60 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#c8ff00]" />
                <span className="text-[#c8ff00] font-medium">Copied!</span>
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
        /* Side-by-Side Line-by-Line Table with Single Synchronized Horizontal Scrollbar */
        <div ref={containerRef} className="flex flex-col bg-zinc-950/60">
          <div
            onWheel={handleWheel}
            className="overflow-y-auto max-h-[600px] divide-y divide-zinc-800/40 font-mono text-sm select-text"
          >
            <div className="grid grid-cols-2 divide-x divide-zinc-800 bg-zinc-900/90 text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2 px-4 sticky top-0 z-10 backdrop-blur-md border-b border-zinc-800">
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
                  ? highlightLineDifferences(line.preContent!, line.postContent!)
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
                  <div className={`flex items-start py-1 px-2.5 overflow-hidden ${preRowBg}`}>
                    <span className="w-10 text-right pr-3 select-none text-zinc-500 shrink-0 font-mono text-xs">
                      {line.preNumber ?? ''}
                    </span>
                    <span className="w-4 text-center select-none shrink-0 font-bold">
                      {line.type === 'deleted' || line.type === 'modified' ? '-' : ' '}
                    </span>
                    <div className="flex-1 overflow-hidden font-mono text-sm leading-relaxed">
                      <div
                        style={{ transform: `translateX(-${horizontalScrollLeft}px)` }}
                        className="whitespace-pre transition-none"
                      >
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
                  </div>

                  {/* Post Column */}
                  <div className={`flex items-start py-1 px-2.5 pl-3.5 overflow-hidden ${postRowBg}`}>
                    <span className="w-10 text-right pr-3 select-none text-zinc-500 shrink-0 font-mono text-xs">
                      {line.postNumber ?? ''}
                    </span>
                    <span className="w-4 text-center select-none shrink-0 font-bold">
                      {line.type === 'added' || line.type === 'modified' ? '+' : ' '}
                    </span>
                    <div className="flex-1 overflow-hidden font-mono text-sm leading-relaxed">
                      <div
                        style={{ transform: `translateX(-${horizontalScrollLeft}px)` }}
                        className="whitespace-pre transition-none"
                      >
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
                </div>
              );
            })}
          </div>

          {/* Unified Single Synchronized Horizontal Scrollbar for both Pre & Post panels */}
          <div
            ref={scrollbarRef}
            onScroll={(e) => setHorizontalScrollLeft(e.currentTarget.scrollLeft)}
            className={`overflow-x-auto bg-zinc-950 border-t border-zinc-800/80 px-2 py-2 shrink-0 ${
              maxScrollDistance > 0 ? 'block' : 'hidden'
            } [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-zinc-900/90 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 hover:[&::-webkit-scrollbar-thumb]:bg-[#c8ff00] [&::-webkit-scrollbar-thumb]:rounded-full`}
          >
            <div style={{ width: `${dummyWidth}px` }} className="h-1" />
          </div>

          {maxScrollDistance > 0 && (
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-3 py-1 bg-zinc-900/60 border-t border-zinc-800/60 select-none">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ArrowsLeftRight className="w-3.5 h-3.5 text-[#c8ff00]" />
                <span>Pan diff horizontally (pre &amp; post synced)</span>
              </span>
              <span className="text-zinc-400">
                {Math.round((horizontalScrollLeft / Math.max(1, maxScrollDistance)) * 100)}%
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Unified Line-by-Line Stream */
        <div className="overflow-x-auto max-h-[600px] divide-y divide-zinc-800/30 font-mono text-sm select-text [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-zinc-900/90 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 hover:[&::-webkit-scrollbar-thumb]:bg-[#c8ff00] [&::-webkit-scrollbar-thumb]:rounded-full">
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
