'use client';

import { useState } from 'react';
import { Plus, Sparkles, PenTool, Zap } from 'lucide-react';
import ProjectList from './components/ProjectList';
import CreateProjectDialog from './components/CreateProjectDialog';

export default function Home() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] bg-pattern">
      {/* Header */}
      <header className="bg-[var(--paper-white)]/80 backdrop-blur-md border-b border-[var(--ink-100)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105" style={{ background: 'var(--accent-primary-gradient)' }}>
                  <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-[var(--accent-secondary)] rounded-md sm:rounded-lg flex items-center justify-center shadow-md">
                  <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                  FrameForge
                </h1>
                <p className="hidden sm:flex text-sm text-[var(--ink-400)] items-center gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-secondary)]"></span>
                  Visual Narrative Creator
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base px-3 sm:px-5 py-2 sm:py-2.5"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
              <span className="hidden xs:inline">New Project</span>
              <span className="xs:hidden">New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="mb-6 sm:mb-10">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
              Your Projects
            </h2>
            <span className="badge badge-teal text-xs">
              <Sparkles className="w-3 h-3" />
              <span className="hidden xs:inline">AI Powered</span>
              <span className="xs:hidden">AI</span>
            </span>
          </div>
          <p className="text-[var(--ink-500)] text-base sm:text-lg" style={{ fontFamily: 'var(--font-body)' }}>
            Create and manage your visual narratives
          </p>
        </div>

        <ProjectList onCreateNew={() => setShowCreateDialog(true)} />
      </main>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}
