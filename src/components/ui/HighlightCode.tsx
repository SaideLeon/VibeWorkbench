'use client';

import React, { useMemo, useState } from 'react';
import hljs from 'highlight.js';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HighlightCodeProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
  maxHeight?: string;
  variant?: 'vulnerable' | 'secure' | 'neutral';
  highlightLines?: number[];
}

export const HighlightCode: React.FC<HighlightCodeProps> = ({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = true,
  className,
  maxHeight,
  variant = 'neutral',
  highlightLines = [],
}) => {
  const [copied, setCopied] = useState(false);

  // Normalize language for highlight.js
  const normalizedLanguage = useMemo(() => {
    const lang = (language || '').toLowerCase().trim();
    if (lang === 'ts' || lang === 'tsx') return 'typescript';
    if (lang === 'js' || lang === 'jsx') return 'javascript';
    if (lang === 'py') return 'python';
    if (lang === 'sh' || lang === 'shell') return 'bash';
    if (lang === 'yml') return 'yaml';
    return lang || 'typescript';
  }, [language]);

  // Generate highlighted HTML using highlight.js
  const highlightedLines = useMemo(() => {
    if (!code) return [];

    let highlightedHtml = '';
    try {
      if (hljs.getLanguage(normalizedLanguage)) {
        highlightedHtml = hljs.highlight(code, {
          language: normalizedLanguage,
          ignoreIllegals: true,
        }).value;
      } else {
        highlightedHtml = hljs.highlightAuto(code).value;
      }
    } catch {
      // Fallback to escaped raw code
      highlightedHtml = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // Split into individual lines to allow line numbering and row-specific styling
    return highlightedHtml.split('\n');
  }, [code, normalizedLanguage]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border font-mono text-xs shadow-2xl transition-all',
        variant === 'vulnerable'
          ? 'border-red-500/30 bg-[#09090d]'
          : variant === 'secure'
          ? 'border-emerald-500/30 bg-[#09090d]'
          : 'border-white/10 bg-[#0b0b0e]',
        className
      )}
    >
      {/* Top Bar / Header */}
      {filename && (
        <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/10 text-[11px] text-gray-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block shrink-0" />
            <span className="font-mono text-gray-300 truncate">{filename}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {variant === 'vulnerable' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                🔴 PADRÃO VULNERÁVEL
              </span>
            )}
            {variant === 'secure' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                🟢 BLINDAGEM MITIGAR IA
              </span>
            )}
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
              {normalizedLanguage}
            </span>

            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              title="Copiar código"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Code Body */}
      <div
        className="overflow-x-auto p-4 leading-relaxed font-mono"
        style={{ maxHeight: maxHeight || 'none' }}
      >
        <pre className="text-gray-200 hljs !bg-transparent !p-0">
          <code className="grid">
            {highlightedLines.map((lineHtml, idx) => {
              const lineNum = idx + 1;
              const isMarked = highlightLines.includes(lineNum);
              const rawLine = code.split('\n')[idx] || '';

              // Special highlight for comments with error / check
              const isErrorLine = rawLine.includes('❌') || rawLine.includes('🔴');
              const isSuccessLine = rawLine.includes('✅') || rawLine.includes('🟢') || rawLine.includes('🛡️');

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start -mx-4 px-4 py-[1px] transition-colors',
                    isErrorLine && 'bg-red-500/10 text-red-200',
                    isSuccessLine && 'bg-emerald-500/10 text-emerald-200',
                    isMarked && 'bg-indigo-500/15 border-l-2 border-indigo-400'
                  )}
                >
                  {showLineNumbers && (
                    <span className="select-none pr-4 text-[11px] text-gray-600 text-right w-8 shrink-0 font-mono">
                      {lineNum}
                    </span>
                  )}
                  <span
                    className="flex-1 whitespace-pre break-normal"
                    dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                  />
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
};
