'use client';

import { useState } from 'react';
import { ArrowLeft, Download, PenTool, Check, Loader2, AlertCircle, Settings, Zap, Layers, BookOpen, Film, FileText, Sparkles, ChevronDown, Wand2, FileStack } from 'lucide-react';

const SAVE_STATUS_CONFIG = {
  idle: { icon: null, text: null },
  saving: { icon: Loader2, text: 'Saving...', className: 'text-[var(--ink-400)]', iconClass: 'animate-spin' },
  saved: { icon: Check, text: 'Saved', className: 'text-[var(--accent-secondary)]', iconClass: '' },
  error: { icon: AlertCircle, text: 'Error saving', className: 'text-red-500', iconClass: '' }
};

const PROJECT_TYPE_CONFIG = {
  'comic': { 
    icon: BookOpen, 
    gradient: 'gradient-comic',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50'
  },
  'manga': { 
    icon: BookOpen, 
    gradient: 'gradient-manga',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50'
  },
  'storyboard': { 
    icon: Film, 
    gradient: 'gradient-storyboard',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50'
  },
  'graphic-novel': { 
    icon: FileText, 
    gradient: 'gradient-webtoon',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50'
  }
};

export default function EditorToolbar({ project, saveStatus, onExport, onBack, gutterWidth, onGutterChange, onToggleSidebar, pageCount, onOpenProjectSettings, onGenerateComic, onGeneratePage }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const statusConfig = SAVE_STATUS_CONFIG[saveStatus];
  const StatusIcon = statusConfig?.icon;
  const typeConfig = PROJECT_TYPE_CONFIG[project.type] || PROJECT_TYPE_CONFIG['comic'];
  const TypeIcon = typeConfig.icon;

  return (
    <header className="bg-[var(--paper-white)]/95 backdrop-blur-md border-b border-[var(--ink-100)] px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-5">
        <button
          onClick={onBack}
          className="p-2 sm:p-2.5 hover:bg-[var(--ink-50)] rounded-lg sm:rounded-xl text-[var(--ink-400)] hover:text-[var(--ink-700)] transition-all hover:-translate-x-0.5"
          title="Back to projects"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`hidden xs:flex w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl items-center justify-center shadow-md ${typeConfig.gradient}`}>
            <TypeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base text-[var(--ink-900)] truncate max-w-[120px] sm:max-w-none" style={{ fontFamily: 'var(--font-display)' }}>
              {project.name}
            </h1>
            <div className="hidden sm:flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${typeConfig.color} ${typeConfig.bgColor} px-1.5 py-0.5 rounded-md`} style={{ fontFamily: 'var(--font-display)' }}>
                {project.type.replace('-', ' ')}
              </span>
              <span className="text-[10px] text-[var(--ink-300)]">•</span>
              <span className="text-[10px] text-[var(--ink-400)]">{project.width}×{project.height}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Save Status */}
        {StatusIcon && (
          <div className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[var(--ink-50)] ${statusConfig.className}`}>
            <StatusIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${statusConfig.iconClass}`} />
            <span className="hidden xs:inline font-medium" style={{ fontFamily: 'var(--font-body)' }}>{statusConfig.text}</span>
          </div>
        )}

        {/* AI Project Settings Button */}
        <button
          onClick={onOpenProjectSettings}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all"
          title="AI Project Settings"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline text-xs sm:text-sm font-medium">AI Settings</span>
        </button>

        {/* AI Magic Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAIMenu(!showAIMenu)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all ${
              showAIMenu 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                : 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-md hover:shadow-lg'
            }`}
            title="AI Magic - Generate content"
          >
            <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline text-xs sm:text-sm font-medium">AI Magic</span>
            <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${showAIMenu ? 'rotate-180' : ''}`} />
          </button>

          {showAIMenu && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowAIMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--paper-white)] rounded-xl shadow-2xl border border-[var(--ink-100)] overflow-hidden z-50 animate-scale-in">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowAIMenu(false);
                      onGenerateComic?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 text-left transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <FileStack className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[var(--ink-800)] block">Generate Full Comic</span>
                      <span className="text-xs text-[var(--ink-400)]">Create multiple pages from story</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowAIMenu(false);
                      onGeneratePage?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 text-left transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <Wand2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[var(--ink-800)] block">Generate This Page</span>
                      <span className="text-xs text-[var(--ink-400)]">Fill current page panels with AI</span>
                    </div>
                  </button>
                </div>
                
                <div className="px-3 py-2 bg-[var(--ink-50)] border-t border-[var(--ink-100)]">
                  <p className="text-[10px] text-[var(--ink-400)] text-center">
                    Uses your project's AI settings for consistency
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all ${
              showSettings 
                ? 'bg-[var(--ink-100)] text-[var(--ink-700)]' 
                : 'hover:bg-[var(--ink-50)] text-[var(--ink-400)] hover:text-[var(--ink-700)]'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-[var(--paper-white)] rounded-xl sm:rounded-2xl shadow-2xl border border-[var(--ink-100)] p-4 sm:p-5 z-50 animate-scale-in">
              <h3 className="text-sm font-bold text-[var(--ink-800)] mb-3 sm:mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Grid Settings
              </h3>
              <div>
                <label className="flex items-center justify-between text-xs sm:text-sm text-[var(--ink-500)] mb-2 sm:mb-3">
                  <span>Gutter Width</span>
                  <span className="font-bold text-[var(--ink-700)] bg-[var(--ink-50)] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-xs">{gutterWidth}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={gutterWidth}
                  onChange={(e) => onGutterChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-[var(--ink-100)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                />
                <div className="flex justify-between text-xs text-[var(--ink-300)] mt-2">
                  <span>0px</span>
                  <span>20px</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="btn-teal flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Export</span>
        </button>

        {/* Mobile Pages Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden flex items-center gap-1.5 p-2 bg-[var(--accent-primary-subtle)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white rounded-lg transition-all"
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold">{pageCount}</span>
          </button>
        )}
      </div>
    </header>
  );
}
