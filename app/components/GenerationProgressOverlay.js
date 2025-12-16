'use client';

import { createPortal } from 'react-dom';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, FileStack, Image } from 'lucide-react';

/**
 * Full-screen overlay showing comic generation progress
 */
export default function GenerationProgressOverlay({ 
  isVisible, 
  progress,
  onCancel 
}) {
  if (!isVisible || !progress) return null;

  const { stage, message, currentPage, totalPages, currentPanel, totalPanels, percent } = progress;
  
  const isComplete = stage === 'complete';
  const isError = stage === 'error';
  const isGenerating = stage === 'generating';
  const isPlanning = stage === 'planning';

  // Use provided percent or calculate from progress
  const overallProgress = percent ?? (totalPages > 0 
    ? ((currentPage - 1) / totalPages) * 100 + 
      (currentPanel && totalPanels ? (currentPanel / totalPanels / totalPages) * 100 : 0)
    : 0);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80 backdrop-blur-lg" />
      
      {/* Content */}
      <div className="relative bg-[var(--paper-white)] rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-scale-in overflow-hidden">
        {/* Decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
        
        {/* Icon */}
        <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/80 ${
          isComplete ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
          isError ? 'bg-gradient-to-br from-red-400 to-rose-500' :
          'bg-gradient-to-br from-amber-400 to-orange-500'
        }`}>
          {isComplete ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : isError ? (
            <AlertCircle className="w-10 h-10 text-white" />
          ) : isGenerating ? (
            <Image className="w-10 h-10 text-white animate-pulse" />
          ) : (
            <FileStack className="w-10 h-10 text-white animate-pulse" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {isComplete ? '¡Comic Generated!' :
           isError ? 'Generation Failed' :
           isGenerating ? 'Generating Images...' :
           'Creating Your Comic...'}
        </h2>

        {/* Message */}
        <p className="text-[var(--ink-500)] mb-6">
          {message}
        </p>

        {/* Progress indicators */}
        {!isComplete && !isError && (
          <div className="space-y-4">
            {/* Overall progress bar */}
            <div className="w-full bg-[var(--ink-100)] rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>

            {/* Page/Panel info */}
            <div className="flex items-center justify-center gap-4 text-sm">
              {totalPages > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--ink-50)] rounded-lg">
                  <FileStack className="w-4 h-4 text-orange-500" />
                  <span className="text-[var(--ink-600)]">
                    Page <span className="font-bold text-[var(--ink-800)]">{currentPage}</span> of {totalPages}
                  </span>
                </div>
              )}
              {isGenerating && totalPanels > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--ink-50)] rounded-lg">
                  <Image className="w-4 h-4 text-purple-500" />
                  <span className="text-[var(--ink-600)]">
                    Panel <span className="font-bold text-[var(--ink-800)]">{currentPanel}</span> of {totalPanels}
                  </span>
                </div>
              )}
            </div>

            {/* Animated loading indicator */}
            <div className="flex items-center justify-center gap-2 text-[var(--ink-400)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">This may take a few minutes...</span>
            </div>
          </div>
        )}

        {/* Success stats */}
        {isComplete && progress.stats && (
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="px-4 py-2 bg-green-50 rounded-xl border border-green-200">
              <span className="text-2xl font-bold text-green-600">{progress.stats.pages}</span>
              <span className="text-xs text-green-500 block">Pages</span>
            </div>
            <div className="px-4 py-2 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-2xl font-bold text-purple-600">{progress.stats.images}</span>
              <span className="text-xs text-purple-500 block">Images</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {(isComplete || isError) && (
          <button
            onClick={onCancel}
            className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {isComplete ? 'View Comic' : 'Close'}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
