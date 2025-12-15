'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wand2, FileStack, Sparkles, Loader2, AlertCircle, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

/**
 * Dialog for generating a full comic from a story description
 */
export function GenerateComicDialog({ 
  isOpen, 
  onClose, 
  onGenerate, 
  currentPageCount = 1,
  projectSettings = {},
  isGenerating = false 
}) {
  const [pageCount, setPageCount] = useState(Math.min(currentPageCount || 3, 5));
  const [storyDescription, setStoryDescription] = useState('');
  const [keepLayouts, setKeepLayouts] = useState(false);

  if (!isOpen) return null;

  const hasCharacters = projectSettings?.characters?.length > 0;
  const hasStyle = projectSettings?.artStyle?.id !== 'custom' || projectSettings?.artStyle?.customPrompt;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!storyDescription.trim()) return;
    
    onGenerate({
      pageCount,
      storyDescription: storyDescription.trim(),
      keepLayouts,
    });
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md" />
      
      {/* Dialog */}
      <div 
        className="relative bg-[var(--paper-white)] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--ink-100)] relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/80 bg-gradient-to-br from-amber-400 to-orange-500">
                <FileStack className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                  Generate Full Comic
                </h2>
                <p className="text-sm text-[var(--ink-400)]">Create multiple pages from your story</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--ink-100)] rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Project Settings Status */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--ink-50)] border border-[var(--ink-100)]">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-[var(--ink-500)]">
              Using your project's AI settings
            </span>
            <div className="flex-1" />
            {hasCharacters && (
              <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Characters
              </span>
            )}
            {hasStyle && (
              <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Style
              </span>
            )}
          </div>

          {/* Number of Pages */}
          <div>
            <label className="text-sm font-semibold text-[var(--ink-700)] mb-2 block">
              Number of Pages
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPageCount(num)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-center transition-all font-bold ${
                    pageCount === num
                      ? 'border-orange-400 bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                      : 'border-[var(--ink-100)] bg-white text-[var(--ink-600)] hover:border-[var(--ink-300)] hover:shadow-sm'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-400)] mt-2">
              Each page will be generated with AI-created panels
            </p>
          </div>

          {/* Story Description */}
          <div>
            <label className="text-sm font-semibold text-[var(--ink-700)] mb-2 block">
              Story Description
            </label>
            <textarea
              value={storyDescription}
              onChange={(e) => setStoryDescription(e.target.value)}
              placeholder="Describe your story... What happens? Who are the main characters? What's the setting? The AI will break this into panels across your pages."
              className="w-full h-32 px-4 py-3 rounded-xl border-2 border-[var(--ink-100)] bg-white text-[var(--ink-800)] placeholder:text-[var(--ink-300)] focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-all"
              required
            />
            <p className="text-xs text-[var(--ink-400)] mt-2">
              Be descriptive! Include actions, emotions, and key moments you want to capture.
            </p>
          </div>

          {/* Keep Layouts Option */}
          {currentPageCount > 0 && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--ink-100)] hover:border-[var(--ink-200)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={keepLayouts}
                onChange={(e) => setKeepLayouts(e.target.checked)}
                className="w-5 h-5 rounded-lg border-2 border-[var(--ink-200)] text-orange-500 focus:ring-orange-200"
              />
              <div>
                <span className="text-sm font-medium text-[var(--ink-700)] block">
                  Keep existing page layouts
                </span>
                <span className="text-xs text-[var(--ink-400)]">
                  Preserve current panel divisions, only generate images
                </span>
              </div>
            </label>
          )}

          {/* Warning if no characters */}
          {!hasCharacters && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-amber-800 block">
                  No characters defined
                </span>
                <span className="text-xs text-amber-600">
                  For best results, add characters in AI Settings first. This helps maintain visual consistency.
                </span>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--ink-100)] bg-[var(--ink-50)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-white rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!storyDescription.trim() || isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate {pageCount} Page{pageCount > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Dialog for generating content for the current page
 */
export function GeneratePageDialog({ 
  isOpen, 
  onClose, 
  onGenerate, 
  panelCount = 0,
  projectSettings = {},
  isGenerating = false 
}) {
  const [pageDescription, setPageDescription] = useState('');
  const [keepLayout, setKeepLayout] = useState(true);

  if (!isOpen) return null;

  const hasCharacters = projectSettings?.characters?.length > 0;
  const hasStyle = projectSettings?.artStyle?.id !== 'custom' || projectSettings?.artStyle?.customPrompt;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pageDescription.trim()) return;
    
    onGenerate({
      pageDescription: pageDescription.trim(),
      keepLayout,
    });
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md" />
      
      {/* Dialog */}
      <div 
        className="relative bg-[var(--paper-white)] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--ink-100)] relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/80 bg-gradient-to-br from-orange-400 to-red-500">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                  Generate This Page
                </h2>
                <p className="text-sm text-[var(--ink-400)]">
                  {panelCount > 0 ? `Fill ${panelCount} panel${panelCount > 1 ? 's' : ''} with AI` : 'Create content for this page'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--ink-100)] rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Project Settings Status */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--ink-50)] border border-[var(--ink-100)]">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-[var(--ink-500)]">
              Using your project's AI settings
            </span>
            <div className="flex-1" />
            {hasCharacters && (
              <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Characters
              </span>
            )}
            {hasStyle && (
              <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Style
              </span>
            )}
          </div>

          {/* Page Description */}
          <div>
            <label className="text-sm font-semibold text-[var(--ink-700)] mb-2 block">
              What happens on this page?
            </label>
            <textarea
              value={pageDescription}
              onChange={(e) => setPageDescription(e.target.value)}
              placeholder="Describe the action on this page... What's the scene? What are the characters doing? What emotions should be conveyed? The AI will distribute this across your panels."
              className="w-full h-32 px-4 py-3 rounded-xl border-2 border-[var(--ink-100)] bg-white text-[var(--ink-800)] placeholder:text-[var(--ink-300)] focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-all"
              required
              autoFocus
            />
            <p className="text-xs text-[var(--ink-400)] mt-2">
              The AI will break this into individual panel descriptions automatically.
            </p>
          </div>

          {/* Keep Layout Option */}
          {panelCount > 0 && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--ink-100)] hover:border-[var(--ink-200)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={keepLayout}
                onChange={(e) => setKeepLayout(e.target.checked)}
                className="w-5 h-5 rounded-lg border-2 border-[var(--ink-200)] text-orange-500 focus:ring-orange-200"
              />
              <div>
                <span className="text-sm font-medium text-[var(--ink-700)] block">
                  Keep current panel layout
                </span>
                <span className="text-xs text-[var(--ink-400)]">
                  Generate {panelCount} image{panelCount > 1 ? 's' : ''} for existing panels
                </span>
              </div>
            </label>
          )}

          {/* Panel Preview Info */}
          {panelCount > 0 && keepLayout && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <Layers className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-800 block">
                  {panelCount} panel{panelCount > 1 ? 's' : ''} detected
                </span>
                <span className="text-xs text-blue-600">
                  AI will generate an image for each panel
                </span>
              </div>
            </div>
          )}

          {/* Warning if no characters */}
          {!hasCharacters && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-amber-800 block">
                  No characters defined
                </span>
                <span className="text-xs text-amber-600">
                  For consistent character appearance, add them in AI Settings first.
                </span>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--ink-100)] bg-[var(--ink-50)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--ink-500)] hover:text-[var(--ink-700)] hover:bg-white rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!pageDescription.trim() || isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Page
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
